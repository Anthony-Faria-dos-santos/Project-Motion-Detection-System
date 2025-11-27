"""Factory for creating camera source instances based on URL/protocol."""

import logging
from typing import Optional

from .base import CameraSource
from .opencv_source import OpenCVSource

logger = logging.getLogger("motionops.sources.factory")

# Protocol → Source class mapping (extensible)
_SOURCE_REGISTRY: dict[str, type[CameraSource]] = {}


def register_source(protocol: str, source_class: type[CameraSource]) -> None:
    """Register a new source type for a protocol."""
    _SOURCE_REGISTRY[protocol] = source_class
    logger.info("Registered source adapter: %s → %s", protocol, source_class.__name__)


class CameraSourceFactory:
    """Create the appropriate CameraSource based on the source URL.

    Priority:
    1. Explicitly registered protocol adapters (via register_source)
    2. OpenCVSource as universal fallback (handles RTSP, webcam, file, MJPEG, HLS)

    Usage:
        source = CameraSourceFactory.create("rtsp://camera:554/stream")
        source = CameraSourceFactory.create("0")  # webcam
        source = CameraSourceFactory.create("http://phone:8080/video")  # MJPEG
        source = CameraSourceFactory.create("https://server/live.m3u8")  # HLS
    """

    @staticmethod
    def create(source_url: str, protocol: Optional[str] = None) -> CameraSource:
        """Create a CameraSource for the given URL.

        Args:
            source_url: The camera URL or identifier.
            protocol: Optional explicit protocol override. If not given, auto-detected.
        """
        # Detect protocol from URL
        if protocol is None:
            protocol = CameraSourceFactory._detect_protocol(source_url)

        # Check registered adapters first
        if protocol in _SOURCE_REGISTRY:
            logger.info("Using registered adapter for protocol '%s': %s", protocol, _SOURCE_REGISTRY[protocol].__name__)
            return _SOURCE_REGISTRY[protocol](source_url)

        # Fallback to OpenCV (handles most protocols)
        logger.info("Using OpenCV adapter for source: %s (protocol=%s)", source_url, protocol)
        return OpenCVSource(source_url)

    @staticmethod
    def _detect_protocol(source_url: str) -> str:
        url = source_url.lower().strip()
        try:
            int(source_url)
            return "webcam"
        except ValueError:
            pass
        if url.startswith("rtsp://"):
            return "rtsp"
        if url.startswith("rtmp://"):
            return "rtmp"
        if url.endswith(".m3u8") or "/hls/" in url:
            return "hls"
        if url.startswith("http://") or url.startswith("https://"):
            return "mjpeg"
        if url.startswith("webrtc://") or url.startswith("whep://"):
            return "webrtc"
        return "file"

    @staticmethod
    def supported_protocols() -> list[str]:
        """Return list of all supported protocols."""
        builtin = ["rtsp", "webcam", "file", "mjpeg", "hls"]
        registered = list(_SOURCE_REGISTRY.keys())
        return sorted(set(builtin + registered))
