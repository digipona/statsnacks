"""Filter components for dashboard."""

import streamlit as st
from datetime import datetime, timedelta
from typing import Tuple


def get_date_range(preset: str) -> Tuple[str, str]:
    """
    Get date range based on preset selection.

    Args:
        preset: Preset name (e.g., 'Last 7 days', 'Last 30 days')

    Returns:
        tuple: (start_date, end_date) in YYYY-MM-DD format
    """
    today = datetime.now().date()

    presets = {
        'Last 7 days': (today - timedelta(days=7), today - timedelta(days=1)),
        'Last 14 days': (today - timedelta(days=14), today - timedelta(days=1)),
        'Last 28 days': (today - timedelta(days=28), today - timedelta(days=1)),
        'Last 30 days': (today - timedelta(days=30), today - timedelta(days=1)),
        'Last 90 days': (today - timedelta(days=90), today - timedelta(days=1)),
        'Last 6 months': (today - timedelta(days=180), today - timedelta(days=1)),
        'Last 12 months': (today - timedelta(days=365), today - timedelta(days=1)),
        'This month': (today.replace(day=1), today - timedelta(days=1)),
        'Last month': (
            (today.replace(day=1) - timedelta(days=1)).replace(day=1),
            today.replace(day=1) - timedelta(days=1)
        ),
    }

    start, end = presets.get(preset, presets['Last 30 days'])
    return start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d')


def get_comparison_range(start_date: str, end_date: str) -> Tuple[str, str]:
    """
    Get previous period for comparison.

    Args:
        start_date: Current period start
        end_date: Current period end

    Returns:
        tuple: (prev_start, prev_end) in YYYY-MM-DD format
    """
    start = datetime.strptime(start_date, '%Y-%m-%d').date()
    end = datetime.strptime(end_date, '%Y-%m-%d').date()

    period_days = (end - start).days + 1
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=period_days - 1)

    return prev_start.strftime('%Y-%m-%d'), prev_end.strftime('%Y-%m-%d')


def date_range_selector(key: str = 'date_range') -> Tuple[str, str]:
    """
    Display date range selector in sidebar.

    Args:
        key: Unique key for the widget

    Returns:
        tuple: (start_date, end_date) in YYYY-MM-DD format
    """
    preset_options = [
        'Last 7 days',
        'Last 14 days',
        'Last 28 days',
        'Last 30 days',
        'Last 90 days',
        'Last 6 months',
        'Last 12 months',
        'Custom'
    ]

    preset = st.sidebar.selectbox(
        'Date Range',
        preset_options,
        index=3,  # Default to Last 30 days
        key=f'{key}_preset'
    )

    if preset == 'Custom':
        today = datetime.now().date()
        default_start = today - timedelta(days=30)
        default_end = today - timedelta(days=1)

        col1, col2 = st.sidebar.columns(2)
        with col1:
            start_date = st.date_input(
                'Start',
                value=default_start,
                key=f'{key}_start'
            )
        with col2:
            end_date = st.date_input(
                'End',
                value=default_end,
                key=f'{key}_end'
            )

        return start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')
    else:
        return get_date_range(preset)


def comparison_toggle(key: str = 'comparison') -> bool:
    """
    Display comparison toggle in sidebar.

    Args:
        key: Unique key for the widget

    Returns:
        bool: Whether comparison is enabled
    """
    return st.sidebar.checkbox(
        'Compare to previous period',
        value=False,
        key=key
    )


def metric_filter(
    options: list,
    default: str,
    label: str = 'Metric',
    key: str = 'metric'
) -> str:
    """
    Display metric selector.

    Args:
        options: List of metric options
        default: Default selection
        label: Label for the selector
        key: Unique key for the widget

    Returns:
        str: Selected metric
    """
    return st.selectbox(
        label,
        options,
        index=options.index(default) if default in options else 0,
        key=key
    )


def search_filter(
    label: str = 'Search',
    placeholder: str = 'Filter...',
    key: str = 'search'
) -> str:
    """
    Display search/filter input.

    Args:
        label: Label for the input
        placeholder: Placeholder text
        key: Unique key for the widget

    Returns:
        str: Search query
    """
    return st.text_input(
        label,
        placeholder=placeholder,
        key=key
    )


def category_filter(key: str = 'category') -> list:
    """
    Display keyword category multi-select.

    Args:
        key: Unique key for the widget

    Returns:
        list: Selected categories
    """
    categories = [
        'Quick Win',
        'Striking Distance',
        'CTR Optimization',
        'Maintain Position',
        'High Volume Opportunity',
        'Monitor'
    ]

    return st.sidebar.multiselect(
        'Categories',
        categories,
        default=['Quick Win', 'Striking Distance', 'CTR Optimization'],
        key=key
    )


def position_range_filter(key: str = 'position') -> Tuple[float, float]:
    """
    Display position range slider.

    Args:
        key: Unique key for the widget

    Returns:
        tuple: (min_position, max_position)
    """
    return st.sidebar.slider(
        'Position Range',
        min_value=1.0,
        max_value=100.0,
        value=(1.0, 50.0),
        step=1.0,
        key=key
    )


def impressions_threshold(key: str = 'impressions') -> int:
    """
    Display minimum impressions threshold.

    Args:
        key: Unique key for the widget

    Returns:
        int: Minimum impressions
    """
    return st.sidebar.number_input(
        'Min Impressions',
        min_value=0,
        max_value=10000,
        value=50,
        step=10,
        key=key
    )
