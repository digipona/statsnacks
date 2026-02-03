'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { Navbar } from '@/components/navbar';
import { KPICard } from '@/components/kpi-card';
import { DataTable } from '@/components/data-table';
import { ScatterChartComponent } from '@/components/charts/scatter-chart';
import { ExportButton } from '@/components/export-button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  KeywordData,
  AnalyzedKeyword,
  QueryPageData,
  analyzeKeywords,
  getQuickWins,
  getStrikingDistance,
  getCtrOpportunities,
  getHighVolumeOpportunities,
  comparePeriods,
  detectCannibalization,
  getCategorySummary,
} from '@/lib/keyword-analysis';
import { getComparisonRange, formatDateForApi } from '@/lib/date-utils';

const SITES = [
  { name: 'sextflirt', displayName: 'sextflirt.com' },
  { name: 'crushfling', displayName: 'crushfling.com' },
  { name: 'fanscritic', displayName: 'fanscritic.com' },
];

export default function KeywordsPage() {
  const { data: session, status } = useSession();
  const [selectedSite, setSelectedSite] = useState(SITES[0].name);
  const [queries, setQueries] = useState<KeywordData[]>([]);
  const [queryPages, setQueryPages] = useState<QueryPageData[]>([]);
  const [previousQueries, setPreviousQueries] = useState<KeywordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compareEnabled, setCompareEnabled] = useState(false);

  const endDate = new Date();
  const startDate = subDays(endDate, 30);
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  const comparisonRange = getComparisonRange(startDate, endDate);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const baseUrl = `/api/gsc?site=${selectedSite}&startDate=${startDateStr}&endDate=${endDateStr}`;

        // Fetch queries and query-page data
        const [queriesRes, queryPagesRes] = await Promise.all([
          fetch(`${baseUrl}&action=all-queries`),
          fetch(`${baseUrl}&action=queries-by-page`),
        ]);

        if (!queriesRes.ok) throw new Error('Failed to fetch queries');
        const queriesData = await queriesRes.json();
        setQueries(queriesData);

        if (queryPagesRes.ok) {
          setQueryPages(await queryPagesRes.json());
        }

        // Fetch comparison data if enabled
        if (compareEnabled) {
          const prevStartStr = formatDateForApi(comparisonRange.start);
          const prevEndStr = formatDateForApi(comparisonRange.end);
          const prevRes = await fetch(
            `/api/gsc?site=${selectedSite}&action=all-queries&startDate=${prevStartStr}&endDate=${prevEndStr}`
          );
          if (prevRes.ok) {
            setPreviousQueries(await prevRes.json());
          }
        } else {
          setPreviousQueries([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [status, selectedSite, startDateStr, endDateStr, compareEnabled, comparisonRange.start, comparisonRange.end]);

  // Memoized analysis
  const analyzed = useMemo(() => analyzeKeywords(queries), [queries]);
  const categorySummary = useMemo(() => getCategorySummary(queries), [queries]);
  const quickWins = useMemo(() => getQuickWins(queries), [queries]);
  const strikingDistance = useMemo(() => getStrikingDistance(queries), [queries]);
  const ctrOpportunities = useMemo(() => getCtrOpportunities(queries), [queries]);
  const highVolume = useMemo(() => getHighVolumeOpportunities(queries), [queries]);
  const periodComparison = useMemo(
    () => (compareEnabled ? comparePeriods(queries, previousQueries) : null),
    [queries, previousQueries, compareEnabled]
  );
  const cannibalization = useMemo(() => detectCannibalization(queryPages), [queryPages]);

  // Scatter chart data
  const scatterData = useMemo(
    () =>
      analyzed.slice(0, 500).map((k) => ({
        x: k.position,
        y: k.impressions,
        size: k.clicks,
        color: k.opportunity_score,
        label: k.query,
        category: k.category,
      })),
    [analyzed]
  );

  // Export sheets
  const exportSheets = useMemo(
    () => [
      { name: 'All Keywords', data: analyzed as unknown as Record<string, unknown>[] },
      { name: 'Quick Wins', data: quickWins as unknown as Record<string, unknown>[] },
      { name: 'Striking Distance', data: strikingDistance as unknown as Record<string, unknown>[] },
      { name: 'CTR Optimization', data: ctrOpportunities as unknown as Record<string, unknown>[] },
      { name: 'Cannibalization', data: cannibalization as unknown as Record<string, unknown>[] },
    ],
    [analyzed, quickWins, strikingDistance, ctrOpportunities, cannibalization]
  );

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

  const KeywordTable = ({ data, title }: { data: AnalyzedKeyword[]; title: string }) => (
    <DataTable
      data={data}
      columns={[
        { key: 'query', header: 'Keyword' },
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
        {
          key: 'opportunity_score',
          header: 'Score',
          align: 'right',
          format: (v) => v.toFixed(0),
        },
      ]}
      searchKey="query"
      searchPlaceholder="Search keywords..."
    />
  );

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
              <h1 className="text-3xl font-bold tracking-tight">Keyword Opportunities</h1>
              <p className="text-muted-foreground">
                SEO analysis for {selectedSiteConfig?.displayName} (Last 30 days)
              </p>
            </div>
            <ExportButton
              data={analyzed as unknown as Record<string, unknown>[]}
              filename={`keywords_${selectedSite}_${startDateStr}_${endDateStr}`}
              sheets={exportSheets}
              disabled={loading || analyzed.length === 0}
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
              <Skeleton className="h-[400px]" />
              <Skeleton className="h-[400px]" />
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  title="Quick Wins"
                  value={categorySummary['Quick Win'].toString()}
                  description="Position 4-10"
                />
                <KPICard
                  title="Striking Distance"
                  value={categorySummary['Striking Distance'].toString()}
                  description="Position 11-20"
                />
                <KPICard
                  title="CTR Opportunities"
                  value={categorySummary['CTR Optimization'].toString()}
                  description="Underperforming CTR"
                />
                <KPICard
                  title="Total Keywords"
                  value={analyzed.length.toLocaleString()}
                  description="Analyzed"
                />
              </div>

              {/* Scatter Chart */}
              {scatterData.length > 0 && (
                <ScatterChartComponent
                  data={scatterData}
                  title="Keyword Opportunity Matrix"
                  description="Keywords in the top-right (low position, high impressions) are your best opportunities. Green = high score, bubble size = clicks."
                  height={450}
                />
              )}

              {/* Opportunity Tabs */}
              <Tabs defaultValue="quick-wins" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="quick-wins" className="text-xs sm:text-sm">
                    Quick Wins
                  </TabsTrigger>
                  <TabsTrigger value="striking" className="text-xs sm:text-sm">
                    Striking Distance
                  </TabsTrigger>
                  <TabsTrigger value="ctr" className="text-xs sm:text-sm">
                    CTR Optimization
                  </TabsTrigger>
                  <TabsTrigger value="high-volume" className="text-xs sm:text-sm">
                    High Volume
                  </TabsTrigger>
                  <TabsTrigger value="comparison" className="text-xs sm:text-sm">
                    Comparison
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="quick-wins">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Wins</CardTitle>
                      <CardDescription>
                        Keywords ranking position 4-10 with 100+ impressions. These need minimal optimization to reach top 3.
                        Recommended: Optimize title tags, add internal links, improve content depth.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <KeywordTable data={quickWins} title="Quick Wins" />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="striking">
                  <Card>
                    <CardHeader>
                      <CardTitle>Striking Distance</CardTitle>
                      <CardDescription>
                        Keywords ranking position 11-20 with 50+ impressions. These need more effort but represent good opportunities.
                        Recommended: Create supporting content, build topic clusters, acquire backlinks.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <KeywordTable data={strikingDistance} title="Striking Distance" />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ctr">
                  <Card>
                    <CardHeader>
                      <CardTitle>CTR Optimization</CardTitle>
                      <CardDescription>
                        Keywords with good position but low CTR. Your rankings are fine, but people aren&apos;t clicking.
                        Recommended: Rewrite titles and meta descriptions, add rich snippets, test headline formats.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <KeywordTable data={ctrOpportunities} title="CTR Optimization" />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="high-volume">
                  <Card>
                    <CardHeader>
                      <CardTitle>High Volume Opportunities</CardTitle>
                      <CardDescription>
                        Keywords with 500+ impressions but poor position (20+). Big potential if you can improve rankings.
                        Recommended: Create comprehensive content, analyze competitors, build authority.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <KeywordTable data={highVolume} title="High Volume" />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="comparison">
                  <Card>
                    <CardHeader>
                      <CardTitle>Period Comparison</CardTitle>
                      <CardDescription>
                        {compareEnabled
                          ? 'Compare keyword performance between current and previous period.'
                          : 'Enable comparison to see ranking changes over time.'}
                      </CardDescription>
                      <button
                        onClick={() => setCompareEnabled(!compareEnabled)}
                        className={`mt-2 px-3 py-1 text-sm rounded-md ${
                          compareEnabled
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {compareEnabled ? 'Comparison Enabled' : 'Enable Comparison'}
                      </button>
                    </CardHeader>
                    <CardContent>
                      {periodComparison ? (
                        <div className="grid gap-6 md:grid-cols-2">
                          <div>
                            <h4 className="font-semibold mb-2 text-green-600">Improved Rankings ({periodComparison.improved.length})</h4>
                            {periodComparison.improved.length > 0 ? (
                              <div className="space-y-2">
                                {periodComparison.improved.slice(0, 10).map((k, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="truncate max-w-[200px]">{k.query}</span>
                                    <Badge variant="outline" className="text-green-600">
                                      +{k.position_change.toFixed(1)} pos
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No improved rankings found.</p>
                            )}

                            <h4 className="font-semibold mb-2 mt-6 text-blue-600">New Keywords ({periodComparison.new.length})</h4>
                            {periodComparison.new.length > 0 ? (
                              <div className="space-y-2">
                                {periodComparison.new.slice(0, 10).map((k, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="truncate max-w-[200px]">{k.query}</span>
                                    <span className="text-muted-foreground">{k.impressions} imp</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No new keywords found.</p>
                            )}
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 text-red-600">Declined Rankings ({periodComparison.declined.length})</h4>
                            {periodComparison.declined.length > 0 ? (
                              <div className="space-y-2">
                                {periodComparison.declined.slice(0, 10).map((k, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="truncate max-w-[200px]">{k.query}</span>
                                    <Badge variant="outline" className="text-red-600">
                                      {k.position_change.toFixed(1)} pos
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No declined rankings found.</p>
                            )}

                            <h4 className="font-semibold mb-2 mt-6 text-orange-600">Lost Keywords ({periodComparison.lost.length})</h4>
                            {periodComparison.lost.length > 0 ? (
                              <div className="space-y-2">
                                {periodComparison.lost.slice(0, 10).map((k, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="truncate max-w-[200px]">{k.query}</span>
                                    <span className="text-muted-foreground">{k.impressions} imp</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No lost keywords found.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Click &quot;Enable Comparison&quot; to analyze ranking changes.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Cannibalization Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Cannibalization</CardTitle>
                  <CardDescription>
                    Keywords where multiple pages on your site are competing for the same query.
                    This can hurt your rankings - consider consolidating content or using canonical tags.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {cannibalization.length > 0 ? (
                    <DataTable
                      data={cannibalization}
                      columns={[
                        { key: 'query', header: 'Keyword' },
                        {
                          key: 'page_count',
                          header: 'Competing Pages',
                          align: 'right',
                        },
                        {
                          key: 'total_clicks',
                          header: 'Total Clicks',
                          align: 'right',
                          format: (v) => v.toLocaleString(),
                        },
                        {
                          key: 'total_impressions',
                          header: 'Total Impressions',
                          align: 'right',
                          format: (v) => v.toLocaleString(),
                        },
                      ]}
                      searchKey="query"
                      searchPlaceholder="Search cannibalized keywords..."
                    />
                  ) : (
                    <p className="text-sm text-green-600">No significant keyword cannibalization detected.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
