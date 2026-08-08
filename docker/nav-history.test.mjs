import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  upsertNavPoint,
  computeDrawdown,
  computeSelfReturn,
  annotateFunds,
} from './nav-history.mjs';

describe('upsertNavPoint', () => {
  it('adds a point to an empty series', () => {
    const result = upsertNavPoint([], '2026-08-08', 100);
    assert.deepEqual(result, [{ date: '2026-08-08', nav: 100 }]);
  });

  it('appends a later point and keeps ascending date order', () => {
    const series = [{ date: '2026-08-06', nav: 100 }];
    const result = upsertNavPoint(series, '2026-08-08', 105);
    assert.deepEqual(result, [
      { date: '2026-08-06', nav: 100 },
      { date: '2026-08-08', nav: 105 },
    ]);
  });

  it('inserts an out-of-order point in the correct sorted position', () => {
    const series = [
      { date: '2026-08-01', nav: 90 },
      { date: '2026-08-08', nav: 105 },
    ];
    const result = upsertNavPoint(series, '2026-08-04', 95);
    assert.deepEqual(result.map((p) => p.date), ['2026-08-01', '2026-08-04', '2026-08-08']);
  });

  it('overwrites an existing point for the same date instead of duplicating', () => {
    const series = [{ date: '2026-08-08', nav: 100 }];
    const result = upsertNavPoint(series, '2026-08-08', 103);
    assert.deepEqual(result, [{ date: '2026-08-08', nav: 103 }]);
  });

  it('does not mutate the input series', () => {
    const series = [{ date: '2026-08-06', nav: 100 }];
    upsertNavPoint(series, '2026-08-08', 105);
    assert.equal(series.length, 1);
  });
});

describe('computeDrawdown', () => {
  it('returns nulls for an empty series', () => {
    assert.deepEqual(computeDrawdown([]), {
      navHigh: null,
      navHighDate: null,
      pctOffHigh: null,
    });
  });

  it('reports 0% off high when the latest point is the highest', () => {
    const series = [
      { date: '2026-08-01', nav: 90 },
      { date: '2026-08-08', nav: 100 },
    ];
    const result = computeDrawdown(series);
    assert.equal(result.navHigh, 100);
    assert.equal(result.navHighDate, '2026-08-08');
    assert.equal(result.pctOffHigh, 0);
  });

  it('computes negative pctOffHigh when currently below the historical high', () => {
    const series = [
      { date: '2026-01-01', nav: 200 },
      { date: '2026-08-08', nav: 100 },
    ];
    const result = computeDrawdown(series);
    assert.equal(result.navHigh, 200);
    assert.equal(result.navHighDate, '2026-01-01');
    assert.equal(result.pctOffHigh, -50);
  });

  it('picks the highest value even when it is not the most recent point', () => {
    const series = [
      { date: '2026-01-01', nav: 100 },
      { date: '2026-04-01', nav: 150 },
      { date: '2026-08-08', nav: 120 },
    ];
    const result = computeDrawdown(series);
    assert.equal(result.navHigh, 150);
    assert.equal(result.navHighDate, '2026-04-01');
  });
});

describe('computeSelfReturn', () => {
  it('returns null when the series is empty', () => {
    assert.equal(computeSelfReturn([], '2026-08-08', 1), null);
  });

  it('returns null when there is not enough history for the requested window', () => {
    const series = [
      { date: '2026-08-01', nav: 100 },
      { date: '2026-08-08', nav: 105 },
    ];
    assert.equal(computeSelfReturn(series, '2026-08-08', 1), null);
  });

  it('computes a 1-year return once a point ~1 year back exists', () => {
    const series = [
      { date: '2025-08-08', nav: 100 },
      { date: '2026-08-08', nav: 120 },
    ];
    assert.equal(computeSelfReturn(series, '2026-08-08', 1), 20);
  });

  it('computes a 3-year return once a point ~3 years back exists', () => {
    const series = [
      { date: '2023-08-08', nav: 100 },
      { date: '2026-08-08', nav: 80 },
    ];
    assert.equal(computeSelfReturn(series, '2026-08-08', 3), -20);
  });

  it('returns null for a 3-year window when only ~1 year of history exists', () => {
    const series = [
      { date: '2025-08-08', nav: 100 },
      { date: '2026-08-08', nav: 120 },
    ];
    assert.equal(computeSelfReturn(series, '2026-08-08', 3), null);
  });

  it('picks the point nearest the target lookback date, not just the oldest', () => {
    const series = [
      { date: '2024-01-01', nav: 50 },
      { date: '2025-08-05', nav: 100 },
      { date: '2026-08-08', nav: 110 },
    ];
    // Target for 1Y back is 2025-08-08; 2025-08-05 is much closer than 2024-01-01
    assert.equal(computeSelfReturn(series, '2026-08-08', 1), 10);
  });
});

describe('annotateFunds', () => {
  const makeOutput = (fund) => ({
    generatedAt: '2026-08-08T00:00:00.000Z',
    categorySummary: [{ name: 'US Large Cap', macro: 'Equity - US', fundCount: 1, uniqueCount: 1, thin: false }],
    categories: {
      'US Large Cap': {
        macro: 'Equity - US',
        fundCount: 1,
        uniqueCount: 1,
        funds: [fund],
      },
    },
  });

  it('records a first-ever NAV point and annotates zero drawdown, no self-returns yet', () => {
    const output = makeOutput({ id: '00010001', nav: 100 });
    const { series, output: annotated } = annotateFunds({}, output, '2026-08-08');

    assert.deepEqual(series['00010001'], [{ date: '2026-08-08', nav: 100 }]);

    const fund = annotated.categories['US Large Cap'].funds[0];
    assert.equal(fund.navHigh, 100);
    assert.equal(fund.pctOffHigh, 0);
    assert.equal(fund.selfReturn1Y, null);
    assert.equal(fund.selfReturn3Y, null);
    assert.equal(fund.selfReturn5Y, null);
    assert.equal(fund.navTrackedSince, '2026-08-08');
  });

  it('folds today into an existing series and computes drawdown against prior history', () => {
    const existingSeries = {
      '00010001': [
        { date: '2025-08-08', nav: 100 },
        { date: '2026-06-01', nav: 150 },
      ],
    };
    const output = makeOutput({ id: '00010001', nav: 90 });
    const { series, output: annotated } = annotateFunds(existingSeries, output, '2026-08-08');

    assert.equal(series['00010001'].length, 3);
    const fund = annotated.categories['US Large Cap'].funds[0];
    assert.equal(fund.navHigh, 150);
    assert.equal(fund.navHighDate, '2026-06-01');
    assert.equal(Math.round(fund.pctOffHigh * 100) / 100, -40);
    assert.equal(fund.selfReturn1Y, -10);
    assert.equal(fund.navTrackedSince, '2025-08-08');
  });

  it('skips funds with no nav value without crashing', () => {
    const existingSeries = {};
    const output = makeOutput({ id: '00010001', nav: null });
    const { series, output: annotated } = annotateFunds(existingSeries, output, '2026-08-08');

    assert.equal(series['00010001'], undefined);
    const fund = annotated.categories['US Large Cap'].funds[0];
    assert.equal(fund.navHigh, undefined);
  });
});
