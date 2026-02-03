/**
 * Keyword opportunity analysis algorithms.
 * Ported from Python src/utils/keyword_analysis.py
 */

// Expected CTR by position (industry benchmarks)
export const EXPECTED_CTR: Record<number, number> = {
  1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.07,
  6: 0.05, 7: 0.04, 8: 0.03, 9: 0.03, 10: 0.025,
  11: 0.02, 12: 0.018, 13: 0.016, 14: 0.014, 15: 0.012,
  16: 0.01, 17: 0.009, 18: 0.008, 19: 0.007, 20: 0.006
};

export type KeywordCategory =
  | 'Quick Win'
  | 'Striking Distance'
  | 'CTR Optimization'
  | 'Maintain Position'
  | 'High Volume Opportunity'
  | 'Monitor';

export interface KeywordData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface AnalyzedKeyword extends KeywordData {
  opportunity_score: number;
  category: KeywordCategory;
  expected_ctr: number;
  ctr_gap: number;
  potential_clicks: number;
  click_opportunity: number;
}

export interface QueryPageData extends KeywordData {
  page: string;
}

export interface CannibalizationResult {
  query: string;
  page_count: number;
  total_clicks: number;
  total_impressions: number;
  pages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    position: number;
  }>;
}

export interface PeriodComparisonResult {
  improved: MergedKeyword[];
  declined: MergedKeyword[];
  new: KeywordData[];
  lost: KeywordData[];
}

export interface MergedKeyword {
  query: string;
  clicks_current: number;
  clicks_previous: number;
  impressions_current: number;
  impressions_previous: number;
  position_current: number;
  position_previous: number;
  position_change: number;
  clicks_change: number;
  impressions_change: number;
}

/**
 * Get expected CTR for a given position.
 */
export function getExpectedCtr(position: number): number {
  const pos = Math.min(Math.max(Math.round(position), 1), 20);
  return EXPECTED_CTR[pos] ?? 0.005;
}

/**
 * Calculate opportunity score (0-100) for a keyword.
 * Higher score = better opportunity to target.
 *
 * Scoring breakdown:
 * - Position Score (0-40): Rewards keywords in "striking distance"
 * - Impression Score (0-30): Higher search volume = more opportunity
 * - CTR Gap Score (0-20): Underperforming CTR = optimization opportunity
 * - Click Validation (0-10): Already getting clicks = validated demand
 */
export function calculateOpportunityScore(keyword: KeywordData): number {
  const { position, impressions, ctr, clicks } = keyword;

  // Position Score (0-40 points)
  let positionScore: number;
  if (position >= 4 && position <= 10) {
    positionScore = 40; // Quick wins zone
  } else if (position >= 11 && position <= 20) {
    positionScore = 35; // Striking distance
  } else if (position <= 3) {
    positionScore = 15; // Already good, less opportunity
  } else if (position >= 21 && position <= 50) {
    positionScore = 25; // Potential with effort
  } else {
    positionScore = 5; // Long shot
  }

  // Impression Score (0-30 points) - logarithmic scale
  const impressionScore = impressions > 0
    ? Math.min(30, Math.log10(impressions) * 8)
    : 0;

  // CTR Gap Score (0-20 points)
  const expected = getExpectedCtr(position);
  let ctrScore: number;
  if (ctr < expected * 0.7) {
    ctrScore = 20; // Big optimization opportunity
  } else if (ctr < expected) {
    ctrScore = 15;
  } else {
    ctrScore = 5; // Already performing well
  }

  // Click Validation Score (0-10 points)
  const clickScore = Math.min(10, clicks / 5);

  return Math.round((positionScore + impressionScore + ctrScore + clickScore) * 10) / 10;
}

/**
 * Categorize keyword by opportunity type.
 */
export function categorizeKeyword(keyword: KeywordData): KeywordCategory {
  const { position, impressions, ctr } = keyword;
  const expectedCtr = getExpectedCtr(position);

  if (position >= 4 && position <= 10 && impressions >= 100) {
    return 'Quick Win';
  } else if (position >= 11 && position <= 20 && impressions >= 50) {
    return 'Striking Distance';
  } else if (position <= 10 && ctr < expectedCtr * 0.7) {
    return 'CTR Optimization';
  } else if (position <= 3) {
    return 'Maintain Position';
  } else if (impressions >= 500 && position > 20) {
    return 'High Volume Opportunity';
  } else {
    return 'Monitor';
  }
}

/**
 * Add opportunity analysis columns to keyword data.
 * Returns analyzed data sorted by opportunity score.
 */
export function analyzeKeywords(data: KeywordData[]): AnalyzedKeyword[] {
  if (data.length === 0) return [];

  return data
    .map((keyword) => {
      const opportunity_score = calculateOpportunityScore(keyword);
      const category = categorizeKeyword(keyword);
      const expected_ctr = getExpectedCtr(keyword.position);
      const ctr_gap = expected_ctr - keyword.ctr;
      const potential_clicks = Math.floor(keyword.impressions * 0.28);
      const click_opportunity = potential_clicks - keyword.clicks;

      return {
        ...keyword,
        opportunity_score,
        category,
        expected_ctr,
        ctr_gap,
        potential_clicks,
        click_opportunity,
      };
    })
    .sort((a, b) => b.opportunity_score - a.opportunity_score);
}

/**
 * Get keywords in positions 4-10 with good impression volume.
 * These are the lowest-hanging fruit - small optimizations can push to top 3.
 */
export function getQuickWins(data: KeywordData[], minImpressions = 100): AnalyzedKeyword[] {
  const analyzed = analyzeKeywords(data);
  return analyzed
    .filter(
      (k) => k.position >= 4 && k.position <= 10 && k.impressions >= minImpressions
    )
    .slice(0, 25);
}

/**
 * Get keywords in positions 11-20.
 * These need more effort but represent good opportunities.
 */
export function getStrikingDistance(data: KeywordData[], minImpressions = 50): AnalyzedKeyword[] {
  const analyzed = analyzeKeywords(data);
  return analyzed
    .filter(
      (k) => k.position >= 11 && k.position <= 20 && k.impressions >= minImpressions
    )
    .slice(0, 25);
}

/**
 * Get keywords with good position but low CTR.
 * These need title/description optimization.
 */
export function getCtrOpportunities(data: KeywordData[]): AnalyzedKeyword[] {
  const analyzed = analyzeKeywords(data);
  return analyzed
    .filter((k) => k.position <= 10 && k.ctr_gap > 0.02)
    .sort((a, b) => b.ctr_gap - a.ctr_gap)
    .slice(0, 25);
}

/**
 * Get keywords with high search volume but poor position.
 * These need significant content/link building investment.
 */
export function getHighVolumeOpportunities(data: KeywordData[], minImpressions = 500): AnalyzedKeyword[] {
  const analyzed = analyzeKeywords(data);
  return analyzed
    .filter((k) => k.position > 20 && k.impressions >= minImpressions)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);
}

/**
 * Compare keyword performance between two periods.
 */
export function comparePeriods(
  current: KeywordData[],
  previous: KeywordData[]
): PeriodComparisonResult {
  if (current.length === 0 && previous.length === 0) {
    return { improved: [], declined: [], new: [], lost: [] };
  }

  // Create lookup maps
  const currentMap = new Map(current.map((k) => [k.query, k]));
  const previousMap = new Map(previous.map((k) => [k.query, k]));

  // Find all unique queries
  const allQueries = new Set([...currentMap.keys(), ...previousMap.keys()]);

  const merged: MergedKeyword[] = [];
  const newKeywords: KeywordData[] = [];
  const lostKeywords: KeywordData[] = [];

  for (const query of allQueries) {
    const curr = currentMap.get(query);
    const prev = previousMap.get(query);

    if (curr && prev) {
      // Exists in both periods
      merged.push({
        query,
        clicks_current: curr.clicks,
        clicks_previous: prev.clicks,
        impressions_current: curr.impressions,
        impressions_previous: prev.impressions,
        position_current: curr.position,
        position_previous: prev.position,
        position_change: prev.position - curr.position, // Positive = improved
        clicks_change: curr.clicks - prev.clicks,
        impressions_change: curr.impressions - prev.impressions,
      });
    } else if (curr && !prev) {
      // New keyword
      newKeywords.push(curr);
    } else if (!curr && prev) {
      // Lost keyword
      lostKeywords.push(prev);
    }
  }

  // Improved: position change > 3 (moved up significantly)
  const improved = merged
    .filter((k) => k.position_change > 3)
    .sort((a, b) => b.position_change - a.position_change)
    .slice(0, 25);

  // Declined: position change < -3 (moved down significantly)
  const declined = merged
    .filter((k) => k.position_change < -3)
    .sort((a, b) => a.position_change - b.position_change)
    .slice(0, 25);

  // Sort new and lost by impressions
  const sortedNew = newKeywords
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);

  const sortedLost = lostKeywords
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);

  return {
    improved,
    declined,
    new: sortedNew,
    lost: sortedLost,
  };
}

/**
 * Detect keyword cannibalization (multiple pages ranking for same query).
 */
export function detectCannibalization(data: QueryPageData[]): CannibalizationResult[] {
  if (data.length === 0) return [];

  // Group by query
  const queryGroups = new Map<string, QueryPageData[]>();
  for (const item of data) {
    const existing = queryGroups.get(item.query) || [];
    existing.push(item);
    queryGroups.set(item.query, existing);
  }

  // Find queries with multiple pages
  const results: CannibalizationResult[] = [];
  for (const [query, pages] of queryGroups) {
    // Get unique pages
    const uniquePages = new Map<string, QueryPageData>();
    for (const page of pages) {
      const existing = uniquePages.get(page.page);
      if (!existing || page.impressions > existing.impressions) {
        uniquePages.set(page.page, page);
      }
    }

    if (uniquePages.size > 1) {
      const pageList = Array.from(uniquePages.values());
      results.push({
        query,
        page_count: uniquePages.size,
        total_clicks: pageList.reduce((sum, p) => sum + p.clicks, 0),
        total_impressions: pageList.reduce((sum, p) => sum + p.impressions, 0),
        pages: pageList.map((p) => ({
          page: p.page,
          clicks: p.clicks,
          impressions: p.impressions,
          position: p.position,
        })),
      });
    }
  }

  // Sort by total impressions
  return results.sort((a, b) => b.total_impressions - a.total_impressions);
}

/**
 * Get count of keywords in each category.
 */
export function getCategorySummary(data: KeywordData[]): Record<KeywordCategory, number> {
  const analyzed = analyzeKeywords(data);

  const summary: Record<KeywordCategory, number> = {
    'Quick Win': 0,
    'Striking Distance': 0,
    'CTR Optimization': 0,
    'Maintain Position': 0,
    'High Volume Opportunity': 0,
    'Monitor': 0,
  };

  for (const keyword of analyzed) {
    summary[keyword.category]++;
  }

  return summary;
}
