"""Conversions & Events page - GA4 event tracking."""

import streamlit as st
import pandas as pd

# Add parent directory to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.components.auth import require_auth
from src.api.ga4_client import GA4Client
from src.components.charts import create_events_bar, create_traffic_trend_chart
from src.components.filters import (
    date_range_selector,
    comparison_toggle,
    get_comparison_range
)
from src.components.metrics import display_kpi_row, format_number
from src.components.site_selector import get_selected_site
from src.config.settings import settings

# Page config
st.set_page_config(
    page_title="Conversions & Events - Analytics Dashboard",
    page_icon="🎯",
    layout="wide"
)

# Auth check
authenticator = require_auth()
authenticator.logout("Logout", "sidebar")

# Site selector (in sidebar)
site = get_selected_site()

st.title("🎯 Conversions & Events")
st.markdown(f"GA4 event tracking for **{site.display_name}**")

# Sidebar filters
st.sidebar.markdown("---")
st.sidebar.header("Filters")
start_date, end_date = date_range_selector('events')
compare = comparison_toggle('events_compare')

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
with st.spinner("Loading event data..."):
    try:
        # Current period
        events = ga4.get_events(start_date, end_date)
        events_trend = ga4.get_events_trend(start_date, end_date)
        conversions = ga4.get_conversions(start_date, end_date)

        # Previous period for comparison
        if compare:
            prev_start, prev_end = get_comparison_range(start_date, end_date)
            prev_events = ga4.get_events(prev_start, prev_end)
        else:
            prev_events = None

    except Exception as e:
        st.error(f"Failed to fetch data: {str(e)}")
        st.stop()

# Calculate totals
total_events = int(events['eventCount'].sum()) if not events.empty else 0
total_conversions = int(conversions['conversions'].sum()) if not conversions.empty else 0
total_value = events['eventValue'].sum() if not events.empty and 'eventValue' in events.columns else 0
unique_events = len(events) if not events.empty else 0

# KPI Row
st.subheader("Key Metrics")
metrics = {
    'Total Events': total_events,
    'Conversions': total_conversions,
    'Event Types': unique_events,
    'Event Value': total_value
}

prev_metrics = None
if prev_events is not None and not prev_events.empty:
    prev_metrics = {
        'Total Events': int(prev_events['eventCount'].sum()),
        'Conversions': 0,  # Would need separate query
        'Event Types': len(prev_events),
        'Event Value': prev_events['eventValue'].sum() if 'eventValue' in prev_events.columns else 0
    }

display_kpi_row(metrics, prev_metrics)

st.markdown("---")

# Events Trend
st.subheader("Events Over Time")
if not events_trend.empty:
    # Rename columns to match traffic chart expectations
    trend_df = events_trend.copy()
    if 'eventCount' in trend_df.columns:
        trend_df = trend_df.rename(columns={'eventCount': 'activeUsers'})
    if 'conversions' in trend_df.columns:
        trend_df['sessions'] = trend_df['conversions']
        trend_df['screenPageViews'] = trend_df['conversions']
    else:
        trend_df['sessions'] = 0
        trend_df['screenPageViews'] = 0

    # Create custom chart for events
    import plotly.graph_objects as go

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=events_trend['date'],
        y=events_trend['eventCount'],
        name='Events',
        line=dict(color='#636EFA', width=2),
        mode='lines'
    ))

    if 'conversions' in events_trend.columns:
        fig.add_trace(go.Scatter(
            x=events_trend['date'],
            y=events_trend['conversions'],
            name='Conversions',
            line=dict(color='#09AB3B', width=2),
            mode='lines'
        ))

    fig.update_layout(
        title='Event Trend',
        xaxis_title='Date',
        yaxis_title='Count',
        hovermode='x unified',
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=1.02,
            xanchor='right',
            x=1
        ),
        margin=dict(l=0, r=0, t=40, b=0)
    )

    st.plotly_chart(fig, use_container_width=True)
else:
    st.info("No trend data available for the selected period.")

st.markdown("---")

# Events by Name
col1, col2 = st.columns(2)

with col1:
    st.subheader("Events by Name")
    if not events.empty:
        events_chart = create_events_bar(events)
        st.plotly_chart(events_chart, use_container_width=True)
    else:
        st.info("No event data available.")

with col2:
    st.subheader("Event Details")
    if not events.empty:
        display_events = events.copy()
        display_events['eventCount'] = display_events['eventCount'].apply(
            lambda x: format_number(x)
        )
        if 'eventValue' in display_events.columns:
            display_events['eventValue'] = display_events['eventValue'].apply(
                lambda x: f"${x:,.2f}" if x > 0 else "-"
            )

        st.dataframe(
            display_events.rename(columns={
                'eventName': 'Event',
                'eventCount': 'Count',
                'eventValue': 'Value'
            }),
            hide_index=True,
            use_container_width=True,
            height=400
        )
    else:
        st.info("No event data available.")

st.markdown("---")

# Conversion Events
st.subheader("Conversion Events")
if not conversions.empty and conversions['conversions'].sum() > 0:
    # Filter to only show events with conversions
    conv_events = conversions[conversions['conversions'] > 0].copy()

    if not conv_events.empty:
        col1, col2 = st.columns([2, 1])

        with col1:
            # Bar chart of conversions
            import plotly.express as px

            fig = px.bar(
                conv_events.head(10),
                x='eventName',
                y='conversions',
                title='Top Conversion Events',
                color='conversions',
                color_continuous_scale='Greens'
            )

            fig.update_layout(
                xaxis_tickangle=-45,
                showlegend=False,
                margin=dict(l=0, r=0, t=40, b=80),
                coloraxis_showscale=False
            )

            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown("### Conversion Summary")
            for _, row in conv_events.head(5).iterrows():
                st.markdown(f"""
                **{row['eventName']}**
                - Conversions: {int(row['conversions']):,}
                - Value: ${row['eventValue']:,.2f}
                """)
    else:
        st.info("No conversion events recorded in this period.")
else:
    st.info("""
    No conversion events found.

    To track conversions in GA4:
    1. Go to GA4 Admin → Events
    2. Toggle "Mark as conversion" for important events
    3. Or create custom conversion events
    """)

# Export
st.markdown("---")
if not events.empty:
    csv = events.to_csv(index=False)
    st.download_button(
        label="📥 Export Events to CSV",
        data=csv,
        file_name=f"events_{start_date}_{end_date}.csv",
        mime="text/csv"
    )

# Footer
st.caption(f"Data from {start_date} to {end_date} | GA4 Property: {settings.ga4_property_id}")
