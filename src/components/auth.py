"""Authentication helper for all pages."""

import os
import streamlit as st
import streamlit_authenticator as stauth


def get_authenticator():
    """Get configured authenticator instance."""
    credentials = {
        "usernames": {
            os.getenv("AUTH_USERNAME", "admin"): {
                "name": "Admin",
                "password": os.getenv("AUTH_PASSWORD_HASH", "")
            }
        }
    }

    return stauth.Authenticate(
        credentials,
        "statsnacks",
        os.getenv("AUTH_COOKIE_KEY", "default_secret_key"),
        cookie_expiry_days=30
    )


def require_auth():
    """
    Require authentication to access the page.
    Call this at the top of every page.
    Returns the authenticator for logout button.
    """
    authenticator = get_authenticator()
    authenticator.login(location='main')

    if st.session_state.get('authentication_status') == False:
        st.error("Username/password is incorrect")
        st.stop()
    if st.session_state.get('authentication_status') is None:
        st.warning("Please enter your username and password")
        st.stop()

    return authenticator
