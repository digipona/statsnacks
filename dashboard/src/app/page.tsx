'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { Navbar } from '@/components/navbar';
import { KPICard } from '@/components/kpi-card';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Site configs - in a real app these would come from an API
const SITES = [
  { name: 'sextflirt', displayName: 'sextflirt.com' },
  { name: 'crushfling', displayName: 'crushfling.com' },
  { name: 'fanscritic', displayName: 'fanscritic.com' },
];

interface SiteMetrics {
  sessions: number;
  pageviews: number;
  viewsPerSession: number;
  avgDuration: number;
  bounceRate: number;
  loading: boolean;
  error?: string;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [selectedSite, setSelectedSite] = useState(SITES[0].name);
  const [metrics, setMetrics] = useState<Record<string, SiteMetrics>>({});

  // Date range: last 30 days
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  useEffect(() => {
    if (status !== 'authenticated') return;

    // Fetch metrics for all sites
    SITES.forEach(async (site) => {
      setMetrics((prev) => ({
        ...prev,
        [site.name]: { ...prev[site.name], loading: true },
      }));

      try {
        const res = await fetch(
          `/api/ga4?site=${site.name}&action=overview&startDate=${startDate}&endDate=${endDate}`
        );

        if (!res.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const data = await res.json();
        const viewsPerSession = data.sessions > 0 ? data.pageviews / data.sessions : 0;

        setMetrics((prev) => ({
          ...prev,
          [site.name]: {
            sessions: data.sessions,
            pageviews: data.pageviews,
            viewsPerSession: Math.round(viewsPerSession * 100) / 100,
            avgDuration: data.avgDuration,
            bounceRate: data.bounceRate,
            loading: false,
          },
        }));
      } catch (error) {
        setMetrics((prev) => ({
          ...prev,
          [site.name]: {
            sessions: 0,
            pageviews: 0,
            viewsPerSession: 0,
            avgDuration: 0,
            bounceRate: 0,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }));
      }
    });
  }, [status, startDate, endDate]);

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
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Site performance overview for the last 30 days
            </p>
          </div>

          <Separator />

          <div className="space-y-8">
            {SITES.map((site) => {
              const siteMetrics = metrics[site.name];

              return (
                <div key={site.name}>
                  <h2 className="text-xl font-semibold mb-4">{site.displayName}</h2>

                  {siteMetrics?.error ? (
                    <Card>
                      <CardContent className="py-6">
                        <p className="text-sm text-red-500">Error: {siteMetrics.error}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                      <KPICard
                        title="Sessions"
                        value={
                          siteMetrics?.loading
                            ? '...'
                            : siteMetrics?.sessions?.toLocaleString() || '0'
                        }
                      />
                      <KPICard
                        title="Pageviews"
                        value={
                          siteMetrics?.loading
                            ? '...'
                            : siteMetrics?.pageviews?.toLocaleString() || '0'
                        }
                      />
                      <KPICard
                        title="Views/Session"
                        value={
                          siteMetrics?.loading
                            ? '...'
                            : siteMetrics?.viewsPerSession?.toFixed(2) || '0'
                        }
                      />
                      <KPICard
                        title="Avg Duration"
                        value={
                          siteMetrics?.loading
                            ? '...'
                            : `${siteMetrics?.avgDuration?.toFixed(0) || '0'}s`
                        }
                      />
                      <KPICard
                        title="Bounce Rate"
                        value={
                          siteMetrics?.loading
                            ? '...'
                            : `${siteMetrics?.bounceRate?.toFixed(1) || '0'}%`
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
