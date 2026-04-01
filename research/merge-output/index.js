const fs = require('fs');
const path = require('path');
const { getCompanyForFundId } = require('../config');
const { categorize, CATEGORIES } = require('../categories');
const { assignShareClassInfo } = require('../share-classes');

// Prerequisites
const API_FUNDS_PATH = path.join(__dirname, '..', 'fetch-fund-list', 'data', 'target-funds.json');
const DETAIL_PATH = path.join(__dirname, '..', 'scrape-details', 'data', 'detail-scrape.json');
const OUTPUT_DIR = path.join(__dirname, 'output');
const MERGED_PATH = path.join(OUTPUT_DIR, 'merged-funds.json');
const CSV_PATH = path.join(OUTPUT_DIR, 'fund-table.csv');
const EDGE_CASES_PATH = path.join(OUTPUT_DIR, 'edge-cases.md');
const REPS_CSV_PATH = path.join(OUTPUT_DIR, 'category-representatives.csv');

const checkPrerequisites = () => {
  const missing = [];
  if (!fs.existsSync(API_FUNDS_PATH)) missing.push(API_FUNDS_PATH);
  if (!fs.existsSync(DETAIL_PATH)) missing.push(DETAIL_PATH);
  if (missing.length > 0) {
    console.error('ERROR: Prerequisites not met. Missing:');
    missing.forEach(p => console.error(`  ${p}`));
    console.error('\nRun the prior steps first:');
    console.error('  node research/fetch-fund-list/index.js');
    console.error('  node research/scrape-details/index.js');
    process.exit(1);
  }
};

const escapeCsv = (val) => {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

const normalizeAumToMillionsUsd = (value, unit) => {
  if (!value || !unit) return null;
  if (unit.includes('百萬美元')) return value;
  if (unit.includes('億美元')) return value * 100;
  return null;
};

const main = () => {
  checkPrerequisites();

  const apiData = JSON.parse(fs.readFileSync(API_FUNDS_PATH, 'utf-8'));
  const detailData = JSON.parse(fs.readFileSync(DETAIL_PATH, 'utf-8'));

  const detailMap = detailData.funds;

  const edgeCases = [];
  const merged = [];

  for (const apiFund of apiData.funds) {
    const detail = detailMap[apiFund.id] || {};
    const company = getCompanyForFundId(apiFund.id);

    // Categorize
    const { investmentCategory, macro } = categorize(apiFund.morningstarCategory, detail.investmentRegion);

    const fund = {
      id: apiFund.id,
      name: apiFund.name,
      englishName: detail.englishName || null,
      company,
      currency: apiFund.currency,

      // Categorization
      macro,
      investmentCategory,
      morningstarCategory: apiFund.morningstarCategory,

      // From detail page
      fundType: detail.fundType || null,
      investmentRegion: detail.investmentRegion || null,
      fundSizeValue: detail.fundSizeValue || null,
      fundSizeUnit: detail.fundSizeUnit || null,
      fundSizeDate: detail.fundSizeDate || null,
      fundSizeMillionsUsd: normalizeAumToMillionsUsd(detail.fundSizeValue, detail.fundSizeUnit),

      // From API
      nav: apiFund.nav,
      navDate: apiFund.navDate,
      return1Y: apiFund.return1Y,
      return3M: apiFund.return3M,
      returnYTD: apiFund.returnYTD,
      riskLevel: apiFund.riskLevel,
      starRating: apiFund.starRating,
      currentYield: apiFund.currentYield,
      distributionFrequency: apiFund.distributionFrequency,
      stdDev: apiFund.stdDev,
      sharpe: apiFund.sharpe,
      beta: apiFund.beta,

      // Holdings from detail page
      holdings: detail.holdings || [],

      // NAV trend graph (base64 PNG screenshot)
      navGraph: detail.navGraph || null,
    };

    merged.push(fund);

    // Track edge cases
    if (detail.error) {
      edgeCases.push({ type: 'SCRAPE_ERROR', id: fund.id, name: fund.name, error: detail.error });
    }
    if (!fund.fundSizeValue) {
      edgeCases.push({ type: 'MISSING_AUM', id: fund.id, name: fund.name });
    }
    if (fund.fundSizeUnit && !fund.fundSizeUnit.includes('美元')) {
      edgeCases.push({ type: 'NON_USD_AUM', id: fund.id, name: fund.name, unit: fund.fundSizeUnit });
    }
    if (fund.name.includes('已撤銷核備') || fund.name.includes('未申報生效')) {
      edgeCases.push({ type: 'WITHDRAWN', id: fund.id, name: fund.name });
    }
  }

  // Assign share-class info
  const shareClassInfo = assignShareClassInfo(merged);
  for (const fund of merged) {
    const info = shareClassInfo[fund.id];
    fund.isRepresentative = info.isRepresentative;
    fund.underlyingId = info.underlyingId;
    fund.siblingCount = info.siblingCount;
  }

  // --- JSON output: grouped by macro → investmentCategory ---
  const byCategory = {};
  for (const fund of merged) {
    if (!byCategory[fund.investmentCategory]) {
      byCategory[fund.investmentCategory] = {
        macro: fund.macro,
        fundCount: 0,
        uniqueCount: 0,
        funds: [],
      };
    }
    byCategory[fund.investmentCategory].fundCount++;
    if (fund.isRepresentative) byCategory[fund.investmentCategory].uniqueCount++;
    byCategory[fund.investmentCategory].funds.push(fund);
  }

  // Sort funds within each category: representatives first, then by AUM desc
  for (const cat of Object.values(byCategory)) {
    cat.funds.sort((a, b) => {
      if (a.isRepresentative !== b.isRepresentative) return a.isRepresentative ? -1 : 1;
      return (b.fundSizeMillionsUsd || 0) - (a.fundSizeMillionsUsd || 0);
    });
  }

  // Category summary
  const categorySummary = CATEGORIES.map(c => {
    const data = byCategory[c.name] || { fundCount: 0, uniqueCount: 0 };
    return {
      name: c.name,
      macro: c.macro,
      fundCount: data.fundCount,
      uniqueCount: data.uniqueCount,
      thin: data.uniqueCount <= 3,
    };
  });

  const mergedOutput = {
    generatedAt: new Date().toISOString(),
    apiFetchedAt: apiData.fetchedAt,
    detailScrapedAt: detailData.scrapedAt,
    totalFunds: merged.length,
    totalUnique: merged.filter(f => f.isRepresentative).length,
    categorySummary,
    categories: byCategory,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(MERGED_PATH, JSON.stringify(mergedOutput, null, 2));
  console.log(`Saved merged JSON: ${MERGED_PATH}`);

  // --- CSV: full fund table with new columns ---
  const headers = [
    'ID', 'Name', 'Company', 'Macro', 'Investment Category', 'Is Representative',
    'Sibling Count', 'AUM (M USD)', 'AUM Unit', 'AUM Date',
    'Morningstar Category', 'Fund Type', 'Region', 'NAV', 'NAV Date',
    '1yr Return %', '3mo Return %', 'YTD Return %', 'Risk Level',
    'Stars', 'Yield %', 'Dist Freq', 'Top Holdings',
  ];

  const rows = merged
    .sort((a, b) => (b.fundSizeMillionsUsd || 0) - (a.fundSizeMillionsUsd || 0))
    .map(f => [
      f.id,
      f.name,
      f.company,
      f.macro,
      f.investmentCategory,
      f.isRepresentative ? 'Y' : '',
      f.siblingCount,
      f.fundSizeMillionsUsd != null ? f.fundSizeMillionsUsd : '',
      f.fundSizeUnit || '',
      f.fundSizeDate || '',
      f.morningstarCategory || '',
      f.fundType || '',
      f.investmentRegion || '',
      f.nav,
      f.navDate,
      f.return1Y != null ? f.return1Y.toFixed(2) : '',
      f.return3M != null ? f.return3M.toFixed(2) : '',
      f.returnYTD != null ? f.returnYTD.toFixed(2) : '',
      f.riskLevel || '',
      f.starRating || '',
      f.currentYield != null ? f.currentYield.toFixed(2) : '',
      f.distributionFrequency || '',
      f.holdings.map(h => `${h.name} (${h.weight})`).join('; ').substring(0, 200),
    ]);

  const csv = [headers.map(escapeCsv).join(',')]
    .concat(rows.map(r => r.map(escapeCsv).join(',')))
    .join('\n');

  fs.writeFileSync(CSV_PATH, csv);
  console.log(`Saved CSV: ${CSV_PATH}`);

  // --- Category representatives CSV ---
  const repHeaders = [
    'Investment Category', 'Macro', 'Thin?', 'Unique Funds',
    'Rep 1 Name', 'Rep 1 Company', 'Rep 1 AUM ($M)', 'Rep 1 1Y Return', 'Rep 1 YTD', 'Rep 1 3M', 'Rep 1 Risk', 'Rep 1 Stars', 'Rep 1 Yield',
    'Rep 2 Name', 'Rep 2 Company', 'Rep 2 AUM ($M)', 'Rep 2 1Y Return', 'Rep 2 YTD', 'Rep 2 3M', 'Rep 2 Risk', 'Rep 2 Stars', 'Rep 2 Yield',
  ];

  const repFields = (rep) => {
    if (!rep) return Array(9).fill('');
    return [
      rep.name,
      rep.company,
      rep.fundSizeMillionsUsd != null ? rep.fundSizeMillionsUsd : '',
      rep.return1Y != null ? rep.return1Y.toFixed(2) : '',
      rep.returnYTD != null ? rep.returnYTD.toFixed(2) : '',
      rep.return3M != null ? rep.return3M.toFixed(2) : '',
      rep.riskLevel || '',
      rep.starRating || '',
      rep.currentYield != null ? rep.currentYield.toFixed(2) : '',
    ];
  };

  const repRows = CATEGORIES.map(catDef => {
    const cat = byCategory[catDef.name];
    if (!cat) {
      return [catDef.name, catDef.macro, 'Y', 0, ...Array(20).fill('')];
    }

    // Pick top 2 representatives by AUM (already sorted reps first)
    const reps = cat.funds
      .filter(f => f.isRepresentative)
      .sort((a, b) => (b.fundSizeMillionsUsd || 0) - (a.fundSizeMillionsUsd || 0))
      .slice(0, 2);

    const thin = cat.uniqueCount <= 3 ? 'Y' : '';

    return [
      catDef.name, catDef.macro, thin, cat.uniqueCount,
      ...repFields(reps[0]),
      ...repFields(reps[1]),
    ];
  });

  const repCsv = [repHeaders.map(escapeCsv).join(',')]
    .concat(repRows.map(r => r.map(escapeCsv).join(',')))
    .join('\n');

  fs.writeFileSync(REPS_CSV_PATH, repCsv);
  console.log(`Saved category representatives: ${REPS_CSV_PATH}`);

  // --- Edge cases report ---
  // Add thin categories
  for (const cs of categorySummary) {
    if (cs.thin && cs.uniqueCount > 0) {
      edgeCases.push({ type: 'THIN_CATEGORY', name: cs.name, count: cs.uniqueCount });
    }
  }

  const edgeMd = [
    '# Edge Cases Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total funds: ${merged.length}`,
    `Unique underlying funds: ${merged.filter(f => f.isRepresentative).length}`,
    `Investment categories: ${CATEGORIES.length}`,
    '',
  ];

  const grouped = {};
  for (const ec of edgeCases) {
    if (!grouped[ec.type]) grouped[ec.type] = [];
    grouped[ec.type].push(ec);
  }

  for (const [type, cases] of Object.entries(grouped)) {
    edgeMd.push(`## ${type} (${cases.length})`);
    edgeMd.push('');
    for (const c of cases.slice(0, 50)) {
      if (type === 'THIN_CATEGORY') {
        edgeMd.push(`- ${c.name}: ${c.count} unique fund(s)`);
      } else {
        const extra = c.error ? ` - ${c.error}` : c.unit ? ` - ${c.unit}` : '';
        edgeMd.push(`- ${c.id}: ${c.name}${extra}`);
      }
    }
    if (cases.length > 50) edgeMd.push(`- ... and ${cases.length - 50} more`);
    edgeMd.push('');
  }

  fs.writeFileSync(EDGE_CASES_PATH, edgeMd.join('\n'));
  console.log(`Saved edge cases: ${EDGE_CASES_PATH}`);

  // --- Summary ---
  console.log('\n--- Summary ---');
  console.log(`Total merged: ${merged.length}`);
  console.log(`Unique underlying: ${merged.filter(f => f.isRepresentative).length}`);
  console.log(`With AUM (USD): ${merged.filter(f => f.fundSizeMillionsUsd).length}`);
  console.log(`With holdings: ${merged.filter(f => f.holdings.length > 0).length}`);
  console.log(`Edge cases: ${edgeCases.length}`);
  for (const [type, cases] of Object.entries(grouped)) {
    console.log(`  ${type}: ${cases.length}`);
  }

  console.log('\n--- Categories ---');
  for (const cs of categorySummary) {
    const marker = cs.thin ? ' [THIN]' : '';
    console.log(`  ${cs.name}: ${cs.uniqueCount} unique / ${cs.fundCount} total${marker}`);
  }
};

main();
