"""
Analytics Dashboard - Main Entry Point

A Streamlit dashboard for Google Analytics 4 and Google Search Console data.
"""

import streamlit as st
import streamlit_authenticator as stauth
import os
import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config.settings import settings
from src.auth.google_auth import test_connection

# Page configuration
st.set_page_config(
    page_title="Analytics Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Authentication
credentials = {
    "usernames": {
        os.getenv("AUTH_USERNAME", "admin"): {
            "name": "Admin",
            "password": os.getenv("AUTH_PASSWORD_HASH", "")
        }
    }
}

authenticator = stauth.Authenticate(
    credentials,
    "statsnacks",
    os.getenv("AUTH_COOKIE_KEY", "default_secret_key"),
    cookie_expiry_days=30
)

authenticator.login(location='main')

if st.session_state.get('authentication_status') == False:
    st.error("Username/password is incorrect")
    st.stop()
if st.session_state.get('authentication_status') is None:
    st.warning("Please enter your username and password")
    st.stop()

# User is authenticated - continue with app

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #666;
        margin-bottom: 2rem;
    }
    .status-ok {
        color: #09AB3B;
    }
    .status-error {
        color: #FF4B4B;
    }
    .card {
        background-color: #f0f2f6;
        border-radius: 10px;
        padding: 20px;
        margin: 10px 0;
    }
    .metric-value {
        font-size: 2rem;
        font-weight: 700;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar
st.sidebar.markdown("## 📊 Analytics Dashboard")
authenticator.logout("Logout", "sidebar")
st.sidebar.markdown("---")
site_names = settings.get_site_names()
if site_names:
    st.sidebar.markdown(f"**Sites:** {len(site_names)} configured")
elif settings.gsc_site_url:
    st.sidebar.markdown(f"**Site:** {settings.gsc_site_url}")
else:
    st.sidebar.markdown("**Site:** Not configured")
st.sidebar.markdown("---")

# Navigation hint
st.sidebar.markdown("""
### Navigation
Use the pages in the sidebar to explore:
- **Traffic Overview** - GA4 metrics
- **Search Performance** - GSC data
- **Conversions** - Event tracking
- **Keyword Opportunities** - SEO analysis
""")

# Main content
st.markdown('<p class="main-header">📊 Analytics Dashboard</p>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">Google Analytics 4 & Search Console insights with keyword opportunity analysis</p>', unsafe_allow_html=True)

# Configuration Status
st.subheader("Configuration Status")

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("#### GA4 Property")
    site_names = settings.get_site_names()
    if site_names:
        # Multi-site mode
        sites_with_ga4 = [name for name in site_names if settings.get_site(name).ga4_property_id]
        st.success(f"✅ {len(sites_with_ga4)} sites configured")
        for name in sites_with_ga4:
            site = settings.get_site(name)
            st.caption(f"• {site.display_name}: {site.ga4_property_id}")
    elif settings.ga4_property_id:
        st.success(f"✅ Configured: {settings.ga4_property_id}")
    else:
        st.error("❌ Not configured")
        st.caption("Set GA4_PROPERTY_ID in .env")

with col2:
    st.markdown("#### Search Console")
    if site_names:
        # Multi-site mode
        sites_with_gsc = [name for name in site_names if settings.get_site(name).gsc_site_url]
        st.success(f"✅ {len(sites_with_gsc)} sites configured")
        for name in sites_with_gsc:
            site = settings.get_site(name)
            st.caption(f"• {site.display_name}: {site.gsc_site_url}")
    elif settings.gsc_site_url:
        st.success(f"✅ Configured: {settings.gsc_site_url}")
    else:
        st.error("❌ Not configured")
        st.caption("Set GSC_SITE_URL in .env")

with col3:
    st.markdown("#### Credentials")
    if settings.validate_credentials():
        st.success("✅ Found")
    else:
        st.error("❌ Not found")
        st.caption("Add service-account.json to credentials/")

st.markdown("---")

# Connection Test
if st.button("🔌 Test API Connection"):
    with st.spinner("Testing connections..."):
        status = test_connection()

        if status['credentials']:
            st.success("✅ Credentials loaded successfully")
        else:
            st.error("❌ Failed to load credentials")

        if status['ga4']:
            st.success("✅ GA4 connection successful")
        else:
            st.warning("⚠️ GA4 connection failed")

        if status['gsc']:
            st.success("✅ Search Console connection successful")
        else:
            st.warning("⚠️ Search Console connection failed")

        if status['errors']:
            with st.expander("View errors"):
                for error in status['errors']:
                    st.error(error)

st.markdown("---")

# Quick Start Guide
st.subheader("🚀 Quick Start Guide")

with st.expander("How to set up the dashboard", expanded=not settings.validate()):
    st.markdown("""
    ### 1. Create a Google Cloud Project

    1. Go to [Google Cloud Console](https://console.cloud.google.com/)
    2. Create a new project
    3. Enable these APIs:
       - Google Analytics Data API
       - Google Search Console API

    ### 2. Create a Service Account

    1. Go to APIs & Services → Credentials
    2. Create a new Service Account
    3. Download the JSON key file
    4. Save it as `credentials/service-account.json`

    ### 3. Grant Access

    **For GA4:**
    1. Go to Google Analytics → Admin → Account Access
    2. Add the service account email as Viewer

    **For Search Console:**
    1. Go to Search Console → Settings → Users
    2. Add the service account email with Full permission

    ### 4. Configure Environment

    Create a `.env` file (copy from `.env.example`):

    **Single site:**
    ```
    GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json
    GA4_PROPERTY_ID=123456789
    GSC_SITE_URL=sc-domain:yoursite.com
    ```

    **Multi-site:**
    ```
    GOOGLE_APPLICATION_CREDENTIALS=./credentials/service-account.json
    SITES=site1,site2
    SITE_site1_GA4=123456789
    SITE_site1_GSC=sc-domain:site1.com
    SITE_site2_GA4=987654321
    SITE_site2_GSC=sc-domain:site2.com
    ```

    ### 5. Run the Dashboard

    ```bash
    cd dashboard
    pip install -r requirements.txt
    streamlit run src/app.py
    ```
    """)

# Features Overview
st.subheader("📋 Features")

col1, col2 = st.columns(2)

with col1:
    st.markdown("""
    #### Traffic Overview
    - Users, sessions, pageviews
    - Traffic trends over time
    - Source/medium breakdown
    - Device and browser stats
    - Geographic distribution

    #### Search Performance
    - Clicks, impressions, CTR
    - Average position tracking
    - Top queries and pages
    - Device breakdown
    - Export to CSV/Excel
    """)

with col2:
    st.markdown("""
    #### Conversions & Events
    - Event tracking
    - Conversion metrics
    - Event trends over time

    #### Keyword Opportunities
    - **Quick Wins** - Position 4-10 keywords
    - **Striking Distance** - Position 11-20
    - **CTR Optimization** - Underperforming CTR
    - **Cannibalization Detection**
    - **Period Comparison**
    - Export full reports
    """)

# Footer
st.markdown("---")
st.caption("Built with Streamlit | Data from Google Analytics 4 & Search Console")
