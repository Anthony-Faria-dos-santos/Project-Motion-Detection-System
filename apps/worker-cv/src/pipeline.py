"""Main video processing pipeline: capture -> detect -> track -> emit events."""

import asyncio
import logging
import time
from datetime import datetime, timezone
from uuid import uuid4

import cv2
import numpy as np

from .sources.factory import CameraSourceFactory
from .sources.base import CameraSource

logger = logging.getLogger("motionops.pipeline")


class Pipeline:
    """Orchestrates the video analysis pipeline."""

    def __init__(self, settings, transport):
        self.settings = settings
        self.transport = transport
        self._running = False
        self._source: CameraSource | None = None
        self._model = None
        self._bg_subtractor = None
        self._frame_count = 0
        self._last_health = 0

    async def run(self) -> None:
        self._running = True
        logger.info("Initializing pipeline...")

        # Initialize components
        self._init_model()
        self._init_motion_detector()

        # Create and connect camera source via factory
        protocol = self.settings.camera_protocol if self.settings.camera_protocol != "auto" else None
        self._source = CameraSourceFactory.create(self.settings.camera_source, protocol=protocol)
        connected = await self._source.connect()

        if not connected:
            logger.error("Failed to open video source: %s", self.settings.camera_source)
            await self.transport.emit_camera_status(
                camera_id=self.settings.camera_source,
                status="offline",
                fps=0,
                resolution=None,
                latency_ms=0,
                error_message="Failed to open source",
            )
            return

        meta = self._source.metadata
        resolution = meta.resolution
        logger.info(
            "Pipeline started — source: %s, protocol: %s, resolution: %s, fps: %s",
            self.settings.camera_source, meta.protocol, resolution, meta.fps,
        )

        await self.transport.emit_camera_status(
            camera_id=self.settings.camera_source,
            status="online",
            fps=meta.fps or self.settings.camera_fps,
            resolution=resolution,
            latency_ms=0,
        )

        while self._running:
            frame_start = time.monotonic()

            frame = await self._source.read_frame()
            if frame is None:
                logger.warning("Failed to read frame — source may be exhausted or disconnected")
                await self.transport.emit_camera_status(
                    camera_id=self.settings.camera_source,
                    status="offline",
                    fps=0,
                    resolution=resolution,
                    latency_ms=0,
                    error_message="Frame read failed",
                )
                await asyncio.sleep(2)
                await self._source.connect()  # Try to reconnect
                continue

            self._frame_count += 1

            # Motion detection (MOG2)
            motion_mask = self._detect_motion(frame)
            has_motion = self._has_significant_motion(motion_mask)

            # Object detection + tracking (only if motion detected)
            detections = []
            if has_motion and self._model is not None:
                detections = self._detect_and_track(frame)

            # Emit detections
            if detections:
                await self.transport.emit_detection(
                    camera_id=self.settings.camera_source,
                    frame_number=self._frame_count,
                    detections=detections,
                )

                # Generate event candidates for notable detections
                for det in detections:
                    if det["confidence"] >= self.settings.detector_confidence:
                        await self.transport.emit_event_candidate({
                            "id": str(uuid4()),
                            "cameraId": self.settings.camera_source,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "type": "object_detected",
                            "severity": "low",
                            "summary": f"{det['className']} detected (conf: {det['confidence']:.2f})",
                            "metadata": {
                                "className": det["className"],
                                "confidence": det["confidence"],
                                "trackId": det.get("trackId"),
                            },
                            "snapshotPath": None,
                        })

            # Health heartbeat
            now = time.monotonic()
            if now - self._last_health >= self.settings.health_interval_seconds:
                self._last_health = now
                frame_time = (now - frame_start) * 1000
                await self.transport.emit_health(
                    worker_id=self.settings.worker_id,
                    status="healthy",
                    model_loaded=self.settings.model_path,
                    cpu=0,  # TODO: psutil integration
                    gpu=0,
                    ram=0,
                    inference_latency_ms=frame_time,
                    active_cameras=1,
                    dropped_frames=0,
                    queue_size=0,
                )

            # Frame rate control
            elapsed = time.monotonic() - frame_start
            target_delay = 1.0 / self.settings.camera_fps
            if elapsed < target_delay:
                await asyncio.sleep(target_delay - elapsed)

    def _init_model(self) -> None:
        """Load YOLO model."""
        try:
            from ultralytics import YOLO
            self._model = YOLO(self.settings.model_path)
            logger.info("YOLO model loaded: %s", self.settings.model_path)
        except Exception as e:
            logger.error("Failed to load YOLO model: %s", e)
            self._model = None

    def _init_motion_detector(self) -> None:
        """Initialize MOG2 background subtractor."""
        self._bg_subtractor = cv2.createBackgroundSubtractorMOG2(
            history=500,
            varThreshold=int(50 * (1 - self.settings.motion_sensitivity)),
            detectShadows=True,
        )
        logger.info("MOG2 background subtractor initialized (sensitivity: %.2f)", self.settings.motion_sensitivity)

    def _detect_motion(self, frame: np.ndarray) -> np.ndarray:
        """Apply MOG2 background subtraction."""
        fg_mask = self._bg_subtractor.apply(frame)
        # Remove shadows (shadows are marked as 127 in MOG2)
        _, fg_mask = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)
        # Morphological cleanup
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        return fg_mask

    def _has_significant_motion(self, mask: np.ndarray) -> bool:
        """Check if motion mask contains significant movement."""
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            if cv2.contourArea(contour) >= self.settings.motion_min_area:
                return True
        return False

    def _detect_and_track(self, frame: np.ndarray) -> list[dict]:
        """Run YOLO detection + ByteTrack tracking."""
        results = self._model.track(
            frame,
            persist=True,
            conf=self.settings.detector_confidence,
            iou=self.settings.detector_iou,
            imgsz=self.settings.inference_size,
            classes=self._get_class_indices(),
            verbose=False,
        )

        detections = []
        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                box = boxes[i]
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                class_name = self._model.names[cls_id]
                track_id = int(box.id[0]) if box.id is not None else None

                detections.append({
                    "id": str(uuid4()),
                    "className": class_name,
                    "confidence": round(conf, 3),
                    "bbox": {
                        "x": int(x1),
                        "y": int(y1),
                        "w": int(x2 - x1),
                        "h": int(y2 - y1),
                    },
                    "trackId": f"track_{track_id}" if track_id is not None else None,
                })

        return detections

    def _get_class_indices(self) -> list[int] | None:
        """Convert class names to COCO class indices."""
        if not self._model or not self.settings.detector_classes:
            return None
        name_to_id = {v: k for k, v in self._model.names.items()}
        indices = []
        for cls_name in self.settings.detector_classes:
            if cls_name in name_to_id:
                indices.append(name_to_id[cls_name])
        return indices if indices else None

    async def stop(self) -> None:
        self._running = False
        if self._source:
            await self._source.disconnect()
