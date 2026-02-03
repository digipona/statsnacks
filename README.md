# statsnacks

Analytics dashboard for Google Analytics 4 and Search Console with keyword opportunity analysis.

## Features

- **Traffic Overview** - Users, sessions, pageviews, traffic sources
- **Search Performance** - Clicks, impressions, CTR, average position
- **Conversions** - Event tracking and conversion metrics
- **Keyword Opportunities** - Quick wins, striking distance, CTR optimization

## Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template)

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CREDENTIALS_JSON` | Base64-encoded service account JSON |
| `SITES` | Comma-separated site names (e.g., `site1,site2`) |
| `SITE_<name>_GA4` | GA4 Property ID for each site |
| `SITE_<name>_GSC` | Search Console URL (e.g., `sc-domain:site.com`) |

### Generate Base64 Credentials

```bash
base64 -i service-account.json | tr -d '\n'
```

## Local Development

1. Clone the repo
2. Copy `.env.example` to `.env` and configure
3. Add `credentials/service-account.json`
4. Install dependencies: `pip install -r requirements.txt`
5. Run: `streamlit run src/app.py`
