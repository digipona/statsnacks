/**
 * GA4 Data API client.
 */

import { getGA4Client } from './google-auth';
import { SiteConfig } from './settings';

export interface TrafficOverview {
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

export class GA4DataClient {
  private propertyId: string;
  private client: ReturnType<typeof getGA4Client>;

  constructor(siteConfig: SiteConfig) {
    this.propertyId = siteConfig.ga4PropertyId;
    this.client = getGA4Client();
  }

  private get propertyPath(): string {
    return `properties/${this.propertyId}`;
  }

  /**
   * Run a GA4 report.
   */
  async runReport(params: {
    dimensions: string[];
    metrics: string[];
    startDate: string;
    endDate: string;
    orderBy?: string;
    limit?: number;
  }) {
    const requestBody: Record<string, unknown> = {
      dimensions: params.dimensions.map(name => ({ name })),
      metrics: params.metrics.map(name => ({ name })),
      dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
      limit: String(params.limit || 10000),
    };

    if (params.orderBy) {
      requestBody.orderBys = [{ metric: { metricName: params.orderBy }, desc: true }];
    }

    const response = await this.client.properties.runReport({
      property: this.propertyPath,
      requestBody,
    });

    const rows: Record<string, any>[] = [];
    for (const row of response.data.rows || []) {
      const rowData: Record<string, any> = {};
      params.dimensions.forEach((dim, i) => {
        rowData[dim] = row.dimensionValues?.[i]?.value || '';
      });
      params.metrics.forEach((met, i) => {
        const value = row.metricValues?.[i]?.value || '0';
        rowData[met] = parseFloat(value) || 0;
      });
      rows.push(rowData);
    }

    return rows;
  }

  /**
   * Get traffic overview for date range.
   */
  async getTrafficOverview(startDate: string, endDate: string): Promise<TrafficOverview> {
    const rows = await this.runReport({
      dimensions: ['date'],
      metrics: [
        'activeUsers',
        'sessions',
        'screenPageViews',
        'bounceRate',
        'averageSessionDuration',
      ],
      startDate,
      endDate,
    });

    if (rows.length === 0) {
      return {
        users: 0,
        sessions: 0,
        pageviews: 0,
        bounceRate: 0,
        avgDuration: 0,
        trendData: [],
      };
    }

    const totalUsers = rows.reduce((sum, r) => sum + r.activeUsers, 0);
    const totalSessions = rows.reduce((sum, r) => sum + r.sessions, 0);
    const totalPageviews = rows.reduce((sum, r) => sum + r.screenPageViews, 0);
    const avgBounceRate = rows.reduce((sum, r) => sum + r.bounceRate, 0) / rows.length;
    const avgDuration = rows.reduce((sum, r) => sum + r.averageSessionDuration, 0) / rows.length;

    // Sort by date
    const trendData = rows
      .map(r => ({
        date: r.date,
        activeUsers: r.activeUsers,
        sessions: r.sessions,
        screenPageViews: r.screenPageViews,
        bounceRate: r.bounceRate,
        averageSessionDuration: r.averageSessionDuration,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      users: Math.round(totalUsers),
      sessions: Math.round(totalSessions),
      pageviews: Math.round(totalPageviews),
      bounceRate: Math.round(avgBounceRate * 100 * 100) / 100, // percentage with 2 decimals
      avgDuration: Math.round(avgDuration * 10) / 10,
      trendData,
    };
  }

  /**
   * Get traffic sources breakdown.
   */
  async getTrafficSources(startDate: string, endDate: string) {
    return this.runReport({
      dimensions: ['sessionDefaultChannelGrouping'],
      metrics: ['sessions', 'activeUsers', 'bounceRate'],
      startDate,
      endDate,
      orderBy: 'sessions',
    });
  }

  /**
   * Get top pages by pageviews.
   */
  async getTopPages(startDate: string, endDate: string, limit = 20) {
    return this.runReport({
      dimensions: ['pagePath'],
      metrics: ['screenPageViews', 'activeUsers', 'averageSessionDuration'],
      startDate,
      endDate,
      orderBy: 'screenPageViews',
      limit,
    });
  }

  /**
   * Get device breakdown.
   */
  async getDevices(startDate: string, endDate: string) {
    return this.runReport({
      dimensions: ['deviceCategory'],
      metrics: ['sessions', 'activeUsers'],
      startDate,
      endDate,
      orderBy: 'sessions',
    });
  }

  /**
   * Get country breakdown.
   */
  async getCountries(startDate: string, endDate: string, limit = 10) {
    return this.runReport({
      dimensions: ['country'],
      metrics: ['sessions', 'activeUsers'],
      startDate,
      endDate,
      orderBy: 'sessions',
      limit,
    });
  }

  /**
   * Get browser breakdown.
   */
  async getBrowsers(startDate: string, endDate: string, limit = 10) {
    return this.runReport({
      dimensions: ['browser'],
      metrics: ['sessions', 'activeUsers'],
      startDate,
      endDate,
      orderBy: 'sessions',
      limit,
    });
  }

  /**
   * Get events breakdown by name.
   */
  async getEvents(startDate: string, endDate: string, limit = 50) {
    return this.runReport({
      dimensions: ['eventName'],
      metrics: ['eventCount', 'eventValue'],
      startDate,
      endDate,
      orderBy: 'eventCount',
      limit,
    });
  }

  /**
   * Get events trend over time.
   */
  async getEventsTrend(startDate: string, endDate: string) {
    return this.runReport({
      dimensions: ['date'],
      metrics: ['eventCount', 'conversions'],
      startDate,
      endDate,
    });
  }

  /**
   * Get conversion events.
   */
  async getConversions(startDate: string, endDate: string, limit = 20) {
    return this.runReport({
      dimensions: ['eventName'],
      metrics: ['conversions', 'eventValue'],
      startDate,
      endDate,
      orderBy: 'conversions',
      limit,
    });
  }
}
