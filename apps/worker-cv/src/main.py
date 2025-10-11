"""MotionOps Worker-CV — Video analysis pipeline."""

import asyncio
import logging

from .config import Settings
from .pipeline import Pipeline
from .transport import SocketTransport

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("motionops.worker")


async def main() -> None:
    settings = Settings()
    logger.info("Starting MotionOps Worker-CV")
    logger.info(f"API URL: {settings.api_url}")

    transport = SocketTransport(settings.api_url, api_key=settings.api_key)
    await transport.connect()

    pipeline = Pipeline(settings=settings, transport=transport)

    try:
        await pipeline.run()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        await transport.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
