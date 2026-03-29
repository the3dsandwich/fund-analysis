const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { FUND_DETAIL_URL } = require('../config');

// Prerequisites check
const TARGET_FUNDS_PATH = path.join(__dirname, '..', 'fetch-fund-list', 'data', 'target-funds.json');
const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_PATH = path.join(DATA_DIR, 'detail-scrape.json');
const PROGRESS_PATH = path.join(DATA_DIR, 'progress.json');

const DELAY_MS = 1500;
const SAVE_EVERY = 25;
const MAX_RETRIES = 2;
const PAGE_TIMEOUT = 30000;

const checkPrerequisites = () => {
  if (!fs.existsSync(TARGET_FUNDS_PATH)) {
    console.error(`ERROR: Prerequisites not met.`);
    console.error(`Missing: ${TARGET_FUNDS_PATH}`);
    console.error(`Run 'node research/fetch-fund-list/index.js' first.`);
    process.exit(1);
  }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const loadProgress = () => {
  if (fs.existsSync(PROGRESS_PATH)) {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
  }
  return { completed: {}, lastIndex: -1 };
};

const saveProgress = (progress) => {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
};

const extractFundDetails = async (page) => {
  return page.evaluate(() => {
    const result = {};
    const pageText = document.body.textContent || '';

    // English name: find line with Latin characters near the top
    const bodyLines = document.body.innerText.split('\n').map(s => s.trim()).filter(Boolean);
    for (const line of bodyLines.slice(0, 30)) {
      if (/^[A-Za-z][\w\s&.()\-,'/]+$/.test(line) && line.length > 10) {
        result.englishName = line;
        break;
      }
    }

    // Fund type
    const fundTypeMatch = pageText.match(/基金類型[\s:：]*([^\n基投計風]+)/);
    if (fundTypeMatch) result.fundType = fundTypeMatch[1].trim();

    // Investment region
    const regionMatch = pageText.match(/投資區域[\s:：]*([^\n基投計風休]+)/);
    if (regionMatch) result.investmentRegion = regionMatch[1].trim();

    // Currency
    const currencyMatch = pageText.match(/計價幣別[\s:：]*([^\n\r，,]{1,10})/);
    if (currencyMatch) result.currency = currencyMatch[1].trim();

    // Fund Size (AUM) - pattern from existing fund-scraper
    const sizeMatch = pageText.match(/基金規模[^\d]*([\d,]+\.?\d*)\s*(百萬[^\s(]+|億[^\s(]+)/);
    if (sizeMatch) {
      result.fundSizeValue = parseFloat(sizeMatch[1].replace(/,/g, ''));
      result.fundSizeUnit = sizeMatch[2].trim();
      result.fundSizeRaw = sizeMatch[0].trim();
      const dateMatch = pageText.match(/基金規模[^\d]*[\d,]+\.?\d*\s*(?:百萬|億)[^\s(]*\s*\((\d{4}\/\d{2}\/\d{2})\)/);
      if (dateMatch) result.fundSizeDate = dateMatch[1];
    }

    // Distribution info
    const distMatch = pageText.match(/配息[\s:：]*([^\n年基投]{1,30})/);
    if (distMatch && !distMatch[1].includes('配息率') && !distMatch[1].includes('來源')) {
      result.distributionInfo = distMatch[1].trim();
    }

    // Top 5 holdings - look for "主要持股TOP5" section
    result.holdings = [];
    const holdingsMatch = pageText.match(/主要持股[^\n]*(?:\n[^\n]*){0,3}持股名稱[^\n]*比例([\s\S]*?)資料日期/);
    if (holdingsMatch) {
      const holdingsBlock = holdingsMatch[1];
      // Pattern: "Company Name,Sector,Country\nX.XX%"
      const lines = holdingsBlock.split('\n').map(s => s.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check if next line is a percentage
        const nextLine = lines[i + 1];
        if (nextLine && /^\d+\.?\d*%$/.test(nextLine) && line.length > 2 && !line.match(/^\d/)) {
          result.holdings.push({ name: line, weight: nextLine });
          i++; // skip the percentage line
        }
        if (result.holdings.length >= 5) break;
      }
    }

    // Fallback holdings: look for comma-separated format with percentages
    if (result.holdings.length === 0) {
      const altMatch = pageText.match(/持股名稱[\s\S]*?比例([\s\S]*?)(?:資料日期|$)/);
      if (altMatch) {
        const block = altMatch[1];
        const pctMatches = [...block.matchAll(/([\w\s,.\-&'()]+?)\s+(\d+\.?\d*%)/g)];
        for (const m of pctMatches.slice(0, 5)) {
          if (m[1].trim().length > 2) {
            result.holdings.push({ name: m[1].trim(), weight: m[2] });
          }
        }
      }
    }

    return result;
  });
};

const captureNavGraph = async (page) => {
  try {
    // Click the 淨值走勢 tab (#tab3)
    const tab3 = await page.$('a[href="#tab3"], [data-target="#tab3"], #tab3-tab');
    if (!tab3) {
      // Try finding by text content
      const tabs = await page.$$('a[role="tab"], .nav-link, .tab-link');
      for (const tab of tabs) {
        const text = await tab.textContent();
        if (text && text.includes('淨值走勢')) {
          await tab.click();
          break;
        }
      }
    } else {
      await tab3.click();
    }

    await page.waitForTimeout(1000);

    // Click the "全部" (All) range button
    const buttons = await page.$$('button, .btn, [role="button"]');
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.trim() === '全部') {
        await btn.click();
        break;
      }
    }

    await page.waitForTimeout(2000);

    // Find the chart container — look for canvas, svg, or img near the heading
    const chartEl = await page.$('.chart-container, .highcharts-container, canvas, svg.highcharts-root');
    if (chartEl) {
      const screenshot = await chartEl.screenshot({ type: 'png' });
      return screenshot.toString('base64');
    }

    // Fallback: try to find any sizable element in the tab3 area
    const tab3Content = await page.$('#tab3, [id*="tab3"]');
    if (tab3Content) {
      const innerChart = await tab3Content.$('canvas, svg, img[src*="chart"], .chart');
      if (innerChart) {
        const screenshot = await innerChart.screenshot({ type: 'png' });
        return screenshot.toString('base64');
      }
    }

    return null;
  } catch {
    return null;
  }
};

const scrapeFund = async (page, fundId) => {
  const url = FUND_DETAIL_URL + fundId;
  await page.goto(url, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });

  // Wait for key content to appear (text-based, like existing fund-scraper)
  try {
    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('基金規模') || text.includes('基金類型') || text.includes('計價幣別');
      },
      { timeout: 10000 }
    );
  } catch {
    // Continue anyway - some pages may have different structure
  }

  // Small extra wait for dynamic content
  await page.waitForTimeout(500);

  const details = await extractFundDetails(page);
  details.id = fundId;
  details.scrapedAt = new Date().toISOString();

  // Capture NAV trend graph
  details.navGraph = await captureNavGraph(page);

  return details;
};

const saveOutput = (results, fetchedAt) => {
  const output = {
    scrapedAt: new Date().toISOString(),
    apiFetchedAt: fetchedAt,
    totalScraped: Object.keys(results).length,
    funds: results,
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Saved: ${OUTPUT_PATH}`);
};

const main = async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  checkPrerequisites();

  const args = process.argv.slice(2);
  const sampleIdx = args.indexOf('--sample');
  const sampleSize = sampleIdx >= 0 ? parseInt(args[sampleIdx + 1]) : null;

  const targetData = JSON.parse(fs.readFileSync(TARGET_FUNDS_PATH, 'utf-8'));
  let fundIds = targetData.funds.map(f => f.id);

  if (sampleSize) {
    fundIds = fundIds.slice(0, sampleSize);
    console.log(`Sample mode: scraping ${sampleSize} funds\n`);
  }

  console.log(`Total funds to scrape: ${fundIds.length}`);

  // Load progress for resume
  const progress = loadProgress();
  const results = progress.completed || {};
  const startIdx = sampleSize ? 0 : (progress.lastIndex + 1);

  const remaining = fundIds.filter((id, i) => i >= startIdx && !results[id]);
  console.log(`Already completed: ${Object.keys(results).length}`);
  console.log(`Remaining: ${remaining.length}\n`);

  if (remaining.length === 0) {
    console.log('All funds already scraped. Use --fresh to re-scrape.');
    saveOutput(results, targetData.fetchedAt);
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  let scraped = 0;
  let errors = 0;

  for (let i = 0; i < fundIds.length; i++) {
    const fundId = fundIds[i];
    if (results[fundId]) continue;

    let retries = 0;
    let success = false;

    while (retries <= MAX_RETRIES && !success) {
      try {
        const details = await scrapeFund(page, fundId);
        results[fundId] = details;
        success = true;
        scraped++;

        const aum = details.fundSizeValue ? `${details.fundSizeValue} ${details.fundSizeUnit || ''}` : 'N/A';
        console.log(`[${scraped}/${remaining.length}] ${fundId} - AUM: ${aum} - ${details.fundType || 'N/A'}`);
      } catch (err) {
        retries++;
        if (retries > MAX_RETRIES) {
          console.error(`  FAILED ${fundId} after ${MAX_RETRIES} retries: ${err.message}`);
          results[fundId] = { id: fundId, error: err.message, scrapedAt: new Date().toISOString() };
          errors++;
        } else {
          console.log(`  Retry ${retries} for ${fundId}: ${err.message}`);
          await sleep(2000);
        }
      }
    }

    // Save progress periodically
    if (scraped % SAVE_EVERY === 0 && scraped > 0) {
      progress.completed = results;
      progress.lastIndex = i;
      saveProgress(progress);
      console.log(`  [Progress saved: ${Object.keys(results).length} funds]`);
    }

    if (!sampleSize) {
      await sleep(DELAY_MS);
    }
  }

  await browser.close();

  // Final save
  progress.completed = results;
  progress.lastIndex = fundIds.length - 1;
  saveProgress(progress);

  saveOutput(results, targetData.fetchedAt);

  console.log(`\n--- Done ---`);
  console.log(`Scraped: ${scraped}, Errors: ${errors}`);

  // Quick stats
  const withAum = Object.values(results).filter(r => r.fundSizeValue).length;
  const withHoldings = Object.values(results).filter(r => r.holdings && r.holdings.length > 0).length;
  console.log(`Funds with AUM: ${withAum}/${Object.keys(results).length}`);
  console.log(`Funds with holdings: ${withHoldings}/${Object.keys(results).length}`);
};

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
