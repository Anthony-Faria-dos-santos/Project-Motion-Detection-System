"""Abstract base class for all camera sources."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class SourceMetadata:
    """Metadata about the connected camera source."""
    protocol: str  # "rtsp", "mjpeg", "hls", "rtmp", "webcam", "file", "webrtc"
    resolution: Optional[str] = None  # "1920x1080"
    fps: Optional[float] = None
    codec: Optional[str] = None
    is_live: bool = True  # False for file sources


class CameraSource(ABC):
    """Abstract camera source that all protocol adapters must implement."""

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the source. Returns True on success."""
        ...

    @abstractmethod
    async def read_frame(self) -> Optional[np.ndarray]:
        """Read the next frame. Returns None if no frame available."""
        ...

    @abstractmethod
    async def disconnect(self) -> None:
        """Close the connection and release resources."""
        ...

    @abstractmethod
    def is_connected(self) -> bool:
        """Check if the source is currently connected."""
        ...

    @property
    @abstractmethod
    def metadata(self) -> SourceMetadata:
        """Return current source metadata."""
        ...
