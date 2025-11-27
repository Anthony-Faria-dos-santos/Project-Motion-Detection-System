"""OpenCV-based camera source — handles RTSP, webcam, file, MJPEG, HLS."""

import asyncio
import logging
from typing import Optional

import cv2
import numpy as np

from .base import CameraSource, SourceMetadata

logger = logging.getLogger("motionops.sources.opencv")


class OpenCVSource(CameraSource):
    """Camera source using OpenCV VideoCapture.

    Supports:
    - Webcam: source_url = "0", "1" (integer index)
    - RTSP: source_url = "rtsp://user:pass@ip:554/stream"
    - File: source_url = "/path/to/video.mp4"
    - MJPEG: source_url = "http://ip:8080/video"
    - HLS: source_url = "http://ip/stream.m3u8" (requires FFmpeg backend)
    """

    def __init__(self, source_url: str):
        self._source_url = source_url
        self._cap: Optional[cv2.VideoCapture] = None
        self._metadata = SourceMetadata(protocol=self._detect_protocol())

    def _detect_protocol(self) -> str:
        url = self._source_url.lower()
        try:
            int(self._source_url)
            return "webcam"
        except ValueError:
            pass
        if url.startswith("rtsp://"):
            return "rtsp"
        if url.startswith("rtmp://"):
            return "rtmp"
        if url.endswith(".m3u8") or "hls" in url:
            return "hls"
        if url.startswith("http://") or url.startswith("https://"):
            return "mjpeg"
        return "file"

    async def connect(self) -> bool:
        """Open the video source."""
        if self._cap is not None:
            self._cap.release()

        loop = asyncio.get_event_loop()
        self._cap = await loop.run_in_executor(None, self._open_capture)

        if self._cap is None or not self._cap.isOpened():
            logger.error("Failed to open source: %s", self._source_url)
            return False

        # Read metadata
        w = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = self._cap.get(cv2.CAP_PROP_FPS) or 0
        self._metadata = SourceMetadata(
            protocol=self._detect_protocol(),
            resolution=f"{w}x{h}" if w > 0 and h > 0 else None,
            fps=fps if fps > 0 else None,
            is_live=self._detect_protocol() != "file",
        )
        logger.info(
            "Source connected: %s (protocol=%s, resolution=%s, fps=%s)",
            self._source_url, self._metadata.protocol, self._metadata.resolution, self._metadata.fps,
        )
        return True

    def _open_capture(self) -> Optional[cv2.VideoCapture]:
        try:
            source_int = int(self._source_url)
            return cv2.VideoCapture(source_int)
        except ValueError:
            cap = cv2.VideoCapture(self._source_url)
            return cap

    async def read_frame(self) -> Optional[np.ndarray]:
        if self._cap is None or not self._cap.isOpened():
            return None
        loop = asyncio.get_event_loop()
        ret, frame = await loop.run_in_executor(None, self._cap.read)
        return frame if ret else None

    async def disconnect(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None
            logger.info("Source disconnected: %s", self._source_url)

    def is_connected(self) -> bool:
        return self._cap is not None and self._cap.isOpened()

    @property
    def metadata(self) -> SourceMetadata:
        return self._metadata
