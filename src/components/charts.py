"""Chart components using Plotly."""

import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd


# Color scheme
COLORS = {
    'primary': '#FF4B4B',
    'secondary': '#0068C9',
    'success': '#09AB3B',
    'warning': '#FACA2B',
    'info': '#00C0F2',
    'users': '#636EFA',
    'sessions': '#EF553B',
    'pageviews': '#00CC96',
    'clicks': '#AB63FA',
    'impressions': '#FFA15A'
}


def create_traffic_trend_chart(df: pd.DataFrame) -> go.Figure:
    """
    Create multi-line chart for traffic metrics over time.

    Args:
        df: DataFrame with date, activeUsers, sessions, screenPageViews

    Returns:
        go.Figure: Plotly figure
    """
    if df.empty:
        return go.Figure()

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=df['date'],
        y=df['activeUsers'],
        name='Users',
        line=dict(color=COLORS['users'], width=2),
        mode='lines'
    ))

    fig.add_trace(go.Scatter(
        x=df['date'],
        y=df['sessions'],
        name='Sessions',
        line=dict(color=COLORS['sessions'], width=2),
        mode='lines'
    ))

    fig.add_trace(go.Scatter(
        x=df['date'],
        y=df['screenPageViews'],
        name='Pageviews',
        line=dict(color=COLORS['pageviews'], width=2),
        mode='lines'
    ))

    fig.update_layout(
        title='Traffic Trend',
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

    return fig


def create_search_trend_chart(df: pd.DataFrame) -> go.Figure:
    """
    Create dual-axis chart for search performance.

    Args:
        df: DataFrame with date, clicks, impressions, ctr, position

    Returns:
        go.Figure: Plotly figure
    """
    if df.empty:
        return go.Figure()

    fig = make_subplots(specs=[[{"secondary_y": True}]])

    # Clicks and impressions on primary y-axis
    fig.add_trace(
        go.Scatter(
            x=df['date'],
            y=df['clicks'],
            name='Clicks',
            line=dict(color=COLORS['clicks'], width=2)
        ),
        secondary_y=False
    )

    fig.add_trace(
        go.Scatter(
            x=df['date'],
            y=df['impressions'],
            name='Impressions',
            line=dict(color=COLORS['impressions'], width=2)
        ),
        secondary_y=False
    )

    # Position on secondary y-axis (inverted - lower is better)
    fig.add_trace(
        go.Scatter(
            x=df['date'],
            y=df['position'],
            name='Avg Position',
            line=dict(color=COLORS['info'], width=2, dash='dot')
        ),
        secondary_y=True
    )

    fig.update_layout(
        title='Search Performance Trend',
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

    fig.update_yaxes(title_text='Clicks / Impressions', secondary_y=False)
    fig.update_yaxes(title_text='Position', secondary_y=True, autorange='reversed')

    return fig


def create_keyword_scatter(df: pd.DataFrame) -> go.Figure:
    """
    Create interactive scatter plot for keyword opportunities.

    Args:
        df: Analyzed keyword DataFrame with opportunity_score

    Returns:
        go.Figure: Plotly figure
    """
    if df.empty:
        return go.Figure()

    fig = px.scatter(
        df,
        x='position',
        y='impressions',
        size='clicks',
        color='opportunity_score',
        color_continuous_scale='RdYlGn',
        hover_name='query',
        hover_data={
            'clicks': True,
            'impressions': True,
            'ctr': ':.2%',
            'position': ':.1f',
            'opportunity_score': ':.0f'
        },
        title='Keyword Opportunity Matrix'
    )

    # Invert x-axis (position 1 on right - best positions on right)
    fig.update_xaxes(
        autorange='reversed',
        title='Position (lower is better)'
    )

    fig.update_yaxes(
        type='log',
        title='Impressions (log scale)'
    )

    # Add quadrant lines
    fig.add_vline(x=10, line_dash='dash', line_color='gray', opacity=0.5)
    fig.add_hline(y=100, line_dash='dash', line_color='gray', opacity=0.5)

    # Add annotations for quadrants
    fig.add_annotation(
        x=5, y=10000,
        text='Quick Wins',
        showarrow=False,
        font=dict(size=12, color='green'),
        opacity=0.7
    )

    fig.add_annotation(
        x=15, y=10000,
        text='Striking Distance',
        showarrow=False,
        font=dict(size=12, color='orange'),
        opacity=0.7
    )

    fig.update_layout(
        margin=dict(l=0, r=0, t=40, b=0)
    )

    return fig


def create_traffic_sources_pie(df: pd.DataFrame) -> go.Figure:
    """
    Create pie chart for traffic sources.

    Args:
        df: DataFrame with sessionDefaultChannelGrouping and sessions

    Returns:
        go.Figure: Plotly figure
    """
    if df.empty:
        return go.Figure()

    fig = px.pie(
        df,
        values='sessions',
        names='sessionDefaultChannelGrouping',
        title='Traffic Sources',
        hole=0.4
    )

    fig.update_traces(textposition='inside', textinfo='percent+label')
    fig.update_layout(
        showlegend=False,
        margin=dict(l=0, r=0, t=40, b=0)
    )

    return fig


def create_top_pages_bar(df: pd.DataFrame, metric: str = 'screenPageViews') -> go.Figure:
    """
    Create horizontal bar chart for top pages.

    Args:
        df: DataFrame with pagePath and metric
        metric: Metric to display

    Returns:
        go.Figure: Plotly figure
    """
    if df.empty:
        return go.Figure()

    # Truncate page paths for display
    df = df.copy()
    df['page_display'] = df['pagePath'].apply(
        lambda x: x[:50] + '...' if len(x) > 50 else x
    )

    fig = px.bar(
        df.head(10),
        x=metric,
        y='page_display',
        orientation='h',
        title='Top Pages',
        color=metric,
        color_continuous_scale='Blues'
    )

    fig.update_layout(
        yaxis=dict(autorange='reversed'),
        showlegend=False,
        margin=dict(l=0, r=0, t=40, b=0),
        coloraxis_showscale=False
    )

    fig.update_yaxes(title='')
    fig.update_xaxes(title='Pageviews')

    return fig


def create_devices_chart(df: pd.DataFrame) -> go.Figure:
    """
    Create donut chart for device breakdown.

    Args:
        df: DataFrame with deviceCategory and sessions

    Returns:
        go.Figure: Plotly figure
    """
    if df.empty:
        return go.Figure()

    fig = px.pie(
        df,
        values='sessions',
        names='deviceCategory',
        title='Device Breakdown',
        hole=0.5
    )

    fig.update_traces(textposition='inside', textinfo='percent+label')
    fig.update_layout(
        showlegend=False,
        margin=dict(l=0, r=0, t=40, b=0)
    )

    return fig


def create_events_bar(df: pd.DataFrame) -> go.Figure:
    """
    Create bar chart for event counts.

    Args:
        df: DataFrame with eventName and eventCount

    Returns:
        go.Figure: Plotly figure
    """
    if df.empty:
        return go.Figure()

    fig = px.bar(
        df.head(15),
        x='eventName',
        y='eventCount',
        title='Events by Name',
        color='eventCount',
        color_continuous_scale='Viridis'
    )

    fig.update_layout(
        xaxis_tickangle=-45,
        showlegend=False,
        margin=dict(l=0, r=0, t=40, b=80),
        coloraxis_showscale=False
    )

    fig.update_xaxes(title='')
    fig.update_yaxes(title='Count')

    return fig


def create_category_distribution(category_counts: dict) -> go.Figure:
    """
    Create bar chart for keyword category distribution.

    Args:
        category_counts: Dict of category -> count

    Returns:
        go.Figure: Plotly figure
    """
    if not category_counts:
        return go.Figure()

    df = pd.DataFrame([
        {'category': k, 'count': v}
        for k, v in category_counts.items()
    ])

    # Define category colors
    category_colors = {
        'Quick Win': '#09AB3B',
        'Striking Distance': '#FACA2B',
        'CTR Optimization': '#00C0F2',
        'Maintain Position': '#636EFA',
        'High Volume Opportunity': '#EF553B',
        'Monitor': '#7F7F7F'
    }

    df['color'] = df['category'].map(category_colors)

    fig = px.bar(
        df,
        x='category',
        y='count',
        title='Keyword Categories',
        color='category',
        color_discrete_map=category_colors
    )

    fig.update_layout(
        xaxis_tickangle=-45,
        showlegend=False,
        margin=dict(l=0, r=0, t=40, b=80)
    )

    return fig
