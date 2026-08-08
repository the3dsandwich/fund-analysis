#!/usr/bin/env node
/**
 * Generates a synthetic fund-analysis snapshot for local UI/design preview.
 * No real scraping, no real Cathay data — every value below is randomized.
 * Output is gitignored (presentation/public/) and is NOT the real data pipeline.
 *
 * Usage: node demo-data/generate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'snapshots');

const COMPANIES = [
  'JPMorgan', 'Fidelity', 'Invesco', 'Allianz', 'UBS', 'Franklin Templeton',
  'Schroders', 'Aberdeen', 'Alliance Bernstein', 'Janus Henderson', 'BlackRock',
  'Ninety One', 'Morgan Stanley', 'Amundi', 'MFS', 'Goldman Sachs', 'Eastspring',
  'DWS', 'PIMCO', 'Pictet',
];

const RISK_LEVELS = ['保守型', '穩健型', '積極型'];
const DIST_FREQ = ['-', '-', '-', '月', '季', '年'];

// [macro, [categories...]]
const MACROS = [
  ['Equity - US', ['US Large Cap', 'US Small/Mid Cap']],
  ['Equity - Europe/Japan', ['Europe Equity', 'Japan Equity']],
  ['Equity - Asia', ['Asia ex-Japan Equity', 'China/Greater China Equity', 'India Equity']],
  ['Equity - Global', ['Global Equity']],
  ['Equity - EM', ['EM Equity', 'LatAm/Africa-ME Equity']],
  ['Equity - Sector', [
    'Sector - Technology', 'Sector - Healthcare', 'Sector - Biotech',
    'Sector - Gold & Precious Metals', 'Sector - Energy', 'Sector - Real Estate',
    'Sector - Financials', 'Sector - Infrastructure',
  ]],
  ['Bond - IG', ['USD IG Bond']],
  ['Bond - Flexible', ['USD Flexible/Multi-Sector Bond', 'Convertible Bond']],
  ['Bond - HY & EM', ['USD High Yield Bond', 'Global High Yield Bond', 'EM Debt - Hard Currency', 'Asia Bond']],
  ['Money Market', ['USD Short-Term / Money Market']],
  ['Balanced', ['USD Balanced - Conservative', 'USD Balanced - Moderate', 'USD Balanced - Aggressive']],
  ['Other', ['Alternative/Multi-Strategy']],
];

const THEME_WORDS = {
  'US Large Cap': 'US Growth', 'US Small/Mid Cap': 'US Small Cap',
  'Europe Equity': 'European Equity', 'Japan Equity': 'Japan Equity',
  'Asia ex-Japan Equity': 'Asia Pacific', 'China/Greater China Equity': 'Greater China',
  'India Equity': 'India Opportunities', 'Global Equity': 'Global Equity',
  'EM Equity': 'Emerging Markets', 'LatAm/Africa-ME Equity': 'Latin America',
  'Sector - Technology': 'Global Technology', 'Sector - Healthcare': 'Global Healthcare',
  'Sector - Biotech': 'Biotechnology', 'Sector - Gold & Precious Metals': 'Gold & Metals',
  'Sector - Energy': 'Global Energy', 'Sector - Real Estate': 'Global Real Estate',
  'Sector - Financials': 'Financials Opportunities', 'Sector - Infrastructure': 'Infrastructure',
  'USD IG Bond': 'USD Investment Grade Bond', 'USD Flexible/Multi-Sector Bond': 'Strategic Bond',
  'Convertible Bond': 'Convertible Securities', 'USD High Yield Bond': 'US High Yield',
  'Global High Yield Bond': 'Global High Yield', 'EM Debt - Hard Currency': 'EM Debt',
  'Asia Bond': 'Asian Bond', 'USD Short-Term / Money Market': 'USD Liquidity',
  'USD Balanced - Conservative': 'Conservative Allocation', 'USD Balanced - Moderate': 'Moderate Allocation',
  'USD Balanced - Aggressive': 'Growth Allocation', 'Alternative/Multi-Strategy': 'Multi-Strategy',
};

const SHARE_CLASSES = ['A-Acc', 'A-Inc', 'B-Acc', 'F-Acc'];

let seed = 42;
function rand() {
  // deterministic LCG so re-runs are reproducible
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const randFloat = (min, max, digits = 2) => Number((rand() * (max - min) + min).toFixed(digits));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const maybe = (probability, value) => (rand() < probability ? value : null);

let fundIdCounter = 1;
const nextFundId = () => `DEMO${String(fundIdCounter++).padStart(5, '0')}`;

// --- Minimal placeholder PNG "chart" generator -----------------------------
// Real navGraph values are Playwright screenshots of a Highcharts NAV chart.
// For this synthetic dataset we hand-roll a tiny PNG (raw RGB scanlines,
// zlib-deflated, wrapped in IHDR/IDAT/IEND chunks) so a handful of funds have
// something to click open in the modal — no canvas/image library needed.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makeChartPng(width, height, seedValue) {
  const bg = [248, 249, 250];
  const grid = [224, 224, 224];
  const line = [37, 99, 235];

  const stride = 1 + width * 3; // filter byte + RGB per pixel
  const raw = Buffer.alloc(height * stride);
  const setPixel = (x, y, color) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = Math.floor(y) * stride + 1 + Math.floor(x) * 3;
    raw[idx] = color[0];
    raw[idx + 1] = color[1];
    raw[idx + 2] = color[2];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) setPixel(x, y, bg);
  }
  for (let g = 1; g <= 3; g++) {
    const y = Math.floor((height / 4) * g);
    for (let x = 0; x < width; x++) setPixel(x, y, grid);
  }

  let chartSeed = seedValue;
  const chartRand = () => {
    chartSeed = (chartSeed * 1103515245 + 12345) & 0x7fffffff;
    return chartSeed / 0x7fffffff;
  };
  let y = height * (0.3 + chartRand() * 0.4);
  for (let x = 0; x < width; x++) {
    y = Math.max(6, Math.min(height - 6, y + (chartRand() - 0.5) * 6));
    setPixel(x, y - 1, line);
    setPixel(x, y, line);
    setPixel(x, y + 1, line);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB, no alpha
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);

  return png.toString('base64');
}

function makeUnderlyingFund(categoryName, macro) {
  const company = pick(COMPANIES);
  const theme = THEME_WORDS[categoryName] || categoryName;
  const aum = Math.round(Math.exp(randFloat(3.5, 11, 3))); // log-distributed, ~30 to ~60,000
  const return1Y = randFloat(-42, 38);
  const shareClassCount = pick([1, 1, 2, 2, 3, 4]);
  const repIndex = randInt(0, shareClassCount - 1);
  const underlyingId = `${company}|${aum}`;

  const funds = [];
  for (let i = 0; i < shareClassCount; i++) {
    const suffix = shareClassCount === 1 ? 'A-Acc' : SHARE_CLASSES[i % SHARE_CLASSES.length];
    const id = nextFundId();
    const isRepresentative = i === repIndex;
    // ~15% of representative funds get a placeholder chart, so the NAV-graph
    // thumbnail + modal have something real to show in this preview build.
    const navGraph = isRepresentative && rand() < 0.15 ? makeChartPng(260, 100, fundIdCounter) : null;
    funds.push({
      id,
      name: `${company} ${theme} Fund ${suffix}`,
      englishName: maybe(0.6, `${company} ${theme} Fund - ${suffix}`),
      company,
      currency: '美元',
      macro,
      investmentCategory: categoryName,
      morningstarCategory: categoryName,
      fundType: macro.startsWith('Bond') ? '債券型' : macro === 'Balanced' ? '平衡型' : '股票型',
      investmentRegion: null,
      fundSizeValue: aum,
      fundSizeUnit: '百萬美元',
      fundSizeDate: '2026/08/01',
      fundSizeMillionsUsd: aum,
      nav: randFloat(8, 320),
      navDate: '2026/08/08',
      return1Y,
      return3M: randFloat(-15, 15),
      returnYTD: randFloat(-28, 28),
      riskLevel: pick(RISK_LEVELS),
      starRating: maybe(0.85, randInt(1, 5)),
      currentYield: maybe(0.5, randFloat(0, 6)),
      distributionFrequency: pick(DIST_FREQ),
      stdDev: randFloat(4, 22),
      sharpe: randFloat(-1, 2),
      beta: maybe(0.7, randFloat(0.4, 1.3)),
      holdings: [],
      navGraph,
      isRepresentative,
      underlyingId,
      siblingCount: shareClassCount,
    });
  }
  return funds;
}

function buildSnapshot(date) {
  const categorySummary = [];
  const categories = {};

  for (const [macro, categoryNames] of MACROS) {
    for (const categoryName of categoryNames) {
      const underlyingCount = pick([1, 2, 2, 3, 3, 4]);
      let funds = [];
      for (let i = 0; i < underlyingCount; i++) {
        funds = funds.concat(makeUnderlyingFund(categoryName, macro));
      }
      const uniqueCount = underlyingCount;
      const thin = uniqueCount <= 3;

      categorySummary.push({ name: categoryName, macro, fundCount: funds.length, uniqueCount, thin });
      categories[categoryName] = { macro, fundCount: funds.length, uniqueCount, funds };
    }
  }

  const totalFunds = categorySummary.reduce((sum, c) => sum + c.fundCount, 0);
  const totalUnique = categorySummary.reduce((sum, c) => sum + c.uniqueCount, 0);

  return {
    generatedAt: `${date}T02:00:00.000Z`,
    apiFetchedAt: `${date}T02:00:00.000Z`,
    detailScrapedAt: `${date}T02:20:00.000Z`,
    totalFunds,
    totalUnique,
    categorySummary,
    categories,
  };
}

const today = new Date().toISOString().slice(0, 10);
const snapshot = buildSnapshot(today);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, `${today}.json`), JSON.stringify(snapshot));
fs.writeFileSync(
  path.join(OUT_DIR, 'manifest.json'),
  JSON.stringify({ generated: new Date().toISOString(), latest: today, snapshots: [{ date: today, category: 'daily' }] }, null, 2),
);

console.log(`Synthetic snapshot written: ${totalCountsMessage(snapshot)}`);
function totalCountsMessage(s) {
  return `${s.categorySummary.length} categories, ${s.totalUnique} unique funds, ${s.totalFunds} total — ${OUT_DIR}/${today}.json`;
}
