"""Google API authentication module."""

import os
from functools import lru_cache
from google.oauth2 import service_account
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from googleapiclient.discovery import build

from src.config.settings import settings

# API Scopes
SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/webmasters.readonly'
]


@lru_cache(maxsize=1)
def get_credentials():
    """
    Load service account credentials from JSON file.

    Returns:
        google.oauth2.service_account.Credentials: Authenticated credentials

    Raises:
        FileNotFoundError: If credentials file doesn't exist
    """
    credentials_path = settings.get_credentials_path()

    if not credentials_path.exists():
        raise FileNotFoundError(
            f"Service account credentials not found at: {credentials_path}\n"
            "Please download your service account JSON from Google Cloud Console "
            "and save it to the credentials directory."
        )

    credentials = service_account.Credentials.from_service_account_file(
        str(credentials_path),
        scopes=SCOPES
    )
    return credentials


def get_ga4_client() -> BetaAnalyticsDataClient:
    """
    Initialize GA4 Data API client.

    Returns:
        BetaAnalyticsDataClient: Authenticated GA4 client
    """
    credentials = get_credentials()
    return BetaAnalyticsDataClient(credentials=credentials)


def get_gsc_service():
    """
    Initialize Search Console API service.

    Returns:
        googleapiclient.discovery.Resource: Authenticated GSC service
    """
    credentials = get_credentials()
    return build('searchconsole', 'v1', credentials=credentials)


def test_connection() -> dict:
    """
    Test API connections and return status.

    Returns:
        dict: Connection status for each service
    """
    status = {
        'credentials': False,
        'ga4': False,
        'gsc': False,
        'errors': []
    }

    # Test credentials
    try:
        creds = get_credentials()
        status['credentials'] = True
    except Exception as e:
        status['errors'].append(f"Credentials: {str(e)}")
        return status

    # Test GA4
    try:
        client = get_ga4_client()
        # Just creating the client is enough to verify auth
        status['ga4'] = True
    except Exception as e:
        status['errors'].append(f"GA4: {str(e)}")

    # Test GSC
    try:
        service = get_gsc_service()
        # List sites to verify access
        sites = service.sites().list().execute()
        status['gsc'] = True
    except Exception as e:
        status['errors'].append(f"GSC: {str(e)}")

    return status
