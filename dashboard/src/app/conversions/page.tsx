'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { Navbar } from '@/components/navbar';
import { KPICard } from '@/components/kpi-card';
import { DataTable } from '@/components/data-table';
import { SearchTrendChart } from '@/components/charts/search-trend';
import { BarChartComponent } from '@/components/charts/bar-chart';
import { ExportButton } from '@/components/export-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const SITES = [
  { name: 'sextflirt', displayName: 'sextflirt.com' },
  { name: 'crushfling', displayName: 'crushfling.com' },
  { name: 'fanscritic', displayName: 'fanscritic.com' },
];

interface EventData {
  eventName: string;
  eventCount: number;
  eventValue: number;
}

interface EventTrendData {
  date: string;
  eventCount: number;
  conversions: number;
}

interface ConversionData {
  eventName: string;
  conversions: number;
  eventValue: number;
}

export default function ConversionsPage() {
  const { data: session, status } = useSession();
  const [selectedSite, setSelectedSite] = useState(SITES[0].name);
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventsTrend, setEventsTrend] = useState<EventTrendData[]>([]);
  const [conversions, setConversions] = useState<ConversionData[]>([]);
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

        const [eventsRes, trendRes, conversionsRes] = await Promise.all([
          fetch(`${baseUrl}&action=events`),
          fetch(`${baseUrl}&action=events-trend`),
          fetch(`${baseUrl}&action=conversions`),
        ]);

        if (eventsRes.ok) setEvents(await eventsRes.json());
        if (trendRes.ok) setEventsTrend(await trendRes.json());
        if (conversionsRes.ok) setConversions(await conversionsRes.json());
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

  // Calculate totals
  const totalEvents = events.reduce((sum, e) => sum + e.eventCount, 0);
  const totalConversions = conversions.reduce((sum, c) => sum + c.conversions, 0);
  const totalEventValue = events.reduce((sum, e) => sum + e.eventValue, 0);
  const uniqueEventTypes = events.length;

  // Transform data for charts
  const trendChartData = eventsTrend
    .map((d) => ({
      date: d.date,
      clicks: d.eventCount,
      impressions: d.conversions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const eventsBarData = events.slice(0, 10).map((e) => ({
    name: e.eventName,
    value: e.eventCount,
  }));

  const conversionsBarData = conversions
    .filter((c) => c.conversions > 0)
    .slice(0, 10)
    .map((c) => ({
      name: c.eventName,
      value: c.conversions,
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Conversions & Events</h1>
              <p className="text-muted-foreground">
                Event tracking for {selectedSiteConfig?.displayName} (Last 30 days)
              </p>
            </div>
            <ExportButton
              data={events as unknown as Record<string, unknown>[]}
              filename={`events_${selectedSite}_${startDate}_${endDate}`}
              disabled={loading || events.length === 0}
            />
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-[300px]" />
              <Skeleton className="h-[350px]" />
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  title="Total Events"
                  value={totalEvents.toLocaleString()}
                />
                <KPICard
                  title="Conversions"
                  value={totalConversions.toLocaleString()}
                />
                <KPICard
                  title="Event Types"
                  value={uniqueEventTypes.toString()}
                />
                <KPICard
                  title="Event Value"
                  value={`$${totalEventValue.toLocaleString()}`}
                />
              </div>

              {/* Events Trend */}
              {trendChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Events Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SearchTrendChart
                      data={trendChartData}
                      title=""
                    />
                  </CardContent>
                </Card>
              )}

              {/* Events and Conversions Row */}
              <div className="grid gap-6 md:grid-cols-2">
                {eventsBarData.length > 0 && (
                  <BarChartComponent
                    data={eventsBarData}
                    title="Events by Name"
                    orientation="horizontal"
                    height={350}
                  />
                )}
                {conversionsBarData.length > 0 && (
                  <BarChartComponent
                    data={conversionsBarData}
                    title="Top Conversion Events"
                    orientation="horizontal"
                    height={350}
                  />
                )}
              </div>

              {/* Events Table */}
              <Card>
                <CardHeader>
                  <CardTitle>All Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={events}
                    columns={[
                      { key: 'eventName', header: 'Event Name' },
                      {
                        key: 'eventCount',
                        header: 'Count',
                        align: 'right',
                        format: (v) => v.toLocaleString(),
                      },
                      {
                        key: 'eventValue',
                        header: 'Value',
                        align: 'right',
                        format: (v) => `$${v.toLocaleString()}`,
                      },
                    ]}
                    searchKey="eventName"
                    searchPlaceholder="Search events..."
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
