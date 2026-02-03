"""Traffic Overview page - GA4 metrics."""

import streamlit as st
import pandas as pd

# Add parent directory to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.components.auth import require_auth
from src.api.ga4_client import GA4Client
from src.components.charts import (
    create_traffic_trend_chart,
    create_traffic_sources_pie,
    create_top_pages_bar,
    create_devices_chart
)
from src.components.filters import (
    date_range_selector,
    comparison_toggle,
    get_comparison_range
)
from src.components.metrics import display_kpi_row
from src.components.site_selector import get_selected_site
from src.config.settings import settings

# Page config
st.set_page_config(
    page_title="Traffic Overview - Analytics Dashboard",
    page_icon="📊",
    layout="wide"
)

# Auth check
authenticator = require_auth()
authenticator.logout("Logout", "sidebar")

# Site selector (in sidebar)
site = get_selected_site()

st.title("📊 Traffic Overview")
st.markdown(f"Google Analytics 4 traffic metrics for **{site.display_name}**")

# Sidebar filters
st.sidebar.markdown("---")
st.sidebar.header("Filters")
start_date, end_date = date_range_selector('traffic')
compare = comparison_toggle('traffic_compare')

# Check configuration
if not site.ga4_property_id:
    st.error(f"GA4 Property ID not configured for {site.display_name}.")
    st.stop()

if not settings.validate_credentials():
    st.error("Google credentials not found. Please add your service account JSON to the credentials folder.")
    st.stop()

# Initialize client with selected site
try:
    ga4 = GA4Client(site_config=site)
except Exception as e:
    st.error(f"Failed to initialize GA4 client: {str(e)}")
    st.stop()

# Fetch data
with st.spinner("Loading traffic data..."):
    try:
        # Current period
        overview = ga4.get_traffic_overview(start_date, end_date)
        sources = ga4.get_traffic_sources(start_date, end_date)
        top_pages = ga4.get_top_pages(start_date, end_date)
        devices = ga4.get_devices(start_date, end_date)
        browsers = ga4.get_browsers(start_date, end_date)
        countries = ga4.get_countries(start_date, end_date)

        # Previous period for comparison
        if compare:
            prev_start, prev_end = get_comparison_range(start_date, end_date)
            prev_overview = ga4.get_traffic_overview(prev_start, prev_end)
        else:
            prev_overview = None

    except Exception as e:
        st.error(f"Failed to fetch data: {str(e)}")
        st.stop()

# KPI Row
st.subheader("Key Metrics")
metrics = {
    'Users': overview['users'],
    'Sessions': overview['sessions'],
    'Pageviews': overview['pageviews'],
    'Bounce Rate': overview['bounce_rate'],
    'Avg Duration': overview['avg_duration']
}

prev_metrics = None
if prev_overview:
    prev_metrics = {
        'Users': prev_overview['users'],
        'Sessions': prev_overview['sessions'],
        'Pageviews': prev_overview['pageviews'],
        'Bounce Rate': prev_overview['bounce_rate'],
        'Avg Duration': prev_overview['avg_duration']
    }

display_kpi_row(metrics, prev_metrics)

st.markdown("---")

# Traffic Trend Chart
st.subheader("Traffic Trend")
if not overview['trend_data'].empty:
    trend_chart = create_traffic_trend_chart(overview['trend_data'])
    st.plotly_chart(trend_chart, use_container_width=True)
else:
    st.info("No trend data available for the selected period.")

st.markdown("---")

# Two columns: Sources and Top Pages
col1, col2 = st.columns(2)

with col1:
    st.subheader("Traffic Sources")
    if not sources.empty:
        sources_chart = create_traffic_sources_pie(sources)
        st.plotly_chart(sources_chart, use_container_width=True)

        # Show data table
        with st.expander("View data"):
            st.dataframe(
                sources.rename(columns={
                    'sessionDefaultChannelGrouping': 'Channel',
                    'sessions': 'Sessions',
                    'activeUsers': 'Users',
                    'bounceRate': 'Bounce Rate'
                }),
                hide_index=True
            )
    else:
        st.info("No traffic source data available.")

with col2:
    st.subheader("Top Pages")
    if not top_pages.empty:
        pages_chart = create_top_pages_bar(top_pages)
        st.plotly_chart(pages_chart, use_container_width=True)

        # Show data table
        with st.expander("View data"):
            display_df = top_pages.copy()
            display_df.columns = ['Page', 'Pageviews', 'Users', 'Avg Duration']
            st.dataframe(display_df, hide_index=True)
    else:
        st.info("No page data available.")

st.markdown("---")

# Device and Browser breakdown
col3, col4 = st.columns(2)

with col3:
    st.subheader("Devices")
    if not devices.empty:
        devices_chart = create_devices_chart(devices)
        st.plotly_chart(devices_chart, use_container_width=True)
    else:
        st.info("No device data available.")

with col4:
    st.subheader("Top Countries")
    if not countries.empty:
        st.dataframe(
            countries.rename(columns={
                'country': 'Country',
                'sessions': 'Sessions',
                'activeUsers': 'Users'
            }),
            hide_index=True,
            use_container_width=True
        )
    else:
        st.info("No country data available.")

# Footer
st.markdown("---")
st.caption(f"Data from {start_date} to {end_date} | Site: {site.display_name} | GA4: {site.ga4_property_id}")
