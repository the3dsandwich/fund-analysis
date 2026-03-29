// Investment category mapping: Morningstar category + investmentRegion → our curated categories
//
// 41 investment categories grouped into 12 macros
// Each category = a distinct investment thesis

const CATEGORIES = [
  // EQUITY - Regional (11)
  { name: 'US Large Cap', macro: 'Equity - US' },
  { name: 'US Small/Mid Cap', macro: 'Equity - US' },
  { name: 'Europe Equity', macro: 'Equity - Europe/Japan' },
  { name: 'Japan Equity', macro: 'Equity - Europe/Japan' },
  { name: 'Asia ex-Japan Equity', macro: 'Equity - Asia' },
  { name: 'China / Greater China Equity', macro: 'Equity - Asia' },
  { name: 'India Equity', macro: 'Equity - Asia' },
  { name: 'ASEAN / Single-Country Asia', macro: 'Equity - Asia' },
  { name: 'Global Equity', macro: 'Equity - Global' },
  { name: 'EM Equity', macro: 'Equity - EM' },
  { name: 'LatAm / Africa-ME Equity', macro: 'Equity - EM' },

  // EQUITY - Sector (13)
  { name: 'Sector - Technology', macro: 'Equity - Sector' },
  { name: 'Sector - Healthcare', macro: 'Equity - Sector' },
  { name: 'Sector - Biotech', macro: 'Equity - Sector' },
  { name: 'Sector - Gold & Precious Metals', macro: 'Equity - Sector' },
  { name: 'Sector - Natural Resources & Mining', macro: 'Equity - Sector' },
  { name: 'Sector - Energy', macro: 'Equity - Sector' },
  { name: 'Sector - Clean Energy & ESG', macro: 'Equity - Sector' },
  { name: 'Sector - Consumer & Brands', macro: 'Equity - Sector' },
  { name: 'Sector - Real Estate', macro: 'Equity - Sector' },
  { name: 'Sector - Financials', macro: 'Equity - Sector' },
  { name: 'Sector - Utilities', macro: 'Equity - Sector' },
  { name: 'Sector - Infrastructure', macro: 'Equity - Sector' },
  { name: 'Sector - Agriculture', macro: 'Equity - Sector' },

  // BOND (11)
  { name: 'USD Investment Grade Bond', macro: 'Bond - IG' },
  { name: 'USD Short-Term / Money Market', macro: 'Money Market' },
  { name: 'USD Flexible / Multi-Sector Bond', macro: 'Bond - Flexible' },
  { name: 'USD High Yield Bond', macro: 'Bond - HY & EM' },
  { name: 'Global High Yield Bond', macro: 'Bond - HY & EM' },
  { name: 'Europe Bond (hedged)', macro: 'Bond - IG' },
  { name: 'EM Debt - Hard Currency', macro: 'Bond - HY & EM' },
  { name: 'EM Debt - Local Currency', macro: 'Bond - HY & EM' },
  { name: 'Asia Bond', macro: 'Bond - IG' },
  { name: 'India / Niche EM Bond', macro: 'Bond - IG' },
  { name: 'Convertible Bond', macro: 'Other' },

  // BALANCED / OTHER (6)
  { name: 'USD Balanced - Conservative', macro: 'Balanced' },
  { name: 'USD Balanced - Moderate', macro: 'Balanced' },
  { name: 'USD Balanced - Aggressive', macro: 'Balanced' },
  { name: 'Asia Balanced', macro: 'Balanced' },
  { name: 'Global Balanced (non-USD hedged)', macro: 'Balanced' },
  { name: 'Alternative / Multi-Strategy', macro: 'Other' },
];

// Region keywords for routing "其他股票" and "其他債券"
const EUROPE_REGIONS = ['歐洲', '歐元區', '北歐', '德國', '新興歐洲', '英國', '歐洲不包括英國'];
const JAPAN_REGIONS = ['日本'];
const ASIA_REGIONS = ['亞太區', '亞太區不包括日本', '亞太區不包括日本及澳洲', '亞太區不包括澳洲'];
const CHINA_REGIONS = ['中國', '大中華', '香港'];
const INDIA_REGIONS = ['印度'];
const ASEAN_REGIONS = ['泰國', '印尼', '南韓', '東協國家'];
const EM_REGIONS = ['金磚四國', '歐非中東', '印度及中國', '新興亞洲', '全球新興市場', '俄羅斯及CIS'];
const LATAM_REGIONS = ['拉丁美洲'];
const GLOBAL_REGIONS = ['全球', '全球不包括美國'];
const US_REGIONS = ['美國'];

const findCategory = (name) => {
  const found = CATEGORIES.find(c => c.name === name);
  if (!found) throw new Error(`Category not found: ${name}`);
  return { investmentCategory: found.name, macro: found.macro };
};

const routeByRegion = (region, assetType) => {
  if (!region || region === 'N/A' || region === '-') return assetType === 'equity' ? 'Global Equity' : 'USD Investment Grade Bond';

  if (assetType === 'equity') {
    if (EUROPE_REGIONS.some(r => region.includes(r))) return 'Europe Equity';
    if (JAPAN_REGIONS.some(r => region === r)) return 'Japan Equity';
    if (US_REGIONS.some(r => region === r)) return 'US Large Cap';
    if (CHINA_REGIONS.some(r => region.includes(r))) return 'China / Greater China Equity';
    if (INDIA_REGIONS.some(r => region === r)) return 'India Equity';
    if (ASEAN_REGIONS.some(r => region.includes(r))) return 'ASEAN / Single-Country Asia';
    if (ASIA_REGIONS.some(r => region.includes(r))) return 'Asia ex-Japan Equity';
    if (LATAM_REGIONS.some(r => region.includes(r))) return 'LatAm / Africa-ME Equity';
    if (EM_REGIONS.some(r => region.includes(r))) return 'EM Equity';
    if (GLOBAL_REGIONS.some(r => region.includes(r))) return 'Global Equity';
    return 'Global Equity';
  }

  if (assetType === 'bond') {
    if (EUROPE_REGIONS.some(r => region.includes(r))) return 'Europe Bond (hedged)';
    if (INDIA_REGIONS.some(r => region === r)) return 'India / Niche EM Bond';
    if (ASIA_REGIONS.some(r => region.includes(r))) return 'Asia Bond';
    return 'USD Investment Grade Bond';
  }

  return null;
};

const categorize = (morningstarCategory, investmentRegion) => {
  const cat = morningstarCategory || '';

  // --- Special routing for catch-all categories ---
  if (cat === '其他股票') {
    const name = routeByRegion(investmentRegion, 'equity');
    return findCategory(name);
  }
  if (cat === '其他債券') {
    const name = routeByRegion(investmentRegion, 'bond');
    return findCategory(name);
  }

  // --- Sector equity (check first -- most specific) ---
  if (cat.includes('產業股票 - 科技')) return findCategory('Sector - Technology');
  if (cat.includes('產業股票 - 健康護理')) return findCategory('Sector - Healthcare');
  if (cat.includes('產業股票 - 生物科技')) return findCategory('Sector - Biotech');
  if (cat.includes('產業股票 - 貴金屬')) return findCategory('Sector - Gold & Precious Metals');
  if (cat.includes('產業股票 - 天然資源')) return findCategory('Sector - Natural Resources & Mining');
  if (cat.includes('產業股票 - 能源')) return findCategory('Sector - Energy');
  if (cat.includes('產業股票 - 環境生態') || cat.includes('產業股票 - 替代能源')) return findCategory('Sector - Clean Energy & ESG');
  if (cat.includes('產業股票 - 消費品')) return findCategory('Sector - Consumer & Brands');
  if (cat.includes('產業股票 - 金融服務')) return findCategory('Sector - Financials');
  if (cat.includes('產業股票 - 公用事業')) return findCategory('Sector - Utilities');
  if (cat.includes('產業股票 - 基礎建設')) return findCategory('Sector - Infrastructure');
  if (cat.includes('產業股票 - 農產品')) return findCategory('Sector - Agriculture');
  if (cat.includes('房地產')) return findCategory('Sector - Real Estate');

  // --- Balanced / Multi-Asset ---
  if (cat.includes('保守型股債混合')) return findCategory('USD Balanced - Conservative');
  if (cat.includes('平衡型股債混合') && cat.includes('美元')) return findCategory('USD Balanced - Moderate');
  if (cat.includes('積極型股債混合') || (cat.includes('靈活型股債混合') && cat.includes('美元'))) return findCategory('USD Balanced - Aggressive');
  if (cat.includes('亞洲股債混合') || cat.includes('全球新興市場股債混合')) return findCategory('Asia Balanced');
  if (cat.includes('歐元') && cat.includes('股債混合')) return findCategory('Global Balanced (non-USD hedged)');

  // --- Money Market ---
  if (cat.includes('貨幣市場') || cat === 'USD Ultra Short-Term Bond') return findCategory('USD Short-Term / Money Market');

  // --- Bond categories ---
  if (cat.includes('可轉換債券')) return findCategory('Convertible Bond');

  // High yield
  if (cat === '美元高收益債券') return findCategory('USD High Yield Bond');
  if (cat.includes('全球高收益債券')) return findCategory('Global High Yield Bond');
  if (cat.includes('亞洲高收益債券')) return findCategory('Asia Bond');

  // EM debt
  if (cat.includes('全球新興市場債券') && cat.includes('當地貨幣')) return findCategory('EM Debt - Local Currency');
  if (cat.includes('全球新興市場債券') || cat.includes('全球新興市場企業債券')) return findCategory('EM Debt - Hard Currency');

  // Asia bond
  if (cat.includes('亞洲債券') || cat.includes('伊斯蘭債券')) return findCategory('Asia Bond');

  // Europe bond
  if (cat.includes('歐元') && (cat.includes('債券') || cat.includes('高收益'))) return findCategory('Europe Bond (hedged)');

  // Flexible bond
  if (cat.includes('靈活策略') && (cat.includes('債券') || cat.includes('Bond'))) return findCategory('USD Flexible / Multi-Sector Bond');

  // Remaining bond categories → IG
  if (cat.includes('債券') || cat.includes('Bond')) {
    if (cat.includes('短期') || cat.includes('Short')) return findCategory('USD Short-Term / Money Market');
    return findCategory('USD Investment Grade Bond');
  }

  // --- Alternative ---
  if (cat.includes('Macro') || cat.includes('Multistrategy') || cat.includes('多元化新興市場')) return findCategory('Alternative / Multi-Strategy');

  // --- Regional equity (broadest patterns last) ---
  // US
  if (cat.includes('美國') || cat.includes('US ')) {
    if (cat.includes('小型') || cat.includes('中型')) return findCategory('US Small/Mid Cap');
    return findCategory('US Large Cap');
  }

  // China / Greater China
  if (cat.includes('中國') || cat.includes('大中華') || cat.includes('香港')) return findCategory('China / Greater China Equity');

  // India
  if (cat.includes('印度')) return findCategory('India Equity');

  // ASEAN / single-country Asia
  if (cat.includes('東協') || cat.includes('印尼') || cat.includes('韓國')) return findCategory('ASEAN / Single-Country Asia');

  // Asia ex-Japan (must come BEFORE Japan -- "亞洲不包括日本" contains "日本")
  if (cat.includes('亞洲') || cat.includes('亞太')) return findCategory('Asia ex-Japan Equity');

  // Japan (safe now -- Asia ex-Japan already matched above)
  if (cat.includes('日本') || cat.includes('Japan')) return findCategory('Japan Equity');

  // Europe
  if (cat.includes('歐洲') || cat.includes('歐元區') || cat.includes('UK ')) return findCategory('Europe Equity');

  // EM broad
  if (cat.includes('新興市場') || cat.includes('Emerging') || cat.includes('邊境')) return findCategory('EM Equity');

  // LatAm / Africa-ME
  if (cat.includes('拉丁美洲') || cat.includes('非洲') || cat.includes('中東')) return findCategory('LatAm / Africa-ME Equity');

  // Global equity (catch-all for remaining equity)
  if (cat.includes('全球') || cat.includes('Global')) return findCategory('Global Equity');

  // Fallback
  return findCategory('Global Equity');
};

module.exports = { CATEGORIES, categorize };
