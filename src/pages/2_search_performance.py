"""Search Performance page - Google Search Console metrics."""

import streamlit as st
import pandas as pd
from io import BytesIO

# Add parent directory to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.components.auth import require_auth
from src.api.gsc_client import GSCClient
from src.components.charts import create_search_trend_chart
from src.components.filters import (
    date_range_selector,
    comparison_toggle,
    get_comparison_range,
    search_filter
)
from src.components.metrics import display_kpi_row, format_number, format_percentage
from src.components.site_selector import get_selected_site
from src.config.settings import settings

# Page config
st.set_page_config(
    page_title="Search Performance - Analytics Dashboard",
    page_icon="🔍",
    layout="wide"
)

# Auth check
authenticator = require_auth()
authenticator.logout("Logout", "sidebar")

# Site selector (in sidebar)
site = get_selected_site()

st.title("🔍 Search Performance")
st.markdown(f"Google Search Console metrics for **{site.display_name}**")

# Sidebar filters
st.sidebar.markdown("---")
st.sidebar.header("Filters")
start_date, end_date = date_range_selector('search')
compare = comparison_toggle('search_compare')

# Check configuration
if not site.gsc_site_url:
    st.error(f"GSC Site URL not configured for {site.display_name}.")
    st.stop()

if not settings.validate_credentials():
    st.error("Google credentials not found. Please add your service account JSON to the credentials folder.")
    st.stop()

# Initialize client with selected site
try:
    gsc = GSCClient(site_config=site)
except Exception as e:
    st.error(f"Failed to initialize GSC client: {str(e)}")
    st.stop()

# Fetch data
with st.spinner("Loading search data..."):
    try:
        # Current period
        overview = gsc.get_search_overview(start_date, end_date)
        top_queries = gsc.get_top_queries(start_date, end_date, limit=500)
        top_pages = gsc.get_top_pages(start_date, end_date, limit=100)
        devices = gsc.get_queries_by_device(start_date, end_date)
        countries = gsc.get_country_breakdown(start_date, end_date)

        # Previous period for comparison
        if compare:
            prev_start, prev_end = get_comparison_range(start_date, end_date)
            prev_overview = gsc.get_search_overview(prev_start, prev_end)
        else:
            prev_overview = None

    except Exception as e:
        st.error(f"Failed to fetch data: {str(e)}")
        st.stop()

# KPI Row
st.subheader("Key Metrics")
metrics = {
    'Clicks': overview['clicks'],
    'Impressions': overview['impressions'],
    'CTR': overview['ctr'],
    'Avg Position': overview['avg_position']
}

prev_metrics = None
if prev_overview:
    prev_metrics = {
        'Clicks': prev_overview['clicks'],
        'Impressions': prev_overview['impressions'],
        'CTR': prev_overview['ctr'],
        'Avg Position': prev_overview['avg_position']
    }

display_kpi_row(metrics, prev_metrics)

st.markdown("---")

# Search Performance Trend
st.subheader("Performance Trend")
if not overview['trend_data'].empty:
    trend_chart = create_search_trend_chart(overview['trend_data'])
    st.plotly_chart(trend_chart, use_container_width=True)
else:
    st.info("No trend data available for the selected period.")

st.markdown("---")

# Top Queries Table
st.subheader("Top Search Queries")

if not top_queries.empty:
    # Search filter
    query_filter = search_filter(
        label="Filter queries",
        placeholder="Search for keywords...",
        key="query_search"
    )

    # Filter data
    filtered_queries = top_queries.copy()
    if query_filter:
        filtered_queries = filtered_queries[
            filtered_queries['query'].str.contains(query_filter, case=False, na=False)
        ]

    # Format for display
    display_queries = filtered_queries.copy()
    display_queries['ctr'] = display_queries['ctr'].apply(lambda x: f"{x*100:.2f}%")
    display_queries['position'] = display_queries['position'].apply(lambda x: f"{x:.1f}")
    display_queries.columns = ['Query', 'Clicks', 'Impressions', 'CTR', 'Position']

    # Show table
    st.dataframe(
        display_queries,
        hide_index=True,
        use_container_width=True,
        height=400
    )

    # Export buttons
    col1, col2, col3 = st.columns([1, 1, 4])
    with col1:
        csv = filtered_queries.to_csv(index=False)
        st.download_button(
            label="📥 Export CSV",
            data=csv,
            file_name=f"{site.name}_queries_{start_date}_{end_date}.csv",
            mime="text/csv"
        )
    with col2:
        # Excel export
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            filtered_queries.to_excel(writer, index=False, sheet_name='Queries')
        excel_data = buffer.getvalue()
        st.download_button(
            label="📥 Export Excel",
            data=excel_data,
            file_name=f"{site.name}_queries_{start_date}_{end_date}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    st.caption(f"Showing {len(filtered_queries)} of {len(top_queries)} queries")
else:
    st.info("No query data available for the selected period.")

st.markdown("---")

# Two columns: Top Pages and Device/Country breakdown
col1, col2 = st.columns(2)

with col1:
    st.subheader("Top Pages")
    if not top_pages.empty:
        # Truncate URLs for display
        display_pages = top_pages.copy()
        display_pages['page_short'] = display_pages['page'].apply(
            lambda x: x.replace(site.gsc_site_url, '/') if site.gsc_site_url in x else x
        )
        display_pages['ctr'] = display_pages['ctr'].apply(lambda x: f"{x*100:.2f}%")
        display_pages['position'] = display_pages['position'].apply(lambda x: f"{x:.1f}")

        st.dataframe(
            display_pages[['page_short', 'clicks', 'impressions', 'ctr', 'position']].rename(columns={
                'page_short': 'Page',
                'clicks': 'Clicks',
                'impressions': 'Impressions',
                'ctr': 'CTR',
                'position': 'Position'
            }).head(20),
            hide_index=True,
            use_container_width=True
        )
    else:
        st.info("No page data available.")

with col2:
    st.subheader("By Device")
    if not devices.empty:
        display_devices = devices.copy()
        display_devices['ctr'] = display_devices['ctr'].apply(lambda x: f"{x*100:.2f}%")
        display_devices['position'] = display_devices['position'].apply(lambda x: f"{x:.1f}")

        st.dataframe(
            display_devices.rename(columns={
                'device': 'Device',
                'clicks': 'Clicks',
                'impressions': 'Impressions',
                'ctr': 'CTR',
                'position': 'Position'
            }),
            hide_index=True,
            use_container_width=True
        )
    else:
        st.info("No device data available.")

    st.subheader("Top Countries")
    if not countries.empty:
        display_countries = countries.copy()
        display_countries['ctr'] = display_countries['ctr'].apply(lambda x: f"{x*100:.2f}%")
        display_countries['position'] = display_countries['position'].apply(lambda x: f"{x:.1f}")

        st.dataframe(
            display_countries.rename(columns={
                'country': 'Country',
                'clicks': 'Clicks',
                'impressions': 'Impressions',
                'ctr': 'CTR',
                'position': 'Position'
            }).head(10),
            hide_index=True,
            use_container_width=True
        )
    else:
        st.info("No country data available.")

# Footer
st.markdown("---")
st.caption(f"Data from {start_date} to {end_date} | Site: {site.display_name}")
