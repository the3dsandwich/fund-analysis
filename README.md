# Fund Analysis Pipeline: Technical & Business Handbook

## 1. Purpose and Business Context

This project catalogs all USD-denominated mutual funds from 20 major international fund companies available on Cathay United Bank's (國泰世華銀行) investment platform in Taiwan. The goal is to organize ~1,000 funds into opinionated investment categories so that an investor can:

1. Pick 1-2 highest-AUM representative funds per category
2. Evaluate each category's attractiveness based on the representative fund's performance
3. Decide whether to invest in each category

The platform hosts funds from dozens of companies, but only 20 were selected as target companies (22 ID prefixes, since two companies — Franklin Templeton and Janus Henderson — each use two prefixes).

---

## 2. Pipeline Overview

```
Step 1: fetch-fund-list     Cathay Search API → 1,548 USD funds → 1,028 target funds
            ↓
Step 2: scrape-details      Playwright browser → 1,028 detail pages → AUM, region, holdings
            ↓
Step 3: merge-output         Merge API + scrape data, categorize, deduplicate → JSON/CSV
            ↓
Step 4: generate-data        Convert merged JSON → ES module for React
            ↓
Step 5: presentation         Vite + React app → browsable category/fund interface
```

Each step depends on the output of the prior step and can be re-run independently to refresh data.

---

## 3. Step 1: Fund List Retrieval (fetch-fund-list)

**Source**: Cathay United Bank's internal search API
**Endpoint**: `POST https://www.cathaybk.com.tw/cathaybk/web/api/investment/searchfunds`
**Module**: `research/fetch-fund-list/index.js`

### 3.1 How the API Works

The API accepts a JSON body with a DataSource GUID, pagination parameters, and query filters. We query with `FUND_CURRENCY: ['USD']` to restrict to USD-denominated funds, ordered by NAV descending. The API returns 10 results per page.

```
Request body:
{
  DataSource: '{C0550DA7-B7C8-403A-B211-AD560704F493}',
  Direction: 'desc',
  OrderBy: 'FMNAVD_NAV',
  Buy: false,
  Page: <0-indexed>,
  Query: { FUND_CURRENCY: ['USD'] }
}
```

Page 0 is fetched first to determine `Count` (total USD funds on the platform). Then all remaining pages are fetched sequentially with a 200ms delay between requests. One retry on failure with a 1-second backoff.

### 3.2 API Response Field Mapping

Each fund in the API response (`Results[]`) has raw field names that we normalize:

| Output Field | API Raw Field | Description |
|---|---|---|
| `id` | `CubFundId` | 8-digit fund identifier. First 4 digits = company prefix. |
| `name` | `FullName` | Chinese fund name (official registered name in Taiwan) |
| `currency` | `Currency` | Always "美元" (USD) for our query |
| `morningstarCategory` | `FMCategoryC_NameTC` | Morningstar's Traditional Chinese category label (e.g., "美國大型增長型股票") |
| `starRating` | `StarRating_Inception` | Morningstar star rating (1-5, or null) |
| `distributionFrequency` | `SJ_DIV_FREQ` | Distribution frequency (e.g., "月" for monthly, "-" for none) |
| `currentYield` | `FMDividendx_CurrentYield` | Current distribution yield (%) |
| `nav` | `FMNAVD_NAV` | Net Asset Value per share |
| `navDate` | `FMNAVD_DATE` | Date of the NAV reading |
| `return3M` | `FMRETURND_3M` | 3-month return (%) |
| `return6M` | `FMRETURND_6M` | 6-month return (%) |
| `return1Y` | `FMRETURND_1Y` | 1-year return (%) |
| `return2Y` | `FMRETURND_2Y` | 2-year return (%) |
| `return3Y` | `FMRETURND_3Y` | 3-year return (%) |
| `returnYTD` | `FMRETURND_YTD` | Year-to-date return (%) |
| `returnInception` | `FMRETURND_INCEPTION` | Return since inception (%) |
| `riskLevel` | `RiskLevel_NameTC` | Taiwan regulatory risk level ("保守型", "穩健型", "積極型") |
| `stdDev` | `StandardDeviation_R1` | Standard deviation (risk metric) |
| `sharpe` | `SharpeRatio_R1` | Sharpe ratio (risk-adjusted return) |
| `beta` | `Betatoind_R1` | Beta to benchmark index |

### 3.3 Target Company Filtering

The first 4 characters of each fund ID map to a parent company via a hardcoded lookup table (`research/config.js`):

| Prefix | Company |
|---|---|
| 0001 | JPMorgan |
| 0002 | Fidelity |
| 0003 | Invesco |
| 0004 | Allianz |
| 0005 | UBS |
| 0006, 0010 | Franklin Templeton |
| 0007 | Schroders |
| 0009 | Aberdeen |
| 0012 | Alliance Bernstein |
| 0018, 0062 | Janus Henderson |
| 0040 | BlackRock |
| 0047 | Ninety One |
| 0058 | Morgan Stanley |
| 0060 | Amundi |
| 0072 | MFS |
| 0074 | Goldman Sachs |
| 0075 | Eastspring |
| 0081 | DWS |
| 0084 | PIMCO |
| 0093 | Pictet |

This mapping was manually curated. Two companies use two prefixes because of legacy entity structures or subsidiary registrations.

**Result**: 1,548 total USD funds → 1,028 funds from the 20 target companies.

### 3.4 Outputs

| File | Contents |
|---|---|
| `data/api-funds.json` | All 1,548 USD funds with normalized fields |
| `data/target-funds.json` | 1,028 target-company funds (with `company` field added) |
| `data/fund-table.csv` | Same as target-funds in CSV format |

---

## 4. Step 2: Detail Page Scraping (scrape-details)

**Source**: Cathay United Bank fund detail pages
**URL pattern**: `https://www.cathaybk.com.tw/cathaybk/personal/investment/fund/details/?fundid={id}`
**Module**: `research/scrape-details/index.js`
**Engine**: Playwright (Chromium, headless)

### 4.1 Why This Step Exists

The search API provides performance metrics and Morningstar category, but does NOT provide:
- Fund size (AUM) — critical for identifying the largest, most liquid funds
- Investment region — needed to fix Morningstar's catch-all categorization
- English name — useful for international reference
- Fund type (股票型/債券型/平衡型)
- Top 5 holdings

These fields are only available on the fund detail web pages, which are server-rendered HTML with some dynamic JavaScript content.

### 4.2 Scraping Strategy

For each of the 1,028 funds:

1. Navigate to the detail page using Playwright's Chromium instance
2. Wait for `networkidle` (all requests settled) with a 30-second timeout
3. Additionally wait for key Chinese text ("基金規模", "基金類型", or "計價幣別") to appear in the DOM, with a 10-second timeout
4. Wait 500ms more for any late-loading dynamic content
5. Execute `extractFundDetails()` in the browser context (runs as in-page JavaScript)

**Resilience features**:
- **Delay**: 1,500ms between each fund to avoid rate limiting
- **Progress persistence**: Results saved to `data/progress.json` every 25 funds. On crash/interrupt, the scraper resumes from the last checkpoint.
- **Retry**: Up to 2 retries per fund on failure, with 2-second backoff
- **Sample mode**: `--sample N` flag scrapes only the first N funds for testing

### 4.3 Text Extraction Methods

All extraction uses **regex matching on `document.body.textContent`** — NOT CSS selectors. This is deliberate: the page structure changes across fund types and companies, but the Chinese label text is consistent.

#### English Name
- Scans the first 30 non-empty lines of `document.body.innerText`
- Matches lines that consist entirely of Latin characters, spaces, common symbols (`& . () - , ' /`), and are longer than 10 characters
- Takes the first match

#### Fund Type (基金類型)
- Regex: `/基金類型[\s:：]*([^\n基投計風]+)/`
- Captures text after "基金類型" label, stopping at line break or another label keyword
- Values: "股票型" (equity), "債券型" (bond), "平衡型" (balanced), etc.

#### Investment Region (投資區域)
- Regex: `/投資區域[\s:：]*([^\n基投計風休]+)/`
- Captures text after "投資區域" label
- Values: Chinese region names like "美國", "全球", "亞太區不包括日本", "歐洲", etc.
- **Critical for categorization**: Used to route funds from Morningstar's catch-all categories

#### Fund Size / AUM (基金規模)
- Regex: `/基金規模[^\d]*([\d,]+\.?\d*)\s*(百萬[^\s(]+|億[^\s(]+)/`
- Captures numeric value and unit separately
- **Unit values**: "百萬美元" (millions USD), "億美元" (100 millions USD)
- Date regex: `/基金規模[^\d]*[\d,]+\.?\d*\s*(?:百萬|億)[^\s(]*\s*\((\d{4}\/\d{2}\/\d{2})\)/`
- Captures the date in parentheses after the size

#### Top 5 Holdings (主要持股TOP5)
- **Primary method**: Looks for "主要持股" section followed by "持股名稱" and "比例" headers, then parses name/percentage pairs from subsequent lines. A line is a holding name if the next line is a percentage matching `/^\d+\.?\d*%$/`.
- **Fallback method**: If primary extraction finds nothing, uses a broader regex: `/([\w\s,.\-&'()]+?)\s+(\d+\.?\d*%)/g` to find inline name-percentage pairs.
- Capped at 5 holdings.
- **Coverage**: 683 of 1,028 funds had extractable holdings. The remaining 345 either don't display holdings or have non-standard page layouts.

### 4.4 Outputs

| File | Contents |
|---|---|
| `data/detail-scrape.json` | Keyed by fund ID. Each entry: `{ id, englishName, fundType, investmentRegion, fundSizeValue, fundSizeUnit, fundSizeDate, holdings[], scrapedAt }` |
| `data/progress.json` | Resume checkpoint (completed fund IDs + last processed index) |

### 4.5 Data Quality

- **AUM coverage**: 1,027 of 1,028 (99.9%). One fund had no AUM on its page.
- **Holdings coverage**: 683 of 1,028 (66.4%). Lower coverage because some fund types don't show holdings, or use non-standard page layouts.
- **Scrape errors**: 0 of 1,028 (all pages loaded successfully).
- **Withdrawn funds**: 48 funds have "已撤銷核備" (regulatory approval withdrawn) or "未申報生效" in their names. These are legacy entries that can no longer be purchased but remain in the database.

---

## 5. Step 3: Merge and Categorize (merge-output)

**Module**: `research/merge-output/index.js`
**Inputs**: `target-funds.json` (API data) + `detail-scrape.json` (scrape data)
**Support modules**: `research/categories.js`, `research/share-classes.js`

This step joins data from both sources, applies investment categorization, identifies share-class groups, selects representative funds, and generates all output files.

### 5.1 Data Merging

For each fund in the API dataset, the corresponding scrape record is looked up by fund ID. Fields are assembled from both sources:

| Field | Source | Notes |
|---|---|---|
| `id` | API | 8-digit Cathay fund ID |
| `name` | API | Chinese registered name |
| `englishName` | Scrape | Latin-character name from detail page |
| `company` | Derived | From `config.js` prefix lookup (first 4 chars of ID) |
| `currency` | API | Always "美元" |
| `morningstarCategory` | API | Raw Morningstar TC category string |
| `fundType` | Scrape | "股票型" / "債券型" / "平衡型" |
| `investmentRegion` | Scrape | Chinese region label |
| `fundSizeValue` | Scrape | Numeric AUM value |
| `fundSizeUnit` | Scrape | "百萬美元" or "億美元" |
| `fundSizeDate` | Scrape | AUM reporting date |
| `fundSizeMillionsUsd` | Derived | Normalized: if 百萬美元 → as-is; if 億美元 → ×100. Non-USD units → null. |
| `nav` | API | Net asset value |
| `navDate` | API | NAV date |
| `return1Y`, `return3M`, `returnYTD` | API | Performance returns |
| `riskLevel` | API | Taiwan regulatory risk level |
| `starRating` | API | Morningstar stars (1-5) |
| `currentYield` | API | Distribution yield |
| `distributionFrequency` | API | Distribution schedule |
| `stdDev`, `sharpe`, `beta` | API | Risk metrics |
| `holdings` | Scrape | Array of `{ name, weight }` (up to 5) |
| `macro` | Derived | From categorization engine |
| `investmentCategory` | Derived | From categorization engine |
| `isRepresentative` | Derived | From share-class grouping |
| `underlyingId` | Derived | From share-class grouping |
| `siblingCount` | Derived | From share-class grouping |

### 5.2 AUM Normalization

The scrape extracts AUM as a raw value + unit string. The merge step normalizes to millions USD:

- If unit contains "百萬美元" (millions USD): use the value as-is
- If unit contains "億美元" (100 millions USD): multiply value by 100
- If unit is a non-USD currency (e.g., "百萬歐元"): set to null (non-comparable)
- If no AUM data: set to null

### 5.3 Investment Categorization

**Module**: `research/categories.js`
**Function**: `categorize(morningstarCategory, investmentRegion) → { investmentCategory, macro }`

#### 5.3.1 Three-Layer Category System

The system has three visible layers:

1. **Macro** (12 groups) — display/grouping only. Not for decision-making.
2. **Investment Category** (41 categories) — the decision-making layer. Each represents a distinct investment thesis.
3. **Raw Morningstar Category** (~108 unique values) — preserved for reference.

The 12 macros:
- Equity - US
- Equity - Europe/Japan
- Equity - Asia
- Equity - Global
- Equity - EM
- Equity - Sector
- Bond - IG
- Bond - Flexible
- Bond - HY & EM
- Money Market
- Balanced
- Other

The 41 investment categories:
- 11 regional equity (US Large Cap, US Small/Mid Cap, Europe, Japan, Asia ex-Japan, China/Greater China, India, ASEAN/Single-Country, Global, EM, LatAm/Africa-ME)
- 13 sector equity (Technology, Healthcare, Biotech, Gold & Precious Metals, Natural Resources & Mining, Energy, Clean Energy & ESG, Consumer & Brands, Real Estate, Financials, Utilities, Infrastructure, Agriculture)
- 11 bond (USD IG, USD Short-Term/Money Market, USD Flexible/Multi-Sector, USD HY, Global HY, Europe hedged, EM Hard Currency, EM Local Currency, Asia, India/Niche EM, Convertible)
- 6 balanced/other (USD Conservative, USD Moderate, USD Aggressive, Asia, Global non-USD, Alternative/Multi-Strategy)

#### 5.3.2 Categorization Algorithm

The `categorize()` function applies rules in a specific priority order. This order matters because some Morningstar category strings contain overlapping keywords.

**Priority 1: Catch-all re-routing (其他股票, 其他債券)**

Morningstar assigns "其他股票" (Other Equity) and "其他債券" (Other Bond) to funds whose USD-hedged share classes don't fit their regional classification system. This affects 83 equity funds and 21 bond funds — roughly 10% of the dataset. These funds are not actually miscellaneous; they're well-defined regional funds sold through a USD-hedged wrapper.

Fix: When `morningstarCategory === '其他股票'`, use the `investmentRegion` field from the scraped detail page to route the fund to the correct geographic category. Same for '其他債券'.

Region routing uses keyword lists:
- Europe regions: 歐洲, 歐元區, 北歐, 德國, 新興歐洲, 英國, 歐洲不包括英國
- Japan regions: 日本
- US regions: 美國
- China regions: 中國, 大中華, 香港
- India regions: 印度
- ASEAN regions: 泰國, 印尼, 南韓, 東協國家
- Asia regions: 亞太區, 亞太區不包括日本, etc.
- EM regions: 金磚四國, 歐非中東, 全球新興市場, etc.
- Global regions: 全球, 全球不包括美國

Fallback: if region is missing or unrecognized, equity → Global Equity; bond → USD IG Bond.

**Priority 2: Sector equity (most specific keywords)**

Sector categories use the most specific keyword prefix "產業股票 - " followed by sector name:
- "產業股票 - 科技" → Sector - Technology
- "產業股票 - 健康護理" → Sector - Healthcare
- "產業股票 - 生物科技" → Sector - Biotech
- "產業股票 - 貴金屬" → Sector - Gold & Precious Metals
- "產業股票 - 天然資源" → Sector - Natural Resources & Mining
- "產業股票 - 能源" → Sector - Energy
- "產業股票 - 環境生態" or "產業股票 - 替代能源" → Sector - Clean Energy & ESG
- "產業股票 - 消費品" → Sector - Consumer & Brands
- "產業股票 - 金融服務" → Sector - Financials
- "產業股票 - 公用事業" → Sector - Utilities
- "產業股票 - 基礎建設" → Sector - Infrastructure
- "產業股票 - 農產品" → Sector - Agriculture
- "房地產" (any occurrence) → Sector - Real Estate

Design decision: Each sector gets its own category even if it contains only 1-2 funds, because different sectors perform independently. Mixing gold miners with energy producers in a single "commodities" bucket would defeat the purpose of category-level performance evaluation.

**Priority 3: Balanced / Multi-Asset**

Matched by "股債混合" (equity-bond mixed) keywords combined with risk level:
- "保守型股債混合" → USD Balanced - Conservative
- "平衡型股債混合" + "美元" → USD Balanced - Moderate
- "積極型股債混合" or ("靈活型股債混合" + "美元") → USD Balanced - Aggressive
- "亞洲股債混合" or "全球新興市場股債混合" → Asia Balanced
- "歐元" + "股債混合" → Global Balanced (non-USD hedged)

**Priority 4: Money Market**

"貨幣市場" or the English string "USD Ultra Short-Term Bond" → USD Short-Term / Money Market.

**Priority 5: Bond categories (from specific to broad)**

Bonds are matched in order of specificity to avoid mis-routing:
1. "可轉換債券" → Convertible Bond
2. "美元高收益債券" (exact match) → USD High Yield Bond
3. "全球高收益債券" → Global High Yield Bond
4. "亞洲高收益債券" → Asia Bond
5. "全球新興市場債券" + "當地貨幣" → EM Debt - Local Currency
6. "全球新興市場債券" or "全球新興市場企業債券" → EM Debt - Hard Currency
7. "亞洲債券" or "伊斯蘭債券" → Asia Bond
8. "歐元" + ("債券" or "高收益") → Europe Bond (hedged)
9. "靈活策略" + ("債券" or "Bond") → USD Flexible / Multi-Sector Bond
10. Remaining "債券" or "Bond": if "短期" or "Short" → Money Market, else → USD IG Bond

**Priority 6: Regional equity (broadest keywords, ordered carefully)**

Regional equity uses broad keyword matching. The order is critical because some Chinese category names contain overlapping terms:

1. US: "美國" or "US " → US Large Cap (or US Small/Mid Cap if "小型" or "中型")
2. China: "中國", "大中華", "香港"
3. India: "印度"
4. ASEAN: "東協", "印尼", "韓國"
5. **Asia ex-Japan**: "亞洲", "亞太" — **MUST come before Japan** because "亞洲不包括日本" (Asia ex-Japan) contains the character "日本"
6. Japan: "日本", "Japan" — safe here because all Asia-ex-Japan strings already matched above
7. Europe: "歐洲", "歐元區", "UK "
8. EM broad: "新興市場", "Emerging", "邊境" (frontier)
9. LatAm/Africa-ME: "拉丁美洲", "非洲", "中東"
10. Global: "全球", "Global"

**Fallback**: Anything not matched → Global Equity.

#### 5.3.3 Thin Categories

Categories with 3 or fewer unique underlying funds are flagged as "thin". This is an informational flag — the category is kept separate because it represents a real investment thesis, but the user should be aware that fund selection within it is limited.

Current thin categories (9): Asia ex-Japan Equity (3), Sector - Energy (3), Sector - Consumer & Brands (3), Sector - Financials (2), Sector - Utilities (1), Sector - Infrastructure (1), Sector - Agriculture (1), India/Niche EM Bond (2), Global Balanced (1), Alternative/Multi-Strategy (3).

### 5.4 Share-Class Deduplication

**Module**: `research/share-classes.js`

#### 5.4.1 Problem

The 1,028 funds in the dataset are not 1,028 unique investment products. Many are share-class variants of the same underlying fund. Share classes differ in:

- **Fee tier**: A-class (standard retail), B-class (deferred load), F-class (advisory/fee-based)
- **Distribution method**: Accumulation (累積/acc — dividends reinvested, higher NAV) vs. distribution (月配 monthly, 季配 quarterly, 年配 annual — dividends paid out)
- **Currency hedging**: Base USD vs. hedged variants (美元對沖, 美元避險)

All share classes of the same underlying fund have the **same AUM** (reported at the fund level, not share-class level) and the **same company**.

#### 5.4.2 Grouping Algorithm

`groupByUnderlying(funds)` groups funds by a composite key: `{company}|{roundedAUM}`

- AUM is rounded to the nearest integer (in millions USD) to handle minor floating-point differences
- Funds with no AUM are grouped under `{company}|no-aum` (each treated as its own group since we can't confirm they're siblings)

This produces ~514 groups from 1,028 funds — roughly a 2:1 ratio.

#### 5.4.3 Representative Selection Algorithm

`pickRepresentative(group)` selects one fund from each group as the "representative" — the cleanest share class for performance comparison.

Each fund in the group is scored:

| Criterion | Points | Rationale |
|---|---|---|
| Name contains "累積" or "acc" (accumulation) | +10 | Accumulation classes show total return without distribution distortion |
| Name does NOT contain distribution keywords (月配/季配/年配/半年配/分派) | +5 | Same reason — avoid distribution-adjusted NAV |
| Name contains A-class indicators (A股/A級/A\s/A-/Class A) | +3 | A-class is the standard retail share class |
| Name contains B/C/F-class indicators | -3 | Non-standard fee tiers |
| Name contains hedging keywords (對沖/避險/hedg) | -2 | Hedged variants have tracking cost |
| Tiebreaker: NAV × 0.001 | varies | Higher NAV = accumulation class (since it reinvests dividends) |

The fund with the highest total score is selected. If a group has only one fund, it is automatically the representative.

#### 5.4.4 Output Fields

Each fund receives three additional fields:

| Field | Type | Description |
|---|---|---|
| `isRepresentative` | boolean | Whether this fund is the selected representative for its share-class group |
| `underlyingId` | string | Group key (e.g., "Franklin Templeton\|18393") shared by all siblings |
| `siblingCount` | integer | Total number of share classes in this fund's group |

### 5.5 Edge Case Detection

The merge step flags several categories of edge cases:

| Type | Trigger | Count |
|---|---|---|
| `SCRAPE_ERROR` | Scrape record contains an `error` field | 0 |
| `MISSING_AUM` | No `fundSizeValue` from scrape | 1 |
| `NON_USD_AUM` | AUM unit doesn't contain "美元" | 0 |
| `WITHDRAWN` | Fund name contains "已撤銷核備" or "未申報生效" | 48 |
| `THIN_CATEGORY` | Investment category has ≤3 unique funds | 9 |

Withdrawn funds (48) remain in the dataset because they still appear in the API and have historical data. They cannot be purchased but provide context for the category.

### 5.6 Outputs

| File | Contents | Size |
|---|---|---|
| `output/merged-funds.json` | Full dataset: category summary + all funds grouped by investment category | ~1.5 MB |
| `output/fund-table.csv` | Flat table: all 1,028 funds sorted by AUM descending, with all fields | ~400 KB |
| `output/category-representatives.csv` | 41 rows: one per category, top 2 representative funds with key metrics | ~11 KB |
| `output/edge-cases.md` | Human-readable edge case report | ~5 KB |

### 5.7 Sorting

- **Within each category in JSON**: representatives first, then by AUM descending
- **In the flat CSV**: all funds sorted by AUM descending (globally)
- **In the representatives CSV**: categories listed in the same order as the CATEGORIES array definition (regional equity → sector equity → bond → balanced/other)

---

## 6. Step 4: Data Module Generation

**Module**: `presentation/generate-data.cjs`

Reads `merged-funds.json` and writes `presentation/src/data.js` as:

```javascript
// Auto-generated — do not edit
export default { ... };
```

This converts the JSON into an ES module default export so Vite can import it at build time. The file is ~1.4 MB and is gitignored (it's a build artifact derived from the research output).

Uses CommonJS (`.cjs` extension) because the presentation package uses `"type": "module"` but the script itself uses `require()` for Node.js filesystem access.

---

## 7. Step 5: Presentation (Vite + React)

**Directory**: `presentation/`
**Stack**: Vite 6, React 19, React Router 7

### 7.1 Architecture

A single-page application with two routes served via `HashRouter` (hash-based routing so the built static files work without a server):

| Route | Component | Purpose |
|---|---|---|
| `/#/` | `CategoryList` | All 41 categories grouped by 12 macros |
| `/#/category/:name` | `CategoryDetail` | Funds within one category |

Data flow: `data.js` is imported directly in each page component. No state management library — the data is static and read-only.

### 7.2 Category List Page

1. Groups `categorySummary` array by `macro` field (single pass — categories are already contiguous by macro)
2. Each macro renders as a section with heading
3. Each category renders as a clickable card showing:
   - Category name
   - Fund counts: "N unique / M total"
   - Top representative: Chinese name, AUM, 1Y return
   - Thin badge (if ≤3 unique)
4. Clicking navigates to `/category/{encodedName}`

### 7.3 Category Detail Page

1. Reads `useParams().name`, decodes it, looks up in `data.categories`
2. Splits funds into representatives (`isRepresentative: true`) and siblings
3. Representatives sorted by AUM descending, displayed prominently via `FundCard`
4. Siblings hidden by default behind a toggle button (collapsed state)
5. Back link to home

### 7.4 Fund Card Component

Displays a single fund with:
- **Chinese name** (primary, prominent) — links to Cathay detail page (`https://www.cathaybk.com.tw/cathaybk/personal/investment/fund/details/?fundid={id}`, opens in new tab)
- **English name** (secondary, smaller, muted) — displayed below Chinese name if available
- Company name
- AUM formatted as "$X,XXXm"
- Returns (1Y, YTD, 3M) — color-coded green for positive, red for negative
- Risk level (Chinese)
- Star rating (unicode ★/☆)
- Yield (if applicable)
- Accepts a `dimmed` prop for non-representative (sibling) funds

### 7.5 Containerization

- **Dockerfile**: Multi-stage build. Stage 1: `node:22-alpine` runs `npm ci && npm run build`. Stage 2: `nginx:alpine` copies `dist/` and serves on port 80.
- **compose.yaml** (project root): Single `presentation` service, maps `${PORT:-3000}:80`
- **.env.example**: `PORT=3000`

### 7.6 Testing

25 tests across 3 test files using Vitest + React Testing Library:
- `FundCard.test.jsx` (13 tests): rendering, formatting, color-coding, dimming, external link
- `CategoryList.test.jsx` (6 tests): macro grouping, category display, thin flagging, routing
- `CategoryDetail.test.jsx` (6 tests): heading, representative display, sibling collapse/toggle, back link

---

## 8. Data Quality Notes and Known Limitations

### 8.1 Morningstar Category Artifacts

Morningstar's classification system was designed for funds in their base currency. When the same fund is sold through a USD-hedged share class, Morningstar sometimes classifies it as "其他股票" (Other Equity) or "其他債券" (Other Bond) rather than its actual geographic category. This affects ~10% of the dataset (83 equity + 21 bond funds). Our categorization engine fixes this by falling back to the `investmentRegion` field from the detail page.

### 8.2 Share-Class Grouping Assumption

The grouping heuristic (company + rounded AUM) assumes that two funds from the same company with identical AUM are share classes of the same product. This holds well in practice because:
- AUM is reported at the fund level, not the share-class level
- It is statistically unlikely for two different funds from the same company to have exactly the same AUM to the nearest million

Edge case: if two genuinely different funds from the same company happen to have the same rounded AUM, they would be incorrectly grouped. This has not been observed in the current dataset.

### 8.3 Holdings Extraction Limitations

66.4% of funds have extractable holdings. The 33.6% gap comes from:
- Bond funds that don't display a "主要持股TOP5" section
- Funds with non-standard page layouts
- Pages where holdings are loaded via JavaScript after our extraction timeout

### 8.4 Withdrawn Funds

48 funds (4.7%) are marked as "已撤銷核備" (regulatory approval withdrawn). These remain in the dataset and are categorized normally. They cannot be purchased but provide useful context about category composition.

### 8.5 AUM Currency

Only AUM reported in USD (百萬美元 or 億美元) is normalized. Funds reporting AUM in other currencies (e.g., EUR) have `fundSizeMillionsUsd: null`. Currently 0 funds fall into this case, but the handling exists as a guard.

---

## 9. Refresh Procedure

To refresh all data with current market values:

```bash
# Step 1: Re-fetch fund list from API
node research/fetch-fund-list/index.js

# Step 2: Re-scrape all detail pages (takes ~30 minutes)
node research/scrape-details/index.js

# Step 3: Re-merge and categorize
node research/merge-output/index.js

# Step 4: Regenerate React data module
node presentation/generate-data.cjs

# Step 5: Rebuild presentation
cd presentation && npm run build

# OR: Rebuild container
docker compose up --build
```

Each step is idempotent — it overwrites its previous output. The scrape step supports resume if interrupted (delete `progress.json` to force a full re-scrape).
