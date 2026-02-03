"""Application settings and configuration management."""

import os
import base64
import tempfile
from pathlib import Path
from functools import lru_cache
from typing import Dict, List, Optional
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


@dataclass
class SiteConfig:
    """Configuration for a single site."""
    name: str
    display_name: str
    ga4_property_id: str
    gsc_site_url: str


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self):
        self._load_settings()

    def _load_settings(self):
        """Load all settings from environment."""
        # Google Cloud credentials
        self.google_application_credentials = os.getenv(
            'GOOGLE_APPLICATION_CREDENTIALS',
            './credentials/service-account.json'
        )

        # Cache settings
        self.cache_ttl_minutes = int(os.getenv('CACHE_TTL_MINUTES', '15'))

        # Load sites
        self.sites: Dict[str, SiteConfig] = {}
        self._load_sites()

        # Legacy single-site support (fallback)
        self.ga4_property_id = os.getenv('GA4_PROPERTY_ID', '')
        self.gsc_site_url = os.getenv('GSC_SITE_URL', '')

    def _load_sites(self):
        """Load multi-site configuration."""
        sites_str = os.getenv('SITES', '')
        if not sites_str:
            return

        site_names = [s.strip() for s in sites_str.split(',') if s.strip()]

        for name in site_names:
            ga4_id = os.getenv(f'SITE_{name}_GA4', '').strip().lstrip('=')
            gsc_url = os.getenv(f'SITE_{name}_GSC', '').strip()

            if ga4_id or gsc_url:
                # Create display name
                display_name = f"{name}.com"

                self.sites[name] = SiteConfig(
                    name=name,
                    display_name=display_name,
                    ga4_property_id=ga4_id,
                    gsc_site_url=gsc_url
                )

    def get_site(self, name: str) -> Optional[SiteConfig]:
        """Get configuration for a specific site."""
        return self.sites.get(name)

    def get_site_names(self) -> List[str]:
        """Get list of configured site names."""
        return list(self.sites.keys())

    def get_site_display_names(self) -> Dict[str, str]:
        """Get mapping of site names to display names."""
        return {name: site.display_name for name, site in self.sites.items()}

    def is_multi_site(self) -> bool:
        """Check if multi-site mode is enabled."""
        return len(self.sites) > 1

    def validate_credentials(self) -> bool:
        """Check if credentials are available (file or base64 env var)."""
        # Check for base64-encoded credentials (Railway/cloud)
        if os.getenv('GOOGLE_CREDENTIALS_JSON'):
            return True

        # Check for credentials file (local dev)
        creds_path = Path(self.google_application_credentials)
        if not creds_path.is_absolute():
            base_dir = Path(__file__).parent.parent.parent
            creds_path = base_dir / creds_path
        return creds_path.exists()

    def get_credentials_path(self) -> Path:
        """Get path to credentials file (creates temp file for base64 env var)."""
        # Check for base64-encoded credentials (Railway/cloud)
        creds_json = os.getenv('GOOGLE_CREDENTIALS_JSON')
        if creds_json:
            # Decode and write to temp file
            decoded = base64.b64decode(creds_json)
            temp_path = Path(tempfile.gettempdir()) / 'service-account.json'
            temp_path.write_bytes(decoded)
            return temp_path

        # Local development - use file path
        creds_path = Path(self.google_application_credentials)
        if not creds_path.is_absolute():
            base_dir = Path(__file__).parent.parent.parent
            creds_path = base_dir / creds_path
        return creds_path

    def validate(self) -> bool:
        """Validate all required settings are configured."""
        if not self.validate_credentials():
            return False

        # Check if we have at least one site configured
        if self.sites:
            return any(
                site.ga4_property_id or site.gsc_site_url
                for site in self.sites.values()
            )

        # Fallback to legacy single-site
        return bool(self.ga4_property_id or self.gsc_site_url)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()
