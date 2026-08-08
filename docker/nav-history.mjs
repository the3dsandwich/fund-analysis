import fs from 'node:fs';

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365;
const LOOKBACK_TOLERANCE_DAYS = 10;

/**
 * Returns a new series (does not mutate) with `date`/`nav` upserted in
 * ascending date order. A point for the same date is overwritten rather
 * than duplicated, so re-running a refresh on the same day is idempotent.
 */
export function upsertNavPoint(series, date, nav) {
  const next = series.filter((p) => p.date !== date);
  next.push({ date, nav });
  next.sort((a, b) => a.date.localeCompare(b.date));
  return next;
}

/**
 * Highest NAV ever observed in the series, and how far the latest point
 * (assumed to be the last entry once sorted ascending) sits below it.
 */
export function computeDrawdown(series) {
  if (series.length === 0) {
    return { navHigh: null, navHighDate: null, pctOffHigh: null };
  }

  let high = series[0];
  for (const point of series) {
    if (point.nav > high.nav) high = point;
  }

  const current = series[series.length - 1];
  const pctOffHigh = high.nav > 0 ? ((current.nav - high.nav) / high.nav) * 100 : null;

  return { navHigh: high.nav, navHighDate: high.date, pctOffHigh };
}

/**
 * Self-computed return over `yearsBack` years, derived only from NAV
 * points we've actually recorded — never from a fund provider's
 * precomputed return field. Returns null if the series doesn't yet
 * reach back far enough to answer the question honestly.
 */
export function computeSelfReturn(series, asOfDate, yearsBack, toleranceDays = LOOKBACK_TOLERANCE_DAYS) {
  if (series.length === 0) return null;

  const asOfMs = new Date(asOfDate).getTime();
  const targetMs = asOfMs - yearsBack * DAYS_PER_YEAR * DAY_MS;

  let best = null;
  let bestDiffMs = Infinity;
  for (const point of series) {
    const diffMs = Math.abs(new Date(point.date).getTime() - targetMs);
    if (diffMs < bestDiffMs) {
      bestDiffMs = diffMs;
      best = point;
    }
  }

  const minAcceptableAgeMs = (yearsBack * DAYS_PER_YEAR - toleranceDays) * DAY_MS;
  const bestAgeMs = asOfMs - new Date(best.date).getTime();
  if (bestAgeMs < minAcceptableAgeMs) return null;
  if (best.nav === 0) return null;

  const current = series[series.length - 1];
  return ((current.nav - best.nav) / best.nav) * 100;
}

/**
 * Walks every fund in a merged-funds output, folds today's NAV into its
 * long-term series, and annotates the fund with drawdown + self-computed
 * return fields derived purely from that series.
 *
 * Returns the updated series map alongside the (mutated in place) output,
 * mirroring the merge-output convention of building one fresh object per run.
 */
export function annotateFunds(navSeriesByFund, output, today) {
  const series = { ...navSeriesByFund };

  for (const category of Object.values(output.categories)) {
    for (const fund of category.funds) {
      if (fund.nav == null) continue;

      const fundSeries = upsertNavPoint(series[fund.id] || [], today, fund.nav);
      series[fund.id] = fundSeries;

      const { navHigh, navHighDate, pctOffHigh } = computeDrawdown(fundSeries);
      fund.navHigh = navHigh;
      fund.navHighDate = navHighDate;
      fund.pctOffHigh = pctOffHigh;
      fund.selfReturn1Y = computeSelfReturn(fundSeries, today, 1);
      fund.selfReturn3Y = computeSelfReturn(fundSeries, today, 3);
      fund.selfReturn5Y = computeSelfReturn(fundSeries, today, 5);
      fund.navTrackedSince = fundSeries[0].date;
    }
  }

  return { series, output };
}

// CLI entry point: fold today's snapshot into the durable NAV series and
// write the annotated snapshot. Used by docker/refresh.sh in place of a
// plain `cp` of merged-funds.json.
if (process.argv[2]) {
  const [, , navSeriesPath, mergedFundsPath, outputPath, today] = process.argv;

  const navSeriesByFund = fs.existsSync(navSeriesPath)
    ? JSON.parse(fs.readFileSync(navSeriesPath, 'utf-8'))
    : {};
  const mergedOutput = JSON.parse(fs.readFileSync(mergedFundsPath, 'utf-8'));

  const { series, output } = annotateFunds(navSeriesByFund, mergedOutput, today);

  fs.writeFileSync(navSeriesPath, JSON.stringify(series));
  fs.writeFileSync(outputPath, JSON.stringify(output));

  console.log(`NAV history updated: ${Object.keys(series).length} funds tracked, snapshot written to ${outputPath}`);
}
