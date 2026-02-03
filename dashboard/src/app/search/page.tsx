'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { Navbar } from '@/components/navbar';
import { KPICard } from '@/components/kpi-card';
import { DataTable } from '@/components/data-table';
import { SearchTrendChart } from '@/components/charts/search-trend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const SITES = [
  { name: 'sextflirt', displayName: 'sextflirt.com' },
  { name: 'crushfling', displayName: 'crushfling.com' },
  { name: 'fanscritic', displayName: 'fanscritic.com' },
];

interface SearchOverview {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  trendData: Array<{ date: string; clicks: number; impressions: number }>;
}

interface QueryData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageData {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export default function SearchPage() {
  const { data: session, status } = useSession();
  const [selectedSite, setSelectedSite] = useState(SITES[0].name);
  const [overview, setOverview] = useState<SearchOverview | null>(null);
  const [queries, setQueries] = useState<QueryData[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
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
        // Fetch overview
        const overviewRes = await fetch(
          `/api/gsc?site=${selectedSite}&action=overview&startDate=${startDate}&endDate=${endDate}`
        );
        if (!overviewRes.ok) throw new Error('Failed to fetch overview');
        const overviewData = await overviewRes.json();
        setOverview(overviewData);

        // Fetch queries
        const queriesRes = await fetch(
          `/api/gsc?site=${selectedSite}&action=queries&startDate=${startDate}&endDate=${endDate}`
        );
        if (!queriesRes.ok) throw new Error('Failed to fetch queries');
        const queriesData = await queriesRes.json();
        setQueries(queriesData);

        // Fetch pages
        const pagesRes = await fetch(
          `/api/gsc?site=${selectedSite}&action=pages&startDate=${startDate}&endDate=${endDate}`
        );
        if (!pagesRes.ok) throw new Error('Failed to fetch pages');
        const pagesData = await pagesRes.json();
        setPages(pagesData);
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
            <h1 className="text-3xl font-bold tracking-tight">Search Performance</h1>
            <p className="text-muted-foreground">
              Google Search Console data for {selectedSiteConfig?.displayName} (Last 30 days)
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
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading search data...</div>
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  title="Clicks"
                  value={overview?.clicks?.toLocaleString() || '0'}
                />
                <KPICard
                  title="Impressions"
                  value={overview?.impressions?.toLocaleString() || '0'}
                />
                <KPICard
                  title="CTR"
                  value={`${overview?.ctr?.toFixed(2) || '0'}%`}
                />
                <KPICard
                  title="Avg Position"
                  value={overview?.avgPosition?.toFixed(1) || '0'}
                />
              </div>

              {/* Trend Chart */}
              {overview?.trendData && overview.trendData.length > 0 && (
                <SearchTrendChart data={overview.trendData} />
              )}

              {/* Top Queries Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Search Queries</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={queries}
                    columns={[
                      { key: 'query', header: 'Query' },
                      {
                        key: 'clicks',
                        header: 'Clicks',
                        align: 'right',
                        format: (v) => v.toLocaleString(),
                      },
                      {
                        key: 'impressions',
                        header: 'Impressions',
                        align: 'right',
                        format: (v) => v.toLocaleString(),
                      },
                      {
                        key: 'ctr',
                        header: 'CTR',
                        align: 'right',
                        format: (v) => `${(v * 100).toFixed(2)}%`,
                      },
                      {
                        key: 'position',
                        header: 'Position',
                        align: 'right',
                        format: (v) => v.toFixed(1),
                      },
                    ]}
                    searchKey="query"
                    searchPlaceholder="Search queries..."
                  />
                </CardContent>
              </Card>

              {/* Top Pages Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={pages}
                    columns={[
                      {
                        key: 'page',
                        header: 'Page',
                        format: (v) => {
                          // Shorten URL for display
                          try {
                            const url = new URL(v);
                            return url.pathname;
                          } catch {
                            return v;
                          }
                        },
                      },
                      {
                        key: 'clicks',
                        header: 'Clicks',
                        align: 'right',
                        format: (v) => v.toLocaleString(),
                      },
                      {
                        key: 'impressions',
                        header: 'Impressions',
                        align: 'right',
                        format: (v) => v.toLocaleString(),
                      },
                      {
                        key: 'ctr',
                        header: 'CTR',
                        align: 'right',
                        format: (v) => `${(v * 100).toFixed(2)}%`,
                      },
                      {
                        key: 'position',
                        header: 'Position',
                        align: 'right',
                        format: (v) => v.toFixed(1),
                      },
                    ]}
                    searchKey="page"
                    searchPlaceholder="Search pages..."
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
