import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GSCDataClient } from '@/lib/gsc-client';
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

  if (!siteConfig.gscSiteUrl) {
    return NextResponse.json({ error: 'GSC not configured for this site' }, { status: 400 });
  }

  try {
    const client = new GSCDataClient(siteConfig);

    switch (action) {
      case 'overview':
        const overview = await client.getSearchOverview(startDate, endDate);
        return NextResponse.json(overview);

      case 'queries':
        const queries = await client.getTopQueries(startDate, endDate);
        return NextResponse.json(queries);

      case 'pages':
        const pages = await client.getTopPages(startDate, endDate);
        return NextResponse.json(pages);

      case 'devices':
        const devices = await client.getDevices(startDate, endDate);
        return NextResponse.json(devices);

      case 'countries':
        const countries = await client.getCountries(startDate, endDate);
        return NextResponse.json(countries);

      case 'all-queries':
        const allQueries = await client.getAllQueries(startDate, endDate);
        return NextResponse.json(allQueries);

      case 'queries-by-page':
        const queryPages = await client.getQueriesByPage(startDate, endDate);
        return NextResponse.json(queryPages);

      case 'comparison': {
        const prevStartDate = searchParams.get('prevStartDate');
        const prevEndDate = searchParams.get('prevEndDate');
        if (!prevStartDate || !prevEndDate) {
          return NextResponse.json(
            { error: 'Missing comparison date parameters' },
            { status: 400 }
          );
        }
        const currentData = await client.getAllQueries(startDate, endDate);
        const previousData = await client.getAllQueries(prevStartDate, prevEndDate);
        return NextResponse.json({ current: currentData, previous: previousData });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('GSC API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
