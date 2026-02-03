/**
 * Google Search Console API client.
 */

import { getGSCClient } from './google-auth';
import { SiteConfig } from './settings';

export interface SearchOverview {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  trendData: Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

export interface QueryData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface PageData {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export class GSCDataClient {
  private siteUrl: string;
  private client: ReturnType<typeof getGSCClient>;

  constructor(siteConfig: SiteConfig) {
    this.siteUrl = siteConfig.gscSiteUrl;
    this.client = getGSCClient();
  }

  /**
   * Query Search Console API.
   */
  async query(params: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
    startRow?: number;
  }) {
    const response = await this.client.searchanalytics.query({
      siteUrl: this.siteUrl,
      requestBody: {
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: params.dimensions || ['query'],
        rowLimit: params.rowLimit || 25000,
        startRow: params.startRow || 0,
      },
    });

    const rows: Record<string, any>[] = [];
    const dims = params.dimensions || ['query'];

    for (const row of response.data.rows || []) {
      const rowData: Record<string, any> = {
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      };
      dims.forEach((dim, i) => {
        rowData[dim] = row.keys?.[i] || '';
      });
      rows.push(rowData);
    }

    return rows;
  }

  /**
   * Get search overview for date range.
   */
  async getSearchOverview(startDate: string, endDate: string): Promise<SearchOverview> {
    const rows = await this.query({
      startDate,
      endDate,
      dimensions: ['date'],
    });

    if (rows.length === 0) {
      return {
        clicks: 0,
        impressions: 0,
        ctr: 0,
        avgPosition: 0,
        trendData: [],
      };
    }

    const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
    const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);
    const avgPosition = rows.reduce((sum, r) => sum + r.position, 0) / rows.length;

    const trendData = rows
      .map(r => ({
        date: r.date,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
      avgPosition: Math.round(avgPosition * 10) / 10,
      trendData,
    };
  }

  /**
   * Get top queries by clicks.
   */
  async getTopQueries(startDate: string, endDate: string, limit = 500): Promise<QueryData[]> {
    const rows = await this.query({
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: limit,
    });

    return rows
      .map(r => ({
        query: r.query,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }

  /**
   * Get top pages by clicks.
   */
  async getTopPages(startDate: string, endDate: string, limit = 100): Promise<PageData[]> {
    const rows = await this.query({
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: limit,
    });

    return rows
      .map(r => ({
        page: r.page,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }

  /**
   * Get device breakdown.
   */
  async getDevices(startDate: string, endDate: string) {
    return this.query({
      startDate,
      endDate,
      dimensions: ['device'],
    });
  }

  /**
   * Get country breakdown.
   */
  async getCountries(startDate: string, endDate: string, limit = 20) {
    return this.query({
      startDate,
      endDate,
      dimensions: ['country'],
      rowLimit: limit,
    });
  }

  /**
   * Get all queries for keyword analysis (higher limit).
   */
  async getAllQueries(startDate: string, endDate: string): Promise<QueryData[]> {
    const rows = await this.query({
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: 25000,
    });

    return rows
      .map(r => ({
        query: r.query,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }))
      .sort((a, b) => b.impressions - a.impressions);
  }

  /**
   * Get query+page combinations for cannibalization detection.
   */
  async getQueriesByPage(startDate: string, endDate: string): Promise<Array<QueryData & { page: string }>> {
    const rows = await this.query({
      startDate,
      endDate,
      dimensions: ['query', 'page'],
      rowLimit: 25000,
    });

    return rows
      .map(r => ({
        query: r.query,
        page: r.page,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      }))
      .sort((a, b) => b.impressions - a.impressions);
  }
}
