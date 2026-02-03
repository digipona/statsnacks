"""Keyword Opportunities page - SEO analysis and recommendations."""

import streamlit as st
import pandas as pd
from io import BytesIO

# Add parent directory to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.api.gsc_client import GSCClient
from src.components.charts import create_keyword_scatter, create_category_distribution
from src.components.filters import (
    date_range_selector,
    get_comparison_range,
    search_filter,
    category_filter,
    position_range_filter,
    impressions_threshold
)
from src.components.metrics import format_number, format_percentage
from src.utils.keyword_analysis import (
    analyze_keywords,
    get_quick_wins,
    get_striking_distance,
    get_ctr_opportunities,
    get_high_volume_opportunities,
    compare_periods,
    detect_cannibalization,
    get_category_summary
)
from src.components.site_selector import get_selected_site
from src.config.settings import settings

# Page config
st.set_page_config(
    page_title="Keyword Opportunities - Analytics Dashboard",
    page_icon="🎯",
    layout="wide"
)

# Site selector (in sidebar)
site = get_selected_site()

st.title("🎯 Keyword Opportunities")
st.markdown(f"SEO opportunities for **{site.display_name}**")

# Sidebar filters
st.sidebar.markdown("---")
st.sidebar.header("Filters")
start_date, end_date = date_range_selector('keywords')

st.sidebar.markdown("---")
st.sidebar.subheader("Analysis Filters")
selected_categories = category_filter('kw_categories')
min_position, max_position = position_range_filter('kw_position')
min_impressions = impressions_threshold('kw_impressions')

# Compare periods option
compare = st.sidebar.checkbox('Compare to previous period', value=False, key='kw_compare')

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
with st.spinner("Loading keyword data..."):
    try:
        # Current period - get all queries
        all_queries = gsc.get_all_queries(start_date, end_date)

        # Get page combinations for cannibalization
        query_pages = gsc.get_queries_by_page(start_date, end_date)

        # Previous period for comparison
        if compare:
            prev_start, prev_end = get_comparison_range(start_date, end_date)
            prev_queries = gsc.get_all_queries(prev_start, prev_end)
        else:
            prev_queries = pd.DataFrame()

    except Exception as e:
        st.error(f"Failed to fetch data: {str(e)}")
        st.stop()

if all_queries.empty:
    st.warning("No keyword data available for the selected period.")
    st.stop()

# Analyze keywords
analyzed = analyze_keywords(all_queries)

# Filter by sidebar selections
filtered = analyzed[
    (analyzed['position'] >= min_position) &
    (analyzed['position'] <= max_position) &
    (analyzed['impressions'] >= min_impressions)
]

if selected_categories:
    filtered = filtered[filtered['category'].isin(selected_categories)]

# Category summary
st.subheader("Opportunity Overview")

category_counts = get_category_summary(analyzed)
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("Quick Wins", category_counts.get('Quick Win', 0))
with col2:
    st.metric("Striking Distance", category_counts.get('Striking Distance', 0))
with col3:
    st.metric("CTR Optimization", category_counts.get('CTR Optimization', 0))
with col4:
    st.metric("Total Keywords", len(analyzed))

st.markdown("---")

# Scatter Plot
st.subheader("Opportunity Matrix")
st.markdown("""
Keywords in the **top-right** (low position number, high impressions) are your best opportunities.
- **Green** = High opportunity score
- **Size** = Current clicks
""")

scatter_fig = create_keyword_scatter(filtered.head(500))
st.plotly_chart(scatter_fig, use_container_width=True)

st.markdown("---")

# Tabbed sections for different opportunity types
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "🎯 Quick Wins",
    "📈 Striking Distance",
    "⚡ CTR Optimization",
    "🔥 High Volume",
    "📊 Period Comparison"
])

def display_keyword_table(df: pd.DataFrame, title: str = None):
    """Display a formatted keyword table with export."""
    if df.empty:
        st.info(f"No keywords found in this category.")
        return

    if title:
        st.markdown(f"**{title}**")

    # Format for display
    display_df = df.copy()
    display_df['ctr'] = display_df['ctr'].apply(lambda x: f"{x*100:.2f}%")
    display_df['position'] = display_df['position'].apply(lambda x: f"{x:.1f}")
    display_df['opportunity_score'] = display_df['opportunity_score'].apply(lambda x: f"{x:.0f}")

    if 'click_opportunity' in display_df.columns:
        display_df['click_opportunity'] = display_df['click_opportunity'].apply(
            lambda x: f"+{int(x):,}" if x > 0 else str(int(x))
        )

    # Select columns to show
    show_cols = ['query', 'clicks', 'impressions', 'ctr', 'position', 'opportunity_score', 'category']
    show_cols = [c for c in show_cols if c in display_df.columns]

    st.dataframe(
        display_df[show_cols].rename(columns={
            'query': 'Keyword',
            'clicks': 'Clicks',
            'impressions': 'Impressions',
            'ctr': 'CTR',
            'position': 'Position',
            'opportunity_score': 'Score',
            'category': 'Category'
        }),
        hide_index=True,
        use_container_width=True
    )

    # Export
    csv = df.to_csv(index=False)
    st.download_button(
        label="📥 Export",
        data=csv,
        file_name=f"keywords_{title.lower().replace(' ', '_')}.csv",
        mime="text/csv",
        key=f"export_{title}"
    )

with tab1:
    st.markdown("""
    ### 🎯 Quick Wins
    Keywords ranking **position 4-10** with good search volume.
    These need minimal optimization to reach the top 3.

    **Recommended actions:**
    - Optimize title tags and meta descriptions
    - Add internal links from high-authority pages
    - Improve content depth and relevance
    """)

    quick_wins = get_quick_wins(all_queries, min_impressions=min_impressions)
    display_keyword_table(quick_wins, "Quick Win Keywords")

with tab2:
    st.markdown("""
    ### 📈 Striking Distance
    Keywords ranking **position 11-20** with potential.
    These require more effort but represent significant opportunities.

    **Recommended actions:**
    - Create supporting content (blog posts, guides)
    - Build topic clusters around these keywords
    - Acquire quality backlinks to target pages
    """)

    striking = get_striking_distance(all_queries, min_impressions=min_impressions)
    display_keyword_table(striking, "Striking Distance Keywords")

with tab3:
    st.markdown("""
    ### ⚡ CTR Optimization
    Keywords with **good position but low CTR**.
    Your rankings are fine, but people aren't clicking.

    **Recommended actions:**
    - Rewrite title tags to be more compelling
    - Improve meta descriptions with clear CTAs
    - Add structured data for rich snippets
    - Test different headline formats
    """)

    ctr_opps = get_ctr_opportunities(all_queries)
    if not ctr_opps.empty:
        # Add expected vs actual CTR
        ctr_opps['ctr_display'] = ctr_opps.apply(
            lambda x: f"{x['ctr']*100:.2f}% (expected: {x['expected_ctr']*100:.1f}%)", axis=1
        )

    display_keyword_table(ctr_opps, "CTR Optimization Opportunities")

with tab4:
    st.markdown("""
    ### 🔥 High Volume Opportunities
    Keywords with **high impressions but poor position** (20+).
    Big potential if you can improve rankings.

    **Recommended actions:**
    - Create dedicated, comprehensive content
    - Analyze competitor content and improve
    - Build authority through backlinks
    - Consider content format (video, infographic)
    """)

    high_vol = get_high_volume_opportunities(all_queries, min_impressions=500)
    display_keyword_table(high_vol, "High Volume Opportunities")

with tab5:
    if compare and not prev_queries.empty:
        st.markdown("""
        ### 📊 Period Comparison
        Compare keyword performance between current and previous period.
        """)

        changes = compare_periods(all_queries, prev_queries)

        col1, col2 = st.columns(2)

        with col1:
            st.markdown("#### 📈 Improved Rankings")
            st.markdown("Keywords that gained position")
            if not changes['improved'].empty:
                improved_display = changes['improved'][['query', 'position_current', 'position_previous', 'position_change']].copy()
                improved_display['position_change'] = improved_display['position_change'].apply(lambda x: f"+{x:.1f}")
                improved_display.columns = ['Keyword', 'Current Pos', 'Previous Pos', 'Change']
                st.dataframe(improved_display.head(15), hide_index=True)
            else:
                st.info("No improved rankings found.")

            st.markdown("#### 🆕 New Keywords")
            st.markdown("Keywords that appeared in current period")
            if not changes['new'].empty:
                new_display = changes['new'][['query', 'impressions_current', 'clicks_current']].copy()
                new_display.columns = ['Keyword', 'Impressions', 'Clicks']
                st.dataframe(new_display.head(15), hide_index=True)
            else:
                st.info("No new keywords found.")

        with col2:
            st.markdown("#### 📉 Declined Rankings")
            st.markdown("Keywords that lost position")
            if not changes['declined'].empty:
                declined_display = changes['declined'][['query', 'position_current', 'position_previous', 'position_change']].copy()
                declined_display['position_change'] = declined_display['position_change'].apply(lambda x: f"{x:.1f}")
                declined_display.columns = ['Keyword', 'Current Pos', 'Previous Pos', 'Change']
                st.dataframe(declined_display.head(15), hide_index=True)
            else:
                st.info("No declined rankings found.")

            st.markdown("#### ❌ Lost Keywords")
            st.markdown("Keywords that disappeared from current period")
            if not changes['lost'].empty:
                lost_display = changes['lost'][['query', 'impressions_previous', 'clicks_previous']].copy()
                lost_display.columns = ['Keyword', 'Prev Impressions', 'Prev Clicks']
                st.dataframe(lost_display.head(15), hide_index=True)
            else:
                st.info("No lost keywords found.")
    else:
        st.info("Enable 'Compare to previous period' in the sidebar to see period comparison.")

st.markdown("---")

# Cannibalization Detection
st.subheader("🔄 Keyword Cannibalization")
st.markdown("""
Keywords where multiple pages on your site are competing for the same query.
This can hurt your rankings - consider consolidating content or using canonical tags.
""")

cannibalized = detect_cannibalization(query_pages)
if not cannibalized.empty:
    st.dataframe(
        cannibalized.head(20).rename(columns={
            'query': 'Keyword',
            'page_count': 'Competing Pages',
            'total_clicks': 'Total Clicks',
            'total_impressions': 'Total Impressions'
        }),
        hide_index=True,
        use_container_width=True
    )

    # Show details for top cannibalized keyword
    with st.expander("View page details for top cannibalized keywords"):
        top_cannibalized = cannibalized.head(5)['query'].tolist()
        for query in top_cannibalized:
            st.markdown(f"**{query}**")
            pages = query_pages[query_pages['query'] == query][['page', 'clicks', 'impressions', 'position']]
            pages['position'] = pages['position'].apply(lambda x: f"{x:.1f}")
            st.dataframe(pages.rename(columns={
                'page': 'Page',
                'clicks': 'Clicks',
                'impressions': 'Impressions',
                'position': 'Position'
            }), hide_index=True)
else:
    st.success("No significant keyword cannibalization detected.")

st.markdown("---")

# Full Export
st.subheader("📥 Export Full Analysis")
col1, col2 = st.columns(2)

with col1:
    csv = analyzed.to_csv(index=False)
    st.download_button(
        label="📥 Export All Keywords (CSV)",
        data=csv,
        file_name=f"keyword_analysis_{start_date}_{end_date}.csv",
        mime="text/csv"
    )

with col2:
    # Excel with multiple sheets
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        analyzed.to_excel(writer, index=False, sheet_name='All Keywords')
        get_quick_wins(all_queries).to_excel(writer, index=False, sheet_name='Quick Wins')
        get_striking_distance(all_queries).to_excel(writer, index=False, sheet_name='Striking Distance')
        get_ctr_opportunities(all_queries).to_excel(writer, index=False, sheet_name='CTR Optimization')
        if not cannibalized.empty:
            cannibalized.to_excel(writer, index=False, sheet_name='Cannibalization')

    excel_data = buffer.getvalue()
    st.download_button(
        label="📥 Export Full Report (Excel)",
        data=excel_data,
        file_name=f"keyword_report_{start_date}_{end_date}.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

# Footer
st.caption(f"Data from {start_date} to {end_date} | Site: {settings.gsc_site_url} | Keywords analyzed: {len(analyzed)}")
