"""
Cloudinary integration service for uploading and managing user profile pictures.
"""

import re
import os
import cloudinary
import cloudinary.uploader
from app.config import get_settings
from app.utils.logger import logger


def configure_cloudinary() -> bool:
    """Configure cloudinary library with settings from .env."""
    try:
        get_settings.cache_clear()
    except Exception:
        pass
    settings = get_settings()

    # 1. Prioritize explicit credentials
    if (
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    ):
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name.strip(),
            api_key=settings.cloudinary_api_key.strip(),
            api_secret=settings.cloudinary_api_secret.strip(),
            secure=True,
        )
        return True

    # 2. Fall back to parsing CLOUDINARY_URL
    raw_url = (settings.cloudinary_url or os.environ.get("CLOUDINARY_URL", "")).strip()
    if raw_url:
        clean_url = re.sub(r"^CLOUDINARY_URL=", "", raw_url).strip().strip("\"'")
        match = re.match(r"cloudinary://([^:]+):([^@]+)@(.+)", clean_url)
        if match:
            api_key, api_secret, cloud_name = match.groups()
            cloudinary.config(
                cloud_name=cloud_name.strip(),
                api_key=api_key.strip(),
                api_secret=api_secret.strip(),
                secure=True,
            )
            return True

    return False


def is_cloudinary_configured() -> bool:
    """Check if Cloudinary credentials are provided in settings."""
    return configure_cloudinary()


def upload_avatar_image(
    file_bytes: bytes,
    openid: str,
    folder: str = "sync_ai_avatars",
) -> dict:
    """
    Upload an avatar image to Cloudinary.
    
    Args:
        file_bytes: Raw bytes of the image file.
        openid: User identifier for public_id scoping.
        folder: Cloudinary folder name.

    Returns:
        dict with 'url' (secure URL) and 'public_id'.
    """
    if not configure_cloudinary():
        raise ValueError(
            "Cloudinary credentials are not configured in backend/.env. "
            "Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
        )

    try:
        # Sanitize openid for safe public_id
        safe_openid = "".join(c if c.isalnum() or c in "-_" else "_" for c in openid)
        public_id = f"user_{safe_openid}"

        result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            transformation=[
                {"width": 400, "height": 400, "crop": "fill", "gravity": "face"},
                {"fetch_format": "auto", "quality": "auto"},
            ],
        )

        return {
            "url": result.get("secure_url") or result.get("url"),
            "public_id": result.get("public_id"),
        }
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise
