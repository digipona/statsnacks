"""Google Search Console API client."""

import pandas as pd
from datetime import datetime, timedelta
from typing import List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential

from src.auth.google_auth import get_gsc_service
from src.config.settings import settings, SiteConfig


class GSCClient:
    """Client for interacting with Google Search Console API."""

    def __init__(self, site_config: Optional[SiteConfig] = None):
        """
        Initialize GSC client.

        Args:
            site_config: Optional site configuration. If not provided,
                        falls back to legacy single-site settings.
        """
        self.service = get_gsc_service()

        if site_config:
            self.site_url = site_config.gsc_site_url
        else:
            self.site_url = settings.gsc_site_url

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def query(
        self,
        start_date: str,
        end_date: str,
        dimensions: Optional[List[str]] = None,
        row_limit: int = 25000,
        start_row: int = 0
    ) -> pd.DataFrame:
        """
        Query Search Console API.

        Args:
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            dimensions: List of dimensions (query, page, country, device, date)
            row_limit: Maximum rows per request (max 25000)
            start_row: Starting row for pagination

        Returns:
            pd.DataFrame: Query results
        """
        request = {
            'startDate': start_date,
            'endDate': end_date,
            'dimensions': dimensions or ['query'],
            'rowLimit': row_limit,
            'startRow': start_row
        }

        response = self.service.searchanalytics().query(
            siteUrl=self.site_url,
            body=request
        ).execute()

        if 'rows' not in response:
            return pd.DataFrame()

        rows = []
        dims = dimensions or ['query']

        for row in response['rows']:
            row_data = {
                'clicks': row['clicks'],
                'impressions': row['impressions'],
                'ctr': row['ctr'],
                'position': row['position']
            }
            for i, dim in enumerate(dims):
                row_data[dim] = row['keys'][i]
            rows.append(row_data)

        df = pd.DataFrame(rows)

        # Convert date column if present
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])

        return df

    def get_all_queries(
        self,
        start_date: str,
        end_date: str,
        max_rows: int = 100000
    ) -> pd.DataFrame:
        """
        Get all search queries with pagination.

        Args:
            start_date: Start date
            end_date: End date
            max_rows: Maximum total rows to fetch

        Returns:
            pd.DataFrame: All query data
        """
        all_data = []
        start_row = 0
        page_size = 25000

        while start_row < max_rows:
            df = self.query(
                start_date=start_date,
                end_date=end_date,
                dimensions=['query'],
                row_limit=page_size,
                start_row=start_row
            )

            if df.empty:
                break

            all_data.append(df)

            if len(df) < page_size:
                break

            start_row += page_size

        return pd.concat(all_data, ignore_index=True) if all_data else pd.DataFrame()

    def get_search_overview(self, start_date: str, end_date: str) -> dict:
        """
        Get aggregated search metrics.

        Returns:
            dict: Overview metrics with totals and trend data
        """
        df = self.query(
            start_date=start_date,
            end_date=end_date,
            dimensions=['date']
        )

        if df.empty:
            return {
                'clicks': 0,
                'impressions': 0,
                'ctr': 0,
                'avg_position': 0,
                'trend_data': df
            }

        total_clicks = int(df['clicks'].sum())
        total_impressions = int(df['impressions'].sum())

        return {
            'clicks': total_clicks,
            'impressions': total_impressions,
            'ctr': round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2),
            'avg_position': round(df['position'].mean(), 1),
            'trend_data': df.sort_values('date')
        }

    def get_top_queries(
        self,
        start_date: str,
        end_date: str,
        limit: int = 100
    ) -> pd.DataFrame:
        """Get top queries by clicks."""
        df = self.query(
            start_date=start_date,
            end_date=end_date,
            dimensions=['query'],
            row_limit=limit
        )
        return df.sort_values('clicks', ascending=False).head(limit)

    def get_top_pages(
        self,
        start_date: str,
        end_date: str,
        limit: int = 100
    ) -> pd.DataFrame:
        """Get top pages by clicks."""
        df = self.query(
            start_date=start_date,
            end_date=end_date,
            dimensions=['page'],
            row_limit=limit
        )
        return df.sort_values('clicks', ascending=False).head(limit)

    def get_queries_by_page(
        self,
        start_date: str,
        end_date: str,
        limit: int = 5000
    ) -> pd.DataFrame:
        """
        Get query + page combinations for cannibalization analysis.
        """
        return self.query(
            start_date=start_date,
            end_date=end_date,
            dimensions=['query', 'page'],
            row_limit=limit
        )

    def get_queries_by_country(
        self,
        start_date: str,
        end_date: str,
        limit: int = 1000
    ) -> pd.DataFrame:
        """Get queries by country."""
        return self.query(
            start_date=start_date,
            end_date=end_date,
            dimensions=['query', 'country'],
            row_limit=limit
        )

    def get_queries_by_device(
        self,
        start_date: str,
        end_date: str
    ) -> pd.DataFrame:
        """Get queries by device type."""
        return self.query(
            start_date=start_date,
            end_date=end_date,
            dimensions=['device']
        )

    def get_country_breakdown(
        self,
        start_date: str,
        end_date: str,
        limit: int = 20
    ) -> pd.DataFrame:
        """Get search performance by country."""
        return self.query(
            start_date=start_date,
            end_date=end_date,
            dimensions=['country'],
            row_limit=limit
        )
