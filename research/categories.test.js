const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { categorize } = require('./categories');

const cat = (morningstarCategory, investmentRegion = null) =>
  categorize(morningstarCategory, investmentRegion).investmentCategory;

// ---------------------------------------------------------------------------
// Sector equity — Morningstar renamed 產業股票 → 行業股票 in ~May 2026
// ---------------------------------------------------------------------------
describe('Sector equity — new 行業股票 labels', () => {
  it('行業股票-科技 → Sector - Technology', () => assert.equal(cat('行業股票-科技'), 'Sector - Technology'));
  it('行業股票-健康護理 → Sector - Healthcare', () => assert.equal(cat('行業股票-健康護理'), 'Sector - Healthcare'));
  it('行業股票-生物科技 → Sector - Biotech', () => assert.equal(cat('行業股票-生物科技'), 'Sector - Biotech'));
  it('行業股票-貴金屬 → Sector - Gold & Precious Metals', () => assert.equal(cat('行業股票-貴金屬'), 'Sector - Gold & Precious Metals'));
  it('行業股票-天然資源 → Sector - Natural Resources & Mining', () => assert.equal(cat('行業股票-天然資源'), 'Sector - Natural Resources & Mining'));
  it('行業股票-能源 → Sector - Energy', () => assert.equal(cat('行業股票-能源'), 'Sector - Energy'));
  it('行業股票-環境生態 → Sector - Clean Energy & ESG', () => assert.equal(cat('行業股票-環境生態'), 'Sector - Clean Energy & ESG'));
  it('行業股票-替代能源 → Sector - Clean Energy & ESG', () => assert.equal(cat('行業股票-替代能源'), 'Sector - Clean Energy & ESG'));
  it('行業股票-消費品及服務 → Sector - Consumer & Brands', () => assert.equal(cat('行業股票-消費品及服務'), 'Sector - Consumer & Brands'));
  it('行業股票-金融服務 → Sector - Financials', () => assert.equal(cat('行業股票-金融服務'), 'Sector - Financials'));
  it('行業股票-公用事業 → Sector - Utilities', () => assert.equal(cat('行業股票-公用事業'), 'Sector - Utilities'));
  it('行業股票-基礎建設 → Sector - Infrastructure', () => assert.equal(cat('行業股票-基礎建設'), 'Sector - Infrastructure'));
  it('行業股票-農產品 → Sector - Agriculture', () => assert.equal(cat('行業股票-農產品'), 'Sector - Agriculture'));
  it('行業股票-水資源 → Sector - Water Resources', () => assert.equal(cat('行業股票-水資源'), 'Sector - Water Resources'));
});

describe('Sector equity — old 產業股票 labels still work', () => {
  it('產業股票 - 科技 → Sector - Technology', () => assert.equal(cat('產業股票 - 科技'), 'Sector - Technology'));
  it('產業股票 - 消費品 → Sector - Consumer & Brands', () => assert.equal(cat('產業股票 - 消費品'), 'Sector - Consumer & Brands'));
  it('產業股票 - 環境生態 → Sector - Clean Energy & ESG', () => assert.equal(cat('產業股票 - 環境生態'), 'Sector - Clean Energy & ESG'));
  it('產業股票 - 替代能源 → Sector - Clean Energy & ESG', () => assert.equal(cat('產業股票 - 替代能源'), 'Sector - Clean Energy & ESG'));
});

describe('Sector equity — Real Estate', () => {
  it('房地產 - 亞洲（間接）→ Sector - Real Estate', () => assert.equal(cat('房地產 - 亞洲（間接）'), 'Sector - Real Estate'));
  it('房地產-環球（間接）→ Sector - Real Estate', () => assert.equal(cat('房地產-環球（間接）'), 'Sector - Real Estate'));
  it('English "Real Estate" → Sector - Real Estate', () => assert.equal(cat('Real Estate'), 'Sector - Real Estate'));
});

// ---------------------------------------------------------------------------
// Bond categories — Morningstar renamed 全球 → 環球, 當地貨幣 → 本地貨幣
// ---------------------------------------------------------------------------
describe('Bond — Global High Yield (環球 rename)', () => {
  it('環球高收益債券 → Global High Yield Bond', () => assert.equal(cat('環球高收益債券'), 'Global High Yield Bond'));
  it('環球高收益債券-美元對沖 → Global High Yield Bond', () => assert.equal(cat('環球高收益債券-美元對沖'), 'Global High Yield Bond'));
  it('環球高收益債券-歐元對沖 → Global High Yield Bond', () => assert.equal(cat('環球高收益債券-歐元對沖'), 'Global High Yield Bond'));
  it('全球高收益債券 (old) → Global High Yield Bond', () => assert.equal(cat('全球高收益債券'), 'Global High Yield Bond'));
});

describe('Bond — EM Debt (環球 rename + 本地貨幣 rename)', () => {
  it('環球新興市場債券 → EM Debt - Hard Currency', () => assert.equal(cat('環球新興市場債券'), 'EM Debt - Hard Currency'));
  it('環球新興市場企業債券 → EM Debt - Hard Currency', () => assert.equal(cat('環球新興市場企業債券'), 'EM Debt - Hard Currency'));
  it('環球新興市場債券-本地貨幣 → EM Debt - Local Currency', () => assert.equal(cat('環球新興市場債券-本地貨幣'), 'EM Debt - Local Currency'));
  it('全球新興市場債券 (old) → EM Debt - Hard Currency', () => assert.equal(cat('全球新興市場債券'), 'EM Debt - Hard Currency'));
  it('全球新興市場債券當地貨幣 (old) → EM Debt - Local Currency', () => assert.equal(cat('全球新興市場債券當地貨幣'), 'EM Debt - Local Currency'));
});

describe('Bond — Convertible (可換股債券 rename)', () => {
  it('可換股債券-環球美元對沖 → Convertible Bond', () => assert.equal(cat('可換股債券-環球美元對沖'), 'Convertible Bond'));
  it('English "Convertibles" → Convertible Bond', () => assert.equal(cat('Convertibles'), 'Convertible Bond'));
  it('可轉換債券 (old) → Convertible Bond', () => assert.equal(cat('可轉換債券'), 'Convertible Bond'));
});

describe('Bond — Asia HY', () => {
  it('大中華高收益債券 → Asia Bond', () => assert.equal(cat('大中華高收益債券'), 'Asia Bond'));
  it('亞洲高收益債券 → Asia Bond', () => assert.equal(cat('亞洲高收益債券'), 'Asia Bond'));
});

// ---------------------------------------------------------------------------
// Alternative — Morningstar switched to Chinese labels in ~May 2026
// ---------------------------------------------------------------------------
describe('Alternative / Multi-Strategy', () => {
  it('宏觀策略–美元 → Alternative / Multi-Strategy', () => assert.equal(cat('宏觀策略–美元'), 'Alternative / Multi-Strategy'));
  it('多元策略–美元 → Alternative / Multi-Strategy', () => assert.equal(cat('多元策略–美元'), 'Alternative / Multi-Strategy'));
  it('Diversified Emerging Mkts routes via Emerging keyword → EM Equity (not Alternative)', () => assert.equal(cat('Diversified Emerging Mkts'), 'EM Equity'));
});

// ---------------------------------------------------------------------------
// Pre-existing fixes: Europe Equity
// ---------------------------------------------------------------------------
describe('Europe Equity — country-specific labels', () => {
  it('英國大型股票 → Europe Equity', () => assert.equal(cat('英國大型股票'), 'Europe Equity'));
  it('德國股票 → Europe Equity', () => assert.equal(cat('德國股票'), 'Europe Equity'));
  it('歐洲大型增長型股票 → Europe Equity', () => assert.equal(cat('歐洲大型增長型股票'), 'Europe Equity'));
  it('歐元區大型股票 → Europe Equity', () => assert.equal(cat('歐元區大型股票'), 'Europe Equity'));
});

// ---------------------------------------------------------------------------
// Pre-existing fixes: USD Balanced — 進取型 synonym + USD guard
// ---------------------------------------------------------------------------
describe('USD Balanced categories', () => {
  it('美元進取型股債混合 → USD Balanced - Aggressive', () => assert.equal(cat('美元進取型股債混合'), 'USD Balanced - Aggressive'));
  it('美元積極型股債混合 → USD Balanced - Aggressive', () => assert.equal(cat('美元積極型股債混合'), 'USD Balanced - Aggressive'));
  it('美元靈活型股債混合 → USD Balanced - Aggressive', () => assert.equal(cat('美元靈活型股債混合'), 'USD Balanced - Aggressive'));
  it('美元保守型股債混合 → USD Balanced - Conservative', () => assert.equal(cat('美元保守型股債混合'), 'USD Balanced - Conservative'));
  it('美元平衡型股債混合 → USD Balanced - Moderate', () => assert.equal(cat('美元平衡型股債混合'), 'USD Balanced - Moderate'));
});

describe('TWD Balanced — must not match USD Balanced categories', () => {
  it('新台幣保守型股債混合 does not map to USD Balanced - Conservative', () => assert.notEqual(cat('新台幣保守型股債混合'), 'USD Balanced - Conservative'));
  it('新台幣平衡型股債混合 does not map to USD Balanced - Moderate', () => assert.notEqual(cat('新台幣平衡型股債混合'), 'USD Balanced - Moderate'));
  it('新台幣進取型股債混合 does not map to USD Balanced - Aggressive', () => assert.notEqual(cat('新台幣進取型股債混合'), 'USD Balanced - Aggressive'));
});

// ---------------------------------------------------------------------------
// Existing behavior — regression guard
// ---------------------------------------------------------------------------
describe('Regional equity — existing behavior', () => {
  it('美國大型增長型股票 → US Large Cap', () => assert.equal(cat('美國大型增長型股票'), 'US Large Cap'));
  it('美國中型股票 → US Small/Mid Cap', () => assert.equal(cat('美國中型股票'), 'US Small/Mid Cap'));
  it('日本大型均衡型股票 → Japan Equity', () => assert.equal(cat('日本大型均衡型股票'), 'Japan Equity'));
  it('亞洲不包括日本股票 → Asia ex-Japan Equity', () => assert.equal(cat('亞洲不包括日本股票'), 'Asia ex-Japan Equity'));
  it('大中華股票 → China / Greater China Equity', () => assert.equal(cat('大中華股票'), 'China / Greater China Equity'));
  it('印度股票 → India Equity', () => assert.equal(cat('印度股票'), 'India Equity'));
  it('東協國家股票 → ASEAN / Single-Country Asia', () => assert.equal(cat('東協國家股票'), 'ASEAN / Single-Country Asia'));
  it('全球新興市場股票 → EM Equity', () => assert.equal(cat('全球新興市場股票'), 'EM Equity'));
  it('拉丁美洲股票 → LatAm / Africa-ME Equity', () => assert.equal(cat('拉丁美洲股票'), 'LatAm / Africa-ME Equity'));
});

describe('Bond — existing behavior', () => {
  it('美元高收益債券 → USD High Yield Bond', () => assert.equal(cat('美元高收益債券'), 'USD High Yield Bond'));
  it('亞洲債券 → Asia Bond', () => assert.equal(cat('亞洲債券'), 'Asia Bond'));
  it('歐元多元化債券 → Europe Bond (hedged)', () => assert.equal(cat('歐元多元化債券'), 'Europe Bond (hedged)'));
  it('美元債券 - 靈活策略 → USD Flexible / Multi-Sector Bond', () => assert.equal(cat('美元債券 - 靈活策略'), 'USD Flexible / Multi-Sector Bond'));
  it('貨幣市場 - 美元 → USD Short-Term / Money Market', () => assert.equal(cat('貨幣市場 - 美元'), 'USD Short-Term / Money Market'));
  it('美元多元化債券 → USD Investment Grade Bond', () => assert.equal(cat('美元多元化債券'), 'USD Investment Grade Bond'));
});

describe('其他股票/其他債券 — region routing', () => {
  it('其他股票 + 美國 region → US Large Cap', () => assert.equal(cat('其他股票', '美國'), 'US Large Cap'));
  it('其他股票 + 日本 region → Japan Equity', () => assert.equal(cat('其他股票', '日本'), 'Japan Equity'));
  it('其他股票 + null region → Global Equity', () => assert.equal(cat('其他股票', null), 'Global Equity'));
  it('其他債券 + null region → USD Investment Grade Bond', () => assert.equal(cat('其他債券', null), 'USD Investment Grade Bond'));
});
