'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { Navbar } from '@/components/navbar';
import { KPICard } from '@/components/kpi-card';
import { DataTable } from '@/components/data-table';
import { SearchTrendChart } from '@/components/charts/search-trend';
import { PieChartComponent } from '@/components/charts/pie-chart';
import { BarChartComponent } from '@/components/charts/bar-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/export-utils';

const SITES = [
  { name: 'sextflirt', displayName: 'sextflirt.com' },
  { name: 'crushfling', displayName: 'crushfling.com' },
  { name: 'fanscritic', displayName: 'fanscritic.com' },
];

interface TrafficOverview {
  users: number;
  sessions: number;
  pageviews: number;
  bounceRate: number;
  avgDuration: number;
  trendData: Array<{
    date: string;
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    bounceRate: number;
    averageSessionDuration: number;
  }>;
}

interface SourceData {
  sessionDefaultChannelGrouping: string;
  sessions: number;
  activeUsers: number;
  bounceRate: number;
}

interface DeviceData {
  deviceCategory: string;
  sessions: number;
  activeUsers: number;
}

interface PageData {
  pagePath: string;
  screenPageViews: number;
  activeUsers: number;
  averageSessionDuration: number;
}

interface CountryData {
  country: string;
  sessions: number;
  activeUsers: number;
}

export default function TrafficPage() {
  const { data: session, status } = useSession();
  const [selectedSite, setSelectedSite] = useState(SITES[0].name);
  const [overview, setOverview] = useState<TrafficOverview | null>(null);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const baseUrl = `/api/ga4?site=${selectedSite}&startDate=${startDate}&endDate=${endDate}`;

        const [overviewRes, sourcesRes, devicesRes, pagesRes, countriesRes] = await Promise.all([
          fetch(`${baseUrl}&action=overview`),
          fetch(`${baseUrl}&action=sources`),
          fetch(`${baseUrl}&action=devices`),
          fetch(`${baseUrl}&action=pages`),
          fetch(`${baseUrl}&action=countries`),
        ]);

        if (!overviewRes.ok) throw new Error('Failed to fetch overview');
        setOverview(await overviewRes.json());

        if (sourcesRes.ok) setSources(await sourcesRes.json());
        if (devicesRes.ok) setDevices(await devicesRes.json());
        if (pagesRes.ok) setPages(await pagesRes.json());
        if (countriesRes.ok) setCountries(await countriesRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status, selectedSite, startDate, endDate]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/login');
  }

  const selectedSiteConfig = SITES.find((s) => s.name === selectedSite);

  // Transform data for charts
  const trendChartData = overview?.trendData.map((d) => ({
    date: d.date,
    clicks: d.sessions,
    impressions: d.screenPageViews,
  })) || [];

  const sourcePieData = sources.map((s) => ({
    name: s.sessionDefaultChannelGrouping,
    value: s.sessions,
  }));

  const devicePieData = devices.map((d) => ({
    name: d.deviceCategory,
    value: d.sessions,
  }));

  const pagesBarData = pages.slice(0, 10).map((p) => ({
    name: p.pagePath.length > 30 ? `...${p.pagePath.slice(-27)}` : p.pagePath,
    value: p.screenPageViews,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        sites={SITES}
        selectedSite={selectedSite}
        onSiteChange={setSelectedSite}
      />

      <main className="container py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Traffic Overview</h1>
            <p className="text-muted-foreground">
              Google Analytics data for {selectedSiteConfig?.displayName} (Last 30 days)
            </p>
          </div>

          <Separator />

          {error ? (
            <Card>
              <CardContent className="py-6">
                <p className="text-sm text-red-500">Error: {error}</p>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-[300px]" />
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[300px]" />
                <Skeleton className="h-[300px]" />
              </div>
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <KPICard
                  title="Users"
                  value={overview?.users?.toLocaleString() || '0'}
                />
                <KPICard
                  title="Sessions"
                  value={overview?.sessions?.toLocaleString() || '0'}
                />
                <KPICard
                  title="Pageviews"
                  value={overview?.pageviews?.toLocaleString() || '0'}
                />
                <KPICard
                  title="Bounce Rate"
                  value={`${overview?.bounceRate?.toFixed(1) || '0'}%`}
                />
                <KPICard
                  title="Avg Duration"
                  value={formatDuration(overview?.avgDuration || 0)}
                />
              </div>

              {/* Trend Chart */}
              {trendChartData.length > 0 && (
                <SearchTrendChart
                  data={trendChartData}
                  title="Traffic Trend"
                />
              )}

              {/* Sources and Devices Row */}
              <div className="grid gap-6 md:grid-cols-2">
                {sourcePieData.length > 0 && (
                  <PieChartComponent
                    data={sourcePieData}
                    title="Traffic Sources"
                    height={280}
                  />
                )}
                {devicePieData.length > 0 && (
                  <PieChartComponent
                    data={devicePieData}
                    title="Devices"
                    height={280}
                  />
                )}
              </div>

              {/* Top Pages */}
              {pagesBarData.length > 0 && (
                <BarChartComponent
                  data={pagesBarData}
                  title="Top Pages by Pageviews"
                  orientation="horizontal"
                  height={350}
                />
              )}

              {/* Countries Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Countries</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={countries}
                    columns={[
                      { key: 'country', header: 'Country' },
                      {
                        key: 'sessions',
                        header: 'Sessions',
                        align: 'right',
                        format: (v) => v.toLocaleString(),
                      },
                      {
                        key: 'activeUsers',
                        header: 'Users',
                        align: 'right',
                        format: (v) => v.toLocaleString(),
                      },
                    ]}
                    searchKey="country"
                    searchPlaceholder="Search countries..."
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
