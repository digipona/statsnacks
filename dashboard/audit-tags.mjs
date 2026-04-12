import { google } from 'googleapis';
import { readFileSync } from 'fs';

const SERVICE_ACCOUNT = JSON.parse(readFileSync('./credentials/service-account.json', 'utf8'));
const GSC_SITE = 'sc-domain:crushfling.com';

const auth = new google.auth.GoogleAuth({
  credentials: SERVICE_ACCOUNT,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

const searchconsole = google.searchconsole({ version: 'v1', auth });

const today = new Date();
const daysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

async function queryGSC(dimensions, rowLimit, startDate, endDate) {
  const res = await searchconsole.searchanalytics.query({
    siteUrl: GSC_SITE,
    requestBody: { startDate, endDate, dimensions, rowLimit, dataState: 'final' },
  });
  return res.data.rows || [];
}

const PLATFORMS = ['snapchat','telegram','whatsapp','instagram','kik','discord','messenger','tiktok','facebook','twitter','x'];
const INTERESTS = ['sexting','sex','hookup','dirty','trading','affair','dates','fwb','one-night-stand','roleplay','gay'];

async function run() {
  const START = daysAgo(28);
  const END = daysAgo(1);

  console.log(`\nPLATFORM/TAG BREAKDOWN — ${START} → ${END}\n`);

  const pages = await queryGSC(['page'], 5000, START, END);

  // Categorize pages
  const platformOnly = {};   // /platform/
  const platformTag = {};    // /platform/tag/
  const tagOnly = {};        // /tag/ (interest as standalone)

  for (const r of pages) {
    const url = r.keys[0].replace('https://crushfling.com', '');

    // Match /platform/tag/ (but not paginated)
    for (const p of PLATFORMS) {
      for (const t of INTERESTS) {
        if (url === `/${p}/${t}/`) {
          const key = `/${p}/${t}/`;
          platformTag[key] = { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position };
        }
      }
      // Match /platform/ only
      if (url === `/${p}/`) {
        platformOnly[`/${p}/`] = { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position };
      }
    }
    // Match /tag/ only
    for (const t of INTERESTS) {
      if (url === `/${t}/`) {
        tagOnly[`/${t}/`] = { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position };
      }
    }
  }

  // Print platform-only pages
  console.log('='.repeat(90));
  console.log('  PLATFORM-ONLY PAGES (/platform/)');
  console.log('='.repeat(90));
  console.log(`${'Page'.padEnd(30)} ${'Clicks'.padStart(8)} ${'Impr'.padStart(10)} ${'CTR'.padStart(7)} ${'Pos'.padStart(6)}`);
  console.log('-'.repeat(64));

  const sortedPlatforms = Object.entries(platformOnly).sort((a, b) => b[1].clicks - a[1].clicks);
  for (const [url, d] of sortedPlatforms) {
    console.log(`${url.padEnd(30)} ${String(d.clicks).padStart(8)} ${String(d.impressions).padStart(10)} ${(d.ctr * 100).toFixed(1).padStart(6)}% ${d.position.toFixed(1).padStart(6)}`);
  }

  // Print all platform/tag combos grouped by platform
  console.log('\n' + '='.repeat(90));
  console.log('  PLATFORM + TAG PAGES (/platform/tag/)');
  console.log('='.repeat(90));

  for (const p of PLATFORMS) {
    const parentData = platformOnly[`/${p}/`];
    if (!parentData) continue;

    const tags = Object.entries(platformTag)
      .filter(([url]) => url.startsWith(`/${p}/`))
      .sort((a, b) => b[1].clicks - a[1].clicks);

    if (tags.length === 0) continue;

    const tagTotalClicks = tags.reduce((s, [, d]) => s + d.clicks, 0);
    const tagTotalImpr = tags.reduce((s, [, d]) => s + d.impressions, 0);

    console.log(`\n  /${p}/ — Parent: ${parentData.clicks} clicks, ${parentData.impressions} impr | Tags total: ${tagTotalClicks} clicks, ${tagTotalImpr} impr`);
    console.log(`  ${'Tag'.padEnd(25)} ${'Clicks'.padStart(8)} ${'Impr'.padStart(10)} ${'CTR'.padStart(7)} ${'Pos'.padStart(6)}  ${'% of parent clicks'.padStart(18)}`);
    console.log('  ' + '-'.repeat(78));

    for (const [url, d] of tags) {
      const tag = url.replace(`/${p}/`, '').replace('/', '');
      const pctOfParent = ((d.clicks / parentData.clicks) * 100).toFixed(0);
      console.log(`  ${tag.padEnd(25)} ${String(d.clicks).padStart(8)} ${String(d.impressions).padStart(10)} ${(d.ctr * 100).toFixed(1).padStart(6)}% ${d.position.toFixed(1).padStart(6)}  ${(pctOfParent + '%').padStart(18)}`);
    }
  }

  // Print standalone interest pages
  console.log('\n' + '='.repeat(90));
  console.log('  STANDALONE INTEREST PAGES (/tag/)');
  console.log('='.repeat(90));
  console.log(`${'Page'.padEnd(30)} ${'Clicks'.padStart(8)} ${'Impr'.padStart(10)} ${'CTR'.padStart(7)} ${'Pos'.padStart(6)}`);
  console.log('-'.repeat(64));
  const sortedTags = Object.entries(tagOnly).sort((a, b) => b[1].clicks - a[1].clicks);
  for (const [url, d] of sortedTags) {
    console.log(`${url.padEnd(30)} ${String(d.clicks).padStart(8)} ${String(d.impressions).padStart(10)} ${(d.ctr * 100).toFixed(1).padStart(6)}% ${d.position.toFixed(1).padStart(6)}`);
  }
  if (sortedTags.length === 0) console.log('  (none found)');

  // Redundancy analysis
  console.log('\n' + '='.repeat(90));
  console.log('  REDUNDANCY ANALYSIS — Tags that are likely redundant with parent');
  console.log('='.repeat(90));
  console.log('\n  Tags where the parent /platform/ page already ranks for the same queries');
  console.log('  and the tag adds "for {interest}" to an already-sexting-focused site:\n');

  // Now fetch query-level cannibalization between /platform/ and /platform/tag/
  const queriesByPage = await queryGSC(['query', 'page'], 25000, START, END);

  // For each platform, find queries where both /platform/ and /platform/tag/ rank
  for (const p of PLATFORMS) {
    const parentUrl = `https://crushfling.com/${p}/`;
    const tagUrls = INTERESTS.map(t => `https://crushfling.com/${p}/${t}/`);

    const parentQueries = new Map();
    const tagQueries = new Map(); // tag -> Map(query -> data)

    for (const r of queriesByPage) {
      const query = r.keys[0];
      const page = r.keys[1];

      if (page === parentUrl) {
        parentQueries.set(query, { clicks: r.clicks, impressions: r.impressions, position: r.position });
      }
      for (const t of INTERESTS) {
        const tagUrl = `https://crushfling.com/${p}/${t}/`;
        if (page === tagUrl) {
          if (!tagQueries.has(t)) tagQueries.set(t, new Map());
          tagQueries.get(t).set(query, { clicks: r.clicks, impressions: r.impressions, position: r.position });
        }
      }
    }

    for (const [tag, queries] of tagQueries) {
      let overlapCount = 0;
      let overlapImpr = 0;
      const overlaps = [];

      for (const [query, tagData] of queries) {
        if (parentQueries.has(query)) {
          overlapCount++;
          overlapImpr += tagData.impressions;
          const parentData = parentQueries.get(query);
          overlaps.push({ query, tagPos: tagData.position, parentPos: parentData.position, tagImpr: tagData.impressions, parentImpr: parentData.impressions });
        }
      }

      if (overlapCount >= 3) {
        const totalTagQueries = queries.size;
        const overlapPct = ((overlapCount / totalTagQueries) * 100).toFixed(0);
        console.log(`\n  /${p}/${tag}/ — ${overlapCount}/${totalTagQueries} queries overlap with /${p}/ (${overlapPct}%)`);

        const topOverlaps = overlaps.sort((a, b) => b.tagImpr - a.tagImpr).slice(0, 5);
        for (const o of topOverlaps) {
          const q = o.query.substring(0, 40);
          console.log(`    "${q}" → /${p}/ pos ${o.parentPos.toFixed(1)} | /${p}/${tag}/ pos ${o.tagPos.toFixed(1)}`);
        }
      }
    }
  }

  console.log('\n');
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
