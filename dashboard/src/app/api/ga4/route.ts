import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GA4DataClient } from '@/lib/ga4-client';
import { settings } from '@/lib/settings';

export async function GET(request: NextRequest) {
  // Check auth
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const site = searchParams.get('site');
  const action = searchParams.get('action') || 'overview';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!site || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required parameters: site, startDate, endDate' },
      { status: 400 }
    );
  }

  const siteConfig = settings.getSite(site);
  if (!siteConfig) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  }

  if (!siteConfig.ga4PropertyId) {
    return NextResponse.json({ error: 'GA4 not configured for this site' }, { status: 400 });
  }

  try {
    const client = new GA4DataClient(siteConfig);

    switch (action) {
      case 'overview':
        const overview = await client.getTrafficOverview(startDate, endDate);
        return NextResponse.json(overview);

      case 'sources':
        const sources = await client.getTrafficSources(startDate, endDate);
        return NextResponse.json(sources);

      case 'pages':
        const pages = await client.getTopPages(startDate, endDate);
        return NextResponse.json(pages);

      case 'devices':
        const devices = await client.getDevices(startDate, endDate);
        return NextResponse.json(devices);

      case 'countries':
        const countries = await client.getCountries(startDate, endDate);
        return NextResponse.json(countries);

      case 'browsers':
        const browsers = await client.getBrowsers(startDate, endDate);
        return NextResponse.json(browsers);

      case 'events':
        const events = await client.getEvents(startDate, endDate);
        return NextResponse.json(events);

      case 'events-trend':
        const eventsTrend = await client.getEventsTrend(startDate, endDate);
        return NextResponse.json(eventsTrend);

      case 'conversions':
        const conversions = await client.getConversions(startDate, endDate);
        return NextResponse.json(conversions);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('GA4 API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
