"""Runtime and static configuration for worker-cv."""

import re

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Worker-CV configuration loaded from environment."""

    api_url: str = "http://localhost:3001"
    api_key: str = ""  # WORKER_API_KEY for backend auth
    worker_id: str = "worker-cv-01"

    # Camera source
    camera_source: str = "0"  # webcam index, RTSP URL, or file path
    camera_protocol: str = "auto"  # auto, rtsp, mjpeg, hls, rtmp, webcam, file, webrtc
    camera_fps: int = 25

    # Detection
    model_path: str = "yolov8n.pt"
    detector_confidence: float = 0.5
    detector_iou: float = 0.45
    detector_classes: list[str] = ["person", "car", "truck", "bicycle"]
    inference_size: int = 640

    # Motion
    motion_sensitivity: float = 0.5
    motion_min_area: int = 500

    # Tracking
    tracking_buffer: int = 30
    tracking_match_threshold: float = 0.8

    # Health
    health_interval_seconds: int = 10

    @field_validator('model_path')
    @classmethod
    def validate_model_path(cls, v: str) -> str:
        """Only allow known YOLO model file patterns."""
        allowed_pattern = r'^yolov\d+[nslmx]?(-seg|-cls|-pose)?\.pt$'
        if not re.match(allowed_pattern, v):
            raise ValueError(
                f"Invalid model_path '{v}'. Must match pattern: yolov8n.pt, yolov11s.pt, etc."
            )
        return v

    @field_validator('camera_source')
    @classmethod
    def validate_camera_source(cls, v: str) -> str:
        """Validate camera source is a known safe format."""
        # Allow integer (webcam index)
        try:
            int(v)
            return v
        except ValueError:
            pass
        # Allow known protocols
        allowed_prefixes = ('rtsp://', 'http://', 'https://', 'rtmp://')
        if v.startswith(allowed_prefixes):
            return v
        # Allow local file paths (but not traversal)
        if '..' in v:
            raise ValueError("Directory traversal not allowed in camera_source")
        return v

    class Config:
        env_prefix = "WORKER_"
        env_file = ".env"
