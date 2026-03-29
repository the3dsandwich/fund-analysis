const fs = require('fs');
const path = require('path');
const { SEARCH_API_URL, SEARCH_API_DATASOURCE, getCompanyForFundId, isTargetFund } = require('../config');

const DATA_DIR = path.join(__dirname, 'data');
const API_FUNDS_PATH = path.join(DATA_DIR, 'api-funds.json');
const TARGET_FUNDS_PATH = path.join(DATA_DIR, 'target-funds.json');
const CSV_PATH = path.join(DATA_DIR, 'fund-table.csv');

const DELAY_MS = 200; // small delay between API calls

const fetchPage = async (page) => {
  const body = {
    DataSource: SEARCH_API_DATASOURCE,
    Direction: 'desc',
    OrderBy: 'FMNAVD_NAV',
    Buy: false,
    Page: page,
    Query: { FUND_CURRENCY: ['USD'] },
  };

  const res = await fetch(SEARCH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`API returned ${res.status} on page ${page}`);
  }

  return res.json();
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const escapeCsv = (val) => {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

const main = async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('Fetching all USD funds from Cathay search API...\n');

  // Phase 1: Fetch all pages
  const firstPage = await fetchPage(0);
  const totalCount = firstPage.Count;
  const totalPages = Math.ceil(totalCount / 10);

  console.log(`Total USD funds: ${totalCount}`);
  console.log(`Pages to fetch: ${totalPages}\n`);

  const allFunds = [...firstPage.Results];

  for (let page = 1; page < totalPages; page++) {
    if (page % 20 === 0) {
      console.log(`  Fetching page ${page}/${totalPages}...`);
    }
    await sleep(DELAY_MS);
    try {
      const data = await fetchPage(page);
      allFunds.push(...data.Results);
    } catch (err) {
      console.error(`  Error on page ${page}: ${err.message}. Retrying...`);
      await sleep(1000);
      const data = await fetchPage(page);
      allFunds.push(...data.Results);
    }
  }

  console.log(`\nFetched ${allFunds.length} funds total.`);

  // Save raw API data
  const apiOutput = {
    fetchedAt: new Date().toISOString(),
    totalCount,
    funds: allFunds.map(f => ({
      id: f.CubFundId,
      name: f.FullName,
      currency: f.Currency,
      morningstarCategory: f.FMCategoryC_NameTC,
      starRating: f.StarRating_Inception,
      distributionFrequency: f.SJ_DIV_FREQ,
      currentYield: f.FMDividendx_CurrentYield,
      nav: f.FMNAVD_NAV,
      navDate: f.FMNAVD_DATE,
      return3M: f.FMRETURND_3M,
      return6M: f.FMRETURND_6M,
      return1Y: f.FMRETURND_1Y,
      return2Y: f.FMRETURND_2Y,
      return3Y: f.FMRETURND_3Y,
      returnYTD: f.FMRETURND_YTD,
      returnInception: f.FMRETURND_INCEPTION,
      riskLevel: f.RiskLevel_NameTC,
      stdDev: f.StandardDeviation_R1,
      sharpe: f.SharpeRatio_R1,
      beta: f.Betatoind_R1,
      tags: (f.Tags || []).map(t => t.Text),
    })),
  };

  fs.writeFileSync(API_FUNDS_PATH, JSON.stringify(apiOutput, null, 2));
  console.log(`Saved raw API data: ${API_FUNDS_PATH}`);

  // Phase 2: Filter to target companies
  const targetFunds = apiOutput.funds.filter(f => isTargetFund(f.id));
  targetFunds.forEach(f => {
    f.company = getCompanyForFundId(f.id);
  });

  const targetOutput = {
    fetchedAt: apiOutput.fetchedAt,
    totalUsdFunds: apiOutput.totalCount,
    targetFundCount: targetFunds.length,
    funds: targetFunds,
  };

  fs.writeFileSync(TARGET_FUNDS_PATH, JSON.stringify(targetOutput, null, 2));
  console.log(`Saved target funds: ${TARGET_FUNDS_PATH} (${targetFunds.length} funds)`);

  // Phase 3: Generate CSV
  const headers = [
    'ID', 'Name', 'Company', 'Morningstar Category', 'Currency',
    'NAV', 'NAV Date', '1yr Return %', 'Risk Level', 'Stars',
    'Yield %', 'Dist Freq', 'Std Dev', 'Sharpe', 'Beta',
  ];

  const rows = targetFunds.map(f => [
    f.id,
    f.name,
    f.company,
    f.morningstarCategory,
    f.currency,
    f.nav,
    f.navDate,
    f.return1Y != null ? f.return1Y.toFixed(2) : '',
    f.riskLevel,
    f.starRating || '',
    f.currentYield != null ? f.currentYield.toFixed(2) : '',
    f.distributionFrequency || '',
    f.stdDev != null ? f.stdDev.toFixed(2) : '',
    f.sharpe != null ? f.sharpe.toFixed(2) : '',
    f.beta != null ? f.beta.toFixed(2) : '',
  ]);

  const csv = [headers.map(escapeCsv).join(',')]
    .concat(rows.map(r => r.map(escapeCsv).join(',')))
    .join('\n');

  fs.writeFileSync(CSV_PATH, csv);
  console.log(`Saved CSV: ${CSV_PATH}`);

  // Summary stats
  const companyCounts = {};
  targetFunds.forEach(f => {
    companyCounts[f.company] = (companyCounts[f.company] || 0) + 1;
  });

  console.log('\n--- Summary ---');
  console.log(`Total USD funds on platform: ${apiOutput.totalCount}`);
  console.log(`Target company funds: ${targetFunds.length}`);
  console.log('\nFunds per company:');
  Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([company, count]) => {
      console.log(`  ${company}: ${count}`);
    });
};

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
