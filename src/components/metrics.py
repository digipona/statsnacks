"""Metric display components."""

import streamlit as st
from typing import Optional, Union


def format_number(value: Union[int, float], precision: int = 0) -> str:
    """
    Format number with K/M suffixes.

    Args:
        value: Number to format
        precision: Decimal places

    Returns:
        str: Formatted string
    """
    if value >= 1_000_000:
        return f"{value/1_000_000:.{precision}f}M"
    elif value >= 1_000:
        return f"{value/1_000:.{precision}f}K"
    else:
        return f"{value:.{precision}f}"


def format_duration(seconds: float) -> str:
    """
    Format seconds as mm:ss.

    Args:
        seconds: Duration in seconds

    Returns:
        str: Formatted duration
    """
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes}:{secs:02d}"


def format_percentage(value: float, is_decimal: bool = False) -> str:
    """
    Format percentage.

    Args:
        value: Percentage value
        is_decimal: If True, multiply by 100

    Returns:
        str: Formatted percentage
    """
    if is_decimal:
        value = value * 100
    return f"{value:.1f}%"


def calculate_delta(current: float, previous: float) -> tuple:
    """
    Calculate delta between two values.

    Args:
        current: Current value
        previous: Previous value

    Returns:
        tuple: (delta_value, delta_string, is_positive)
    """
    if previous == 0:
        return (0, "N/A", None)

    delta = current - previous
    delta_pct = (delta / previous) * 100

    if delta > 0:
        delta_str = f"+{delta_pct:.1f}%"
        is_positive = True
    elif delta < 0:
        delta_str = f"{delta_pct:.1f}%"
        is_positive = False
    else:
        delta_str = "0%"
        is_positive = None

    return (delta, delta_str, is_positive)


def display_kpi_row(metrics: dict, previous_metrics: Optional[dict] = None):
    """
    Display a row of KPI metrics.

    Args:
        metrics: Dict of metric_name -> value
        previous_metrics: Optional dict for comparison
    """
    cols = st.columns(len(metrics))

    for i, (name, value) in enumerate(metrics.items()):
        with cols[i]:
            delta = None
            if previous_metrics and name in previous_metrics:
                _, delta_str, _ = calculate_delta(value, previous_metrics[name])
                delta = delta_str if delta_str != "N/A" else None

            # Format value based on metric type
            if 'rate' in name.lower() or 'ctr' in name.lower():
                display_value = format_percentage(value)
            elif 'duration' in name.lower() or 'time' in name.lower():
                display_value = format_duration(value)
            elif 'position' in name.lower():
                display_value = f"{value:.1f}"
            elif value >= 1000:
                display_value = format_number(value)
            else:
                display_value = f"{value:,.0f}"

            st.metric(
                label=name.replace('_', ' ').title(),
                value=display_value,
                delta=delta
            )


def display_comparison_metric(
    label: str,
    current: float,
    previous: float,
    format_type: str = 'number',
    inverse: bool = False
):
    """
    Display a single metric with comparison.

    Args:
        label: Metric label
        current: Current value
        previous: Previous value
        format_type: 'number', 'percentage', 'duration', 'position'
        inverse: If True, negative change is good (e.g., position)
    """
    delta, delta_str, is_positive = calculate_delta(current, previous)

    # Format display value
    if format_type == 'percentage':
        display_value = format_percentage(current)
    elif format_type == 'duration':
        display_value = format_duration(current)
    elif format_type == 'position':
        display_value = f"{current:.1f}"
    else:
        display_value = format_number(current)

    # Handle inverse metrics (lower is better)
    delta_color = 'normal'
    if inverse and is_positive is not None:
        delta_color = 'inverse'

    st.metric(
        label=label,
        value=display_value,
        delta=delta_str if delta_str != "N/A" else None,
        delta_color=delta_color
    )


def display_opportunity_card(keyword_data: dict):
    """
    Display a keyword opportunity card.

    Args:
        keyword_data: Dict with keyword analysis data
    """
    score = keyword_data.get('opportunity_score', 0)
    category = keyword_data.get('category', 'Unknown')

    # Color based on score
    if score >= 70:
        color = '#09AB3B'  # Green
    elif score >= 50:
        color = '#FACA2B'  # Yellow
    else:
        color = '#EF553B'  # Red

    st.markdown(f"""
    <div style="
        border: 1px solid {color};
        border-radius: 8px;
        padding: 12px;
        margin: 8px 0;
    ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong>{keyword_data.get('query', 'N/A')}</strong>
            <span style="
                background-color: {color};
                color: white;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.9em;
            ">{score:.0f}</span>
        </div>
        <div style="margin-top: 8px; font-size: 0.9em; color: #666;">
            Position: {keyword_data.get('position', 0):.1f} |
            Impressions: {format_number(keyword_data.get('impressions', 0))} |
            CTR: {format_percentage(keyword_data.get('ctr', 0), is_decimal=True)}
        </div>
        <div style="margin-top: 4px;">
            <span style="
                background-color: #f0f0f0;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 0.8em;
            ">{category}</span>
        </div>
    </div>
    """, unsafe_allow_html=True)
