"""Site selector component for multi-site support."""

import streamlit as st
from src.config.settings import settings, SiteConfig


def get_selected_site() -> SiteConfig:
    """
    Get the currently selected site configuration.
    Displays a selector if multiple sites are configured.

    Returns:
        SiteConfig: The selected site's configuration
    """
    # Initialize session state
    if 'selected_site' not in st.session_state:
        site_names = settings.get_site_names()
        st.session_state.selected_site = site_names[0] if site_names else None

    # If only one site or no sites, return it directly
    if not settings.is_multi_site():
        site_names = settings.get_site_names()
        if site_names:
            return settings.get_site(site_names[0])
        # Fallback to legacy config
        return SiteConfig(
            name='default',
            display_name='Default Site',
            ga4_property_id=settings.ga4_property_id,
            gsc_site_url=settings.gsc_site_url
        )

    # Show site selector in sidebar
    site_names = settings.get_site_names()
    display_names = settings.get_site_display_names()

    # Display site buttons
    st.sidebar.markdown("🌐 **Sites**")
    for name in site_names:
        display = display_names.get(name, name)
        is_selected = (name == st.session_state.selected_site)

        if is_selected:
            st.sidebar.button(f"✓ {display}", key=f"site_{name}", disabled=True)
        else:
            if st.sidebar.button(display, key=f"site_{name}"):
                st.session_state.selected_site = name
                st.rerun()

    return settings.get_site(st.session_state.selected_site)


def display_site_header(site: SiteConfig):
    """Display site info in the sidebar."""
    st.sidebar.markdown(f"**Site:** {site.display_name}")
    st.sidebar.markdown("---")
