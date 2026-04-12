import { google } from 'googleapis';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT = JSON.parse(readFileSync('./credentials/service-account.json', 'utf8'));
const GSC_SITE = 'sc-domain:crushfling.com';

const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

const searchconsole = google.searchconsole({ version: 'v1', auth });

// Date helpers
const today = new Date();
const daysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const CURRENT_START = daysAgo(28);
const CURRENT_END = daysAgo(1);
const PREV_START = daysAgo(56);
const PREV_END = daysAgo(29);

async function queryGSC(dimensions, rowLimit, startDate, endDate) {
  const res = await searchconsole.searchanalytics.query({
    siteUrl: GSC_SITE,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      dataState: 'final',
    },
  });
  return res.data.rows || [];
}

// Expected CTR by position (industry benchmarks)
function expectedCTR(pos) {
  const rates = [0.32, 0.24, 0.18, 0.13, 0.10, 0.07, 0.05, 0.04, 0.03, 0.025];
  if (pos <= 10) return rates[Math.floor(pos) - 1] || 0.025;
  if (pos <= 20) return 0.01;
  return 0.005;
}

function section(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

async function run() {
  console.log(`\nCRUSHFLING GSC AUDIT`);
  console.log(`Current period: ${CURRENT_START} → ${CURRENT_END}`);
  console.log(`Previous period: ${PREV_START} → ${PREV_END}`);

  // Fetch all data in parallel
  const [
    currentQueries,
    prevQueries,
    currentPages,
    prevPages,
    queriesByPage,
  ] = await Promise.all([
    queryGSC(['query'], 5000, CURRENT_START, CURRENT_END),
    queryGSC(['query'], 5000, PREV_START, PREV_END),
    queryGSC(['page'], 1000, CURRENT_START, CURRENT_END),
    queryGSC(['page'], 1000, PREV_START, PREV_END),
    queryGSC(['query', 'page'], 10000, CURRENT_START, CURRENT_END),
  ]);

  // ── OVERVIEW ──
  section('OVERVIEW');
  const totalClicks = currentQueries.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = currentQueries.reduce((s, r) => s + r.impressions, 0);
  const prevTotalClicks = prevQueries.reduce((s, r) => s + r.clicks, 0);
  const prevTotalImpressions = prevQueries.reduce((s, r) => s + r.impressions, 0);
  const clickChange = ((totalClicks - prevTotalClicks) / (prevTotalClicks || 1) * 100).toFixed(1);
  const impChange = ((totalImpressions - prevTotalImpressions) / (prevTotalImpressions || 1) * 100).toFixed(1);

  console.log(`Total clicks:      ${totalClicks.toLocaleString()} (${clickChange > 0 ? '+' : ''}${clickChange}%)`);
  console.log(`Total impressions: ${totalImpressions.toLocaleString()} (${impChange > 0 ? '+' : ''}${impChange}%)`);
  console.log(`Avg CTR:           ${(totalClicks / (totalImpressions || 1) * 100).toFixed(2)}%`);
  console.log(`Unique queries:    ${currentQueries.length}`);
  console.log(`Indexed pages:     ${currentPages.length}`);

  // ── TOP 20 QUERIES BY CLICKS ──
  section('TOP 20 QUERIES (by clicks)');
  const topQueries = [...currentQueries].sort((a, b) => b.clicks - a.clicks).slice(0, 20);
  console.log(`${'Query'.padEnd(50)} ${'Clicks'.padStart(8)} ${'Impr'.padStart(8)} ${'CTR'.padStart(7)} ${'Pos'.padStart(6)}`);
  console.log('-'.repeat(82));
  for (const r of topQueries) {
    const q = r.keys[0].substring(0, 48);
    console.log(`${q.padEnd(50)} ${String(r.clicks).padStart(8)} ${String(r.impressions).padStart(8)} ${(r.ctr * 100).toFixed(1).padStart(6)}% ${r.position.toFixed(1).padStart(6)}`);
  }

  // ── TOP 20 PAGES BY CLICKS ──
  section('TOP 20 PAGES (by clicks)');
  const topPages = [...currentPages].sort((a, b) => b.clicks - a.clicks).slice(0, 20);
  console.log(`${'Page'.padEnd(60)} ${'Clicks'.padStart(8)} ${'Impr'.padStart(8)} ${'CTR'.padStart(7)} ${'Pos'.padStart(6)}`);
  console.log('-'.repeat(92));
  for (const r of topPages) {
    const url = r.keys[0].replace('https://crushfling.com', '').substring(0, 58);
    console.log(`${url.padEnd(60)} ${String(r.clicks).padStart(8)} ${String(r.impressions).padStart(8)} ${(r.ctr * 100).toFixed(1).padStart(6)}% ${r.position.toFixed(1).padStart(6)}`);
  }

  // ── QUICK WINS (pos 4-20, 50+ impressions) ──
  section('QUICK WINS — Position 4-20, 50+ impressions');
  const quickWins = currentQueries
    .filter(r => r.position >= 4 && r.position <= 20 && r.impressions >= 50)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30);
  console.log(`${'Query'.padEnd(50)} ${'Clicks'.padStart(8)} ${'Impr'.padStart(8)} ${'CTR'.padStart(7)} ${'Pos'.padStart(6)}`);
  console.log('-'.repeat(82));
  for (const r of quickWins) {
    const q = r.keys[0].substring(0, 48);
    console.log(`${q.padEnd(50)} ${String(r.clicks).padStart(8)} ${String(r.impressions).padStart(8)} ${(r.ctr * 100).toFixed(1).padStart(6)}% ${r.position.toFixed(1).padStart(6)}`);
  }

  // ── CTR PROBLEMS (pos 1-5 but CTR below expected) ──
  section('CTR PROBLEMS — Ranking well but underperforming CTR');
  const ctrProblems = currentQueries
    .filter(r => {
      const exp = expectedCTR(r.position);
      return r.position <= 5 && r.ctr < exp * 0.6 && r.impressions >= 100;
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);
  console.log(`${'Query'.padEnd(45)} ${'Pos'.padStart(5)} ${'CTR'.padStart(7)} ${'Exp CTR'.padStart(8)} ${'Impr'.padStart(8)} ${'Clicks'.padStart(8)}`);
  console.log('-'.repeat(84));
  for (const r of ctrProblems) {
    const q = r.keys[0].substring(0, 43);
    const exp = expectedCTR(r.position);
    console.log(`${q.padEnd(45)} ${r.position.toFixed(1).padStart(5)} ${(r.ctr * 100).toFixed(1).padStart(6)}% ${(exp * 100).toFixed(1).padStart(7)}% ${String(r.impressions).padStart(8)} ${String(r.clicks).padStart(8)}`);
  }

  // ── DECLINING KEYWORDS ──
  section('BIGGEST DECLINERS — Keywords losing position/clicks');
  const prevQueryMap = new Map();
  for (const r of prevQueries) prevQueryMap.set(r.keys[0], r);

  const decliners = currentQueries
    .filter(r => {
      const prev = prevQueryMap.get(r.keys[0]);
      return prev && prev.clicks > 5;
    })
    .map(r => {
      const prev = prevQueryMap.get(r.keys[0]);
      return {
        query: r.keys[0],
        clicks: r.clicks,
        prevClicks: prev.clicks,
        clickDelta: r.clicks - prev.clicks,
        position: r.position,
        prevPosition: prev.position,
        posDelta: r.position - prev.position,
        impressions: r.impressions,
      };
    })
    .filter(r => r.clickDelta < -2 || r.posDelta > 2)
    .sort((a, b) => a.clickDelta - b.clickDelta)
    .slice(0, 25);

  console.log(`${'Query'.padEnd(45)} ${'Clicks'.padStart(12)} ${'Pos'.padStart(14)} ${'Impr'.padStart(8)}`);
  console.log(`${''.padEnd(45)} ${'now→prev'.padStart(12)} ${'now→prev'.padStart(14)}`);
  console.log('-'.repeat(82));
  for (const r of decliners) {
    const q = r.query.substring(0, 43);
    const clickStr = `${r.clicks}→${r.prevClicks}`;
    const posStr = `${r.position.toFixed(1)}→${r.prevPosition.toFixed(1)}`;
    console.log(`${q.padEnd(45)} ${clickStr.padStart(12)} ${posStr.padStart(14)} ${String(r.impressions).padStart(8)}`);
  }

  // ── RISING KEYWORDS ──
  section('BIGGEST RISERS — Keywords gaining position/clicks');
  const risers = currentQueries
    .filter(r => {
      const prev = prevQueryMap.get(r.keys[0]);
      return prev && r.clicks > 5;
    })
    .map(r => {
      const prev = prevQueryMap.get(r.keys[0]);
      return {
        query: r.keys[0],
        clicks: r.clicks,
        prevClicks: prev.clicks,
        clickDelta: r.clicks - prev.clicks,
        position: r.position,
        prevPosition: prev.position,
        posDelta: prev.position - r.position,
        impressions: r.impressions,
      };
    })
    .filter(r => r.clickDelta > 2 || r.posDelta > 2)
    .sort((a, b) => b.clickDelta - a.clickDelta)
    .slice(0, 20);

  console.log(`${'Query'.padEnd(45)} ${'Clicks'.padStart(12)} ${'Pos'.padStart(14)} ${'Impr'.padStart(8)}`);
  console.log(`${''.padEnd(45)} ${'now→prev'.padStart(12)} ${'now→prev'.padStart(14)}`);
  console.log('-'.repeat(82));
  for (const r of risers) {
    const q = r.query.substring(0, 43);
    const clickStr = `${r.clicks}→${r.prevClicks}`;
    const posStr = `${r.position.toFixed(1)}→${r.prevPosition.toFixed(1)}`;
    console.log(`${q.padEnd(45)} ${clickStr.padStart(12)} ${posStr.padStart(14)} ${String(r.impressions).padStart(8)}`);
  }

  // ── CANNIBALIZATION ──
  section('KEYWORD CANNIBALIZATION — Queries ranking for multiple pages');
  const queryPages = new Map();
  for (const r of queriesByPage) {
    const query = r.keys[0];
    const page = r.keys[1];
    if (!queryPages.has(query)) queryPages.set(query, []);
    queryPages.get(query).push({ page, clicks: r.clicks, impressions: r.impressions, position: r.position, ctr: r.ctr });
  }

  const cannibalized = [];
  for (const [query, pages] of queryPages) {
    if (pages.length >= 2) {
      const totalImpr = pages.reduce((s, p) => s + p.impressions, 0);
      if (totalImpr >= 50) {
        cannibalized.push({ query, pages: pages.sort((a, b) => a.position - b.position), totalImpr });
      }
    }
  }
  cannibalized.sort((a, b) => b.totalImpr - a.totalImpr);

  for (const item of cannibalized.slice(0, 15)) {
    console.log(`\n  "${item.query}" (${item.pages.length} pages, ${item.totalImpr} total impressions)`);
    for (const p of item.pages) {
      const url = p.page.replace('https://crushfling.com', '');
      console.log(`    pos ${p.position.toFixed(1).padStart(5)} | ${String(p.clicks).padStart(4)} clicks | ${String(p.impressions).padStart(6)} impr | ${url}`);
    }
  }

  // ── UNDERPERFORMING PAGES (high impressions, low clicks) ──
  section('UNDERPERFORMING PAGES — High impressions, few clicks');
  const underperforming = currentPages
    .filter(r => r.impressions >= 100 && r.ctr < 0.01)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20);

  console.log(`${'Page'.padEnd(60)} ${'Impr'.padStart(8)} ${'Clicks'.padStart(8)} ${'CTR'.padStart(7)} ${'Pos'.padStart(6)}`);
  console.log('-'.repeat(92));
  for (const r of underperforming) {
    const url = r.keys[0].replace('https://crushfling.com', '').substring(0, 58);
    console.log(`${url.padEnd(60)} ${String(r.impressions).padStart(8)} ${String(r.clicks).padStart(8)} ${(r.ctr * 100).toFixed(1).padStart(6)}% ${r.position.toFixed(1).padStart(6)}`);
  }

  // ── PAGE TYPE BREAKDOWN ──
  section('TRAFFIC BY PAGE TYPE');
  const pageTypes = {
    'Homepage': (u) => u === '/' || u === '',
    'Profile /p/': (u) => u.startsWith('/p/'),
    'Search /search/': (u) => u.startsWith('/search/'),
    'Blog /blog/': (u) => u.startsWith('/blog/'),
    'Chat /chat/': (u) => u.startsWith('/chat/'),
    'Platform pages': (u) => /^\/(snapchat|instagram|kik|telegram|tiktok|discord|whatsapp|facebook|twitter|x)\//i.test(u),
    'Interest pages': (u) => /^\/(dating|friends|sexting|nudes|hookup|relationship)\//i.test(u),
    'Other': () => true,
  };

  const typeStats = {};
  for (const type of Object.keys(pageTypes)) typeStats[type] = { clicks: 0, impressions: 0, pages: 0 };

  for (const r of currentPages) {
    const url = r.keys[0].replace('https://crushfling.com', '');
    let matched = false;
    for (const [type, test] of Object.entries(pageTypes)) {
      if (!matched && type !== 'Other' && test(url)) {
        typeStats[type].clicks += r.clicks;
        typeStats[type].impressions += r.impressions;
        typeStats[type].pages++;
        matched = true;
      }
    }
    if (!matched) {
      typeStats['Other'].clicks += r.clicks;
      typeStats['Other'].impressions += r.impressions;
      typeStats['Other'].pages++;
    }
  }

  console.log(`${'Page Type'.padEnd(25)} ${'Pages'.padStart(6)} ${'Clicks'.padStart(8)} ${'Impressions'.padStart(12)} ${'CTR'.padStart(7)}`);
  console.log('-'.repeat(62));
  for (const [type, stats] of Object.entries(typeStats)) {
    if (stats.pages === 0) continue;
    const ctr = (stats.clicks / (stats.impressions || 1) * 100).toFixed(1);
    console.log(`${type.padEnd(25)} ${String(stats.pages).padStart(6)} ${String(stats.clicks).padStart(8)} ${String(stats.impressions).padStart(12)} ${ctr.padStart(6)}%`);
  }

  // ── NEW KEYWORDS (in current but not in previous) ──
  section('NEW KEYWORDS — Appearing this period (10+ clicks)');
  const newKeywords = currentQueries
    .filter(r => !prevQueryMap.has(r.keys[0]) && r.clicks >= 10)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20);

  console.log(`${'Query'.padEnd(50)} ${'Clicks'.padStart(8)} ${'Impr'.padStart(8)} ${'Pos'.padStart(6)}`);
  console.log('-'.repeat(75));
  for (const r of newKeywords) {
    const q = r.keys[0].substring(0, 48);
    console.log(`${q.padEnd(50)} ${String(r.clicks).padStart(8)} ${String(r.impressions).padStart(8)} ${r.position.toFixed(1).padStart(6)}`);
  }

  // ── LOST KEYWORDS (in previous but not in current) ──
  section('LOST KEYWORDS — Gone this period (had 10+ clicks before)');
  const currentQuerySet = new Set(currentQueries.map(r => r.keys[0]));
  const lostKeywords = prevQueries
    .filter(r => !currentQuerySet.has(r.keys[0]) && r.clicks >= 10)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20);

  console.log(`${'Query'.padEnd(50)} ${'Prev Clicks'.padStart(12)} ${'Prev Impr'.padStart(10)} ${'Prev Pos'.padStart(9)}`);
  console.log('-'.repeat(84));
  for (const r of lostKeywords) {
    const q = r.keys[0].substring(0, 48);
    console.log(`${q.padEnd(50)} ${String(r.clicks).padStart(12)} ${String(r.impressions).padStart(10)} ${r.position.toFixed(1).padStart(9)}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  AUDIT COMPLETE');
  console.log('='.repeat(70) + '\n');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
