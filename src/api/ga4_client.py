"""Google Analytics 4 Data API client."""

import pandas as pd
from datetime import datetime, timedelta
from typing import List, Optional
from google.analytics.data_v1beta.types import (
    RunReportRequest,
    DateRange,
    Dimension,
    Metric,
    OrderBy
)
from tenacity import retry, stop_after_attempt, wait_exponential

from src.auth.google_auth import get_ga4_client
from src.config.settings import settings, SiteConfig


class GA4Client:
    """Client for interacting with GA4 Data API."""

    def __init__(self, site_config: Optional[SiteConfig] = None):
        """
        Initialize GA4 client.

        Args:
            site_config: Optional site configuration. If not provided,
                        falls back to legacy single-site settings.
        """
        self.client = get_ga4_client()

        if site_config:
            self.property_id = site_config.ga4_property_id
        else:
            self.property_id = settings.ga4_property_id

    @property
    def property_path(self) -> str:
        """Get the GA4 property path."""
        return f"properties/{self.property_id}"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def run_report(
        self,
        dimensions: List[str],
        metrics: List[str],
        start_date: str,
        end_date: str,
        order_by: Optional[str] = None,
        limit: int = 10000
    ) -> pd.DataFrame:
        """
        Execute a GA4 report and return as DataFrame.

        Args:
            dimensions: List of dimension names (e.g., ['date', 'pagePath'])
            metrics: List of metric names (e.g., ['activeUsers', 'sessions'])
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            order_by: Optional metric name to order by (descending)
            limit: Maximum rows to return

        Returns:
            pd.DataFrame: Report data
        """
        request = RunReportRequest(
            property=self.property_path,
            dimensions=[Dimension(name=d) for d in dimensions],
            metrics=[Metric(name=m) for m in metrics],
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            limit=limit
        )

        if order_by:
            request.order_bys = [
                OrderBy(
                    metric=OrderBy.MetricOrderBy(metric_name=order_by),
                    desc=True
                )
            ]

        response = self.client.run_report(request)

        # Convert to DataFrame
        rows = []
        for row in response.rows:
            row_data = {}
            for i, dim in enumerate(dimensions):
                row_data[dim] = row.dimension_values[i].value
            for i, met in enumerate(metrics):
                value = row.metric_values[i].value
                # Try to convert to numeric
                try:
                    row_data[met] = float(value)
                except ValueError:
                    row_data[met] = value
            rows.append(row_data)

        df = pd.DataFrame(rows)

        # Convert date column if present
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'], format='%Y%m%d')

        return df

    def get_traffic_overview(self, start_date: str, end_date: str) -> dict:
        """
        Get key traffic metrics for the date range.

        Returns:
            dict: Traffic overview with totals and trend data
        """
        df = self.run_report(
            dimensions=['date'],
            metrics=[
                'activeUsers',
                'sessions',
                'screenPageViews',
                'bounceRate',
                'averageSessionDuration'
            ],
            start_date=start_date,
            end_date=end_date
        )

        if df.empty:
            return {
                'users': 0,
                'sessions': 0,
                'pageviews': 0,
                'bounce_rate': 0,
                'avg_duration': 0,
                'trend_data': df
            }

        return {
            'users': int(df['activeUsers'].sum()),
            'sessions': int(df['sessions'].sum()),
            'pageviews': int(df['screenPageViews'].sum()),
            'bounce_rate': round(df['bounceRate'].mean() * 100, 2),
            'avg_duration': round(df['averageSessionDuration'].mean(), 1),
            'trend_data': df.sort_values('date')
        }

    def get_traffic_sources(self, start_date: str, end_date: str) -> pd.DataFrame:
        """Get traffic breakdown by channel."""
        return self.run_report(
            dimensions=['sessionDefaultChannelGrouping'],
            metrics=['sessions', 'activeUsers', 'bounceRate'],
            start_date=start_date,
            end_date=end_date,
            order_by='sessions'
        )

    def get_top_pages(
        self,
        start_date: str,
        end_date: str,
        limit: int = 20
    ) -> pd.DataFrame:
        """Get top pages by pageviews."""
        return self.run_report(
            dimensions=['pagePath'],
            metrics=['screenPageViews', 'activeUsers', 'averageSessionDuration'],
            start_date=start_date,
            end_date=end_date,
            order_by='screenPageViews',
            limit=limit
        )

    def get_devices(self, start_date: str, end_date: str) -> pd.DataFrame:
        """Get traffic by device category."""
        return self.run_report(
            dimensions=['deviceCategory'],
            metrics=['sessions', 'activeUsers'],
            start_date=start_date,
            end_date=end_date,
            order_by='sessions'
        )

    def get_browsers(self, start_date: str, end_date: str) -> pd.DataFrame:
        """Get traffic by browser."""
        return self.run_report(
            dimensions=['browser'],
            metrics=['sessions', 'activeUsers'],
            start_date=start_date,
            end_date=end_date,
            order_by='sessions',
            limit=10
        )

    def get_countries(
        self,
        start_date: str,
        end_date: str,
        limit: int = 10
    ) -> pd.DataFrame:
        """Get traffic by country."""
        return self.run_report(
            dimensions=['country'],
            metrics=['sessions', 'activeUsers'],
            start_date=start_date,
            end_date=end_date,
            order_by='sessions',
            limit=limit
        )

    def get_events(self, start_date: str, end_date: str) -> pd.DataFrame:
        """Get event counts by event name."""
        return self.run_report(
            dimensions=['eventName'],
            metrics=['eventCount', 'eventValue'],
            start_date=start_date,
            end_date=end_date,
            order_by='eventCount'
        )

    def get_events_trend(self, start_date: str, end_date: str) -> pd.DataFrame:
        """Get event counts over time."""
        return self.run_report(
            dimensions=['date'],
            metrics=['eventCount', 'conversions'],
            start_date=start_date,
            end_date=end_date
        )

    def get_conversions(self, start_date: str, end_date: str) -> pd.DataFrame:
        """Get conversion events."""
        return self.run_report(
            dimensions=['eventName'],
            metrics=['conversions', 'eventValue'],
            start_date=start_date,
            end_date=end_date,
            order_by='conversions'
        )
