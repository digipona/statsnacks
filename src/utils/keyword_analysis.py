"""Keyword opportunity analysis algorithms."""

import pandas as pd
import numpy as np
from typing import Dict, Tuple


# Expected CTR by position (industry benchmarks)
EXPECTED_CTR = {
    1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.07,
    6: 0.05, 7: 0.04, 8: 0.03, 9: 0.03, 10: 0.025,
    11: 0.02, 12: 0.018, 13: 0.016, 14: 0.014, 15: 0.012,
    16: 0.01, 17: 0.009, 18: 0.008, 19: 0.007, 20: 0.006
}


def get_expected_ctr(position: float) -> float:
    """
    Get expected CTR for a given position.

    Args:
        position: Average SERP position

    Returns:
        float: Expected CTR as decimal (0-1)
    """
    pos = int(min(max(position, 1), 20))
    return EXPECTED_CTR.get(pos, 0.005)


def calculate_opportunity_score(row: pd.Series) -> float:
    """
    Calculate opportunity score (0-100) for a keyword.
    Higher score = better opportunity to target.

    Scoring breakdown:
    - Position Score (0-40): Rewards keywords in "striking distance"
    - Impression Score (0-30): Higher search volume = more opportunity
    - CTR Gap Score (0-20): Underperforming CTR = optimization opportunity
    - Click Validation (0-10): Already getting clicks = validated demand

    Args:
        row: DataFrame row with position, impressions, ctr, clicks

    Returns:
        float: Opportunity score 0-100
    """
    position = row['position']
    impressions = row['impressions']
    ctr = row['ctr']
    clicks = row['clicks']

    # Position Score (0-40 points)
    # Best opportunities are positions 4-20 (can be improved to top 3)
    if 4 <= position <= 10:
        position_score = 40  # Quick wins zone
    elif 11 <= position <= 20:
        position_score = 35  # Striking distance
    elif position <= 3:
        position_score = 15  # Already good, less opportunity
    elif 21 <= position <= 50:
        position_score = 25  # Potential with effort
    else:
        position_score = 5   # Long shot

    # Impression Score (0-30 points) - logarithmic scale
    if impressions > 0:
        impression_score = min(30, np.log10(impressions) * 8)
    else:
        impression_score = 0

    # CTR Gap Score (0-20 points)
    expected = get_expected_ctr(position)
    if ctr < expected * 0.7:  # CTR significantly below expected
        ctr_score = 20  # Big optimization opportunity
    elif ctr < expected:
        ctr_score = 15
    else:
        ctr_score = 5  # Already performing well

    # Click Validation Score (0-10 points)
    click_score = min(10, clicks / 5)

    return round(position_score + impression_score + ctr_score + click_score, 1)


def categorize_keyword(row: pd.Series) -> str:
    """
    Categorize keyword by opportunity type.

    Categories:
    - Quick Win: Position 4-10, good impressions
    - Striking Distance: Position 11-20
    - CTR Optimization: Good position, low CTR
    - Maintain Position: Already top 3
    - High Volume Opportunity: Lots of impressions but low position
    - Monitor: Everything else

    Args:
        row: DataFrame row with position, impressions, ctr

    Returns:
        str: Category name
    """
    position = row['position']
    impressions = row['impressions']
    ctr = row['ctr']
    expected_ctr = get_expected_ctr(position)

    if 4 <= position <= 10 and impressions >= 100:
        return "Quick Win"
    elif 11 <= position <= 20 and impressions >= 50:
        return "Striking Distance"
    elif position <= 10 and ctr < expected_ctr * 0.7:
        return "CTR Optimization"
    elif position <= 3:
        return "Maintain Position"
    elif impressions >= 500 and position > 20:
        return "High Volume Opportunity"
    else:
        return "Monitor"


def analyze_keywords(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add opportunity analysis columns to keyword dataframe.

    Adds:
    - opportunity_score: 0-100 score
    - category: Opportunity category
    - expected_ctr: Expected CTR for position
    - ctr_gap: Difference from expected (positive = underperforming)
    - potential_clicks: Estimated clicks if reached position 1
    - click_opportunity: Potential - current clicks

    Args:
        df: DataFrame with query, clicks, impressions, ctr, position

    Returns:
        pd.DataFrame: Analyzed data sorted by opportunity score
    """
    if df.empty:
        return df

    df = df.copy()

    # Calculate opportunity score
    df['opportunity_score'] = df.apply(calculate_opportunity_score, axis=1)

    # Categorize keywords
    df['category'] = df.apply(categorize_keyword, axis=1)

    # Calculate expected CTR
    df['expected_ctr'] = df['position'].apply(get_expected_ctr)

    # CTR gap (positive = underperforming)
    df['ctr_gap'] = df['expected_ctr'] - df['ctr']

    # Potential clicks (if reached position 1)
    df['potential_clicks'] = (df['impressions'] * 0.28).astype(int)

    # Click opportunity (potential - current)
    df['click_opportunity'] = df['potential_clicks'] - df['clicks']

    return df.sort_values('opportunity_score', ascending=False)


def get_quick_wins(df: pd.DataFrame, min_impressions: int = 100) -> pd.DataFrame:
    """
    Get keywords in positions 4-10 with good impression volume.
    These are the lowest-hanging fruit - small optimizations can push to top 3.

    Args:
        df: Raw keyword DataFrame
        min_impressions: Minimum impressions threshold

    Returns:
        pd.DataFrame: Quick win keywords
    """
    analyzed = analyze_keywords(df)
    return analyzed[
        (analyzed['position'] >= 4) &
        (analyzed['position'] <= 10) &
        (analyzed['impressions'] >= min_impressions)
    ].head(25)


def get_striking_distance(df: pd.DataFrame, min_impressions: int = 50) -> pd.DataFrame:
    """
    Get keywords in positions 11-20.
    These need more effort but represent good opportunities.

    Args:
        df: Raw keyword DataFrame
        min_impressions: Minimum impressions threshold

    Returns:
        pd.DataFrame: Striking distance keywords
    """
    analyzed = analyze_keywords(df)
    return analyzed[
        (analyzed['position'] >= 11) &
        (analyzed['position'] <= 20) &
        (analyzed['impressions'] >= min_impressions)
    ].head(25)


def get_ctr_opportunities(df: pd.DataFrame) -> pd.DataFrame:
    """
    Get keywords with good position but low CTR.
    These need title/description optimization.

    Args:
        df: Raw keyword DataFrame

    Returns:
        pd.DataFrame: CTR optimization opportunities
    """
    analyzed = analyze_keywords(df)
    return analyzed[
        (analyzed['position'] <= 10) &
        (analyzed['ctr_gap'] > 0.02)
    ].sort_values('ctr_gap', ascending=False).head(25)


def get_high_volume_opportunities(df: pd.DataFrame, min_impressions: int = 500) -> pd.DataFrame:
    """
    Get keywords with high search volume but poor position.
    These need significant content/link building investment.

    Args:
        df: Raw keyword DataFrame
        min_impressions: Minimum impressions threshold

    Returns:
        pd.DataFrame: High volume opportunity keywords
    """
    analyzed = analyze_keywords(df)
    return analyzed[
        (analyzed['position'] > 20) &
        (analyzed['impressions'] >= min_impressions)
    ].sort_values('impressions', ascending=False).head(25)


def compare_periods(
    current_df: pd.DataFrame,
    previous_df: pd.DataFrame
) -> Dict[str, pd.DataFrame]:
    """
    Compare keyword performance between two periods.

    Returns:
    - improved: Keywords that gained position
    - declined: Keywords that lost position
    - new: Keywords that appeared in current period
    - lost: Keywords that disappeared from current period

    Args:
        current_df: Current period data
        previous_df: Previous period data

    Returns:
        dict: DataFrames for each change category
    """
    if current_df.empty and previous_df.empty:
        return {
            'improved': pd.DataFrame(),
            'declined': pd.DataFrame(),
            'new': pd.DataFrame(),
            'lost': pd.DataFrame()
        }

    # Merge on query
    merged = current_df.merge(
        previous_df,
        on='query',
        suffixes=('_current', '_previous'),
        how='outer'
    )

    # Fill NaN for new/lost keywords
    merged = merged.fillna(0)

    # Calculate changes
    merged['position_change'] = merged['position_previous'] - merged['position_current']
    merged['clicks_change'] = merged['clicks_current'] - merged['clicks_previous']
    merged['impressions_change'] = merged['impressions_current'] - merged['impressions_previous']

    # Categorize changes
    improved = merged[merged['position_change'] > 3].sort_values(
        'position_change', ascending=False
    ).head(25)

    declined = merged[merged['position_change'] < -3].sort_values(
        'position_change'
    ).head(25)

    new_keywords = merged[
        (merged['impressions_previous'] == 0) &
        (merged['impressions_current'] > 0)
    ].sort_values('impressions_current', ascending=False).head(25)

    lost_keywords = merged[
        (merged['impressions_current'] == 0) &
        (merged['impressions_previous'] > 0)
    ].sort_values('impressions_previous', ascending=False).head(25)

    return {
        'improved': improved,
        'declined': declined,
        'new': new_keywords,
        'lost': lost_keywords
    }


def detect_cannibalization(df: pd.DataFrame) -> pd.DataFrame:
    """
    Detect keyword cannibalization (multiple pages ranking for same query).

    Args:
        df: DataFrame with query and page dimensions

    Returns:
        pd.DataFrame: Queries with multiple ranking pages
    """
    if df.empty or 'page' not in df.columns:
        return pd.DataFrame()

    # Group by query and count unique pages
    query_pages = df.groupby('query').agg({
        'page': 'nunique',
        'clicks': 'sum',
        'impressions': 'sum'
    }).reset_index()

    query_pages.columns = ['query', 'page_count', 'total_clicks', 'total_impressions']

    # Filter queries with multiple pages
    cannibalized = query_pages[query_pages['page_count'] > 1].sort_values(
        'total_impressions', ascending=False
    )

    return cannibalized


def get_category_summary(df: pd.DataFrame) -> Dict[str, int]:
    """
    Get count of keywords in each category.

    Args:
        df: Analyzed keyword DataFrame

    Returns:
        dict: Category counts
    """
    if df.empty or 'category' not in df.columns:
        analyzed = analyze_keywords(df)
    else:
        analyzed = df

    if analyzed.empty:
        return {
            'Quick Win': 0,
            'Striking Distance': 0,
            'CTR Optimization': 0,
            'Maintain Position': 0,
            'High Volume Opportunity': 0,
            'Monitor': 0
        }

    return analyzed['category'].value_counts().to_dict()
