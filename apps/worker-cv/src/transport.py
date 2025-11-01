"""Socket.IO transport for communication with backend."""

import logging
from datetime import datetime, timezone

import socketio

logger = logging.getLogger("motionops.transport")


class SocketTransport:
    """Manages Socket.IO connection to the MotionOps backend."""

    def __init__(self, api_url: str, api_key: str = ""):
        self.api_url = api_url
        self.api_key = api_key
        self.sio = socketio.AsyncClient(
            reconnection=True,
            reconnection_delay=1,
            reconnection_delay_max=30,
        )
        self._config_handler = None
        self._preset_handler = None
        self._setup_handlers()

    def _setup_handlers(self) -> None:
        @self.sio.event
        async def connect():
            logger.info("Connected to backend at %s", self.api_url)

        @self.sio.event
        async def disconnect():
            logger.warning("Disconnected from backend")

        @self.sio.on("config:update")
        async def on_config_update(data):
            logger.info("Config update: %s.%s = %s", data.get("section"), data.get("field"), data.get("value"))
            if self._config_handler:
                await self._config_handler(data)
            # Acknowledge
            await self.sio.emit("worker:config_applied", {
                "success": True,
                "section": data.get("section"),
                "field": data.get("field"),
                "value": data.get("value"),
                "previousValue": None,
                "appliedAt": datetime.now(timezone.utc).isoformat(),
                "error": None,
            })

        @self.sio.on("config:apply_preset")
        async def on_apply_preset(data):
            logger.info("Apply preset: %s", data.get("presetId"))
            if self._preset_handler:
                await self._preset_handler(data)

        @self.sio.on("worker:stop")
        async def on_stop(data):
            logger.info("Stop camera: %s", data.get("cameraId"))

        @self.sio.on("worker:start")
        async def on_start(data):
            logger.info("Start camera: %s", data.get("cameraId"))

        @self.sio.on("worker:reload_model")
        async def on_reload(data):
            logger.info("Reload model: %s", data.get("modelPath"))

    def on_config_update(self, handler):
        self._config_handler = handler

    def on_preset_apply(self, handler):
        self._preset_handler = handler

    async def connect(self) -> None:
        if not self.api_url.startswith('https://') and not self.api_url.startswith('http://localhost'):
            logger.warning("SECURITY: Connecting to backend without TLS! URL: %s", self.api_url)
        try:
            await self.sio.connect(self.api_url, namespaces=["/"], auth={"workerKey": self.api_key})
            logger.info("Socket.IO connected to %s", self.api_url)
        except Exception as e:
            logger.error("Connection failed: %s", e)

    async def disconnect(self) -> None:
        if self.sio.connected:
            await self.sio.disconnect()

    async def emit_health(self, worker_id: str, status: str, model_loaded: str,
                          cpu: float = 0, gpu: float = 0, ram: int = 0,
                          inference_latency_ms: float = 0, active_cameras: int = 0,
                          dropped_frames: int = 0, queue_size: int = 0) -> None:
        await self.sio.emit("worker:health", {
            "workerId": worker_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": status,
            "cpu": round(cpu, 1),
            "gpu": round(gpu, 1),
            "ram": ram,
            "activeCameras": active_cameras,
            "inferenceLatencyMs": round(inference_latency_ms, 1),
            "droppedFrames": dropped_frames,
            "queueSize": queue_size,
            "modelLoaded": model_loaded,
            "uptime": 0,
        })

    async def emit_camera_status(self, camera_id: str, status: str, fps: float,
                                  resolution: str | None, latency_ms: float,
                                  error_message: str | None = None) -> None:
        await self.sio.emit("worker:camera_status", {
            "cameraId": camera_id,
            "status": status,
            "fps": round(fps, 1),
            "resolution": resolution,
            "latencyMs": round(latency_ms),
            "lastFrameAt": datetime.now(timezone.utc).isoformat(),
            "errorMessage": error_message,
        })

    async def emit_detection(self, camera_id: str, frame_number: int, detections: list) -> None:
        await self.sio.emit("worker:detection", {
            "cameraId": camera_id,
            "frameNumber": frame_number,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "detections": detections,
        })

    async def emit_track_update(self, camera_id: str, tracks: list) -> None:
        await self.sio.emit("worker:track_update", {
            "cameraId": camera_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tracks": tracks,
        })

    async def emit_event_candidate(self, event: dict) -> None:
        await self.sio.emit("worker:event_candidate", event)
