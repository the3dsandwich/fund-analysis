import fs from 'node:fs';
import path from 'node:path';

const getISOWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

const getMonthKey = (dateStr) => dateStr.substring(0, 7); // "YYYY-MM"

export const computeKeepSet = (dates, today) => {
  const keep = new Set();
  if (dates.length === 0) return keep;

  const todayMs = today.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Rule 1: Daily — last 7 calendar days
  for (const d of dates) {
    const dMs = new Date(d).getTime();
    if (todayMs - dMs < sevenDaysMs) {
      keep.add(d);
    }
  }

  // Rule 2: Weekly — past 4 calendar weeks (before current week)
  const currentWeek = getISOWeek(today);
  const fourWeeksAgoMs = todayMs - 28 * 24 * 60 * 60 * 1000;
  const weekBuckets = {};
  for (const d of dates) {
    const dMs = new Date(d).getTime();
    if (dMs >= todayMs - sevenDaysMs) continue; // already handled by daily
    if (dMs < fourWeeksAgoMs) continue; // outside 4-week window
    const week = getISOWeek(new Date(d));
    if (week >= currentWeek) continue;
    if (!weekBuckets[week]) weekBuckets[week] = [];
    weekBuckets[week].push(d);
  }
  for (const week of Object.keys(weekBuckets)) {
    const latest = weekBuckets[week].sort().reverse()[0];
    keep.add(latest);
  }

  // Rule 3: Monthly — past 12 calendar months (before current month)
  const todayDate = today.toISOString().slice(0, 10);
  const currentMonth = getMonthKey(todayDate);
  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const minMonth = getMonthKey(twelveMonthsAgo.toISOString().slice(0, 10));
  const monthBuckets = {};
  for (const d of dates) {
    const month = getMonthKey(d);
    if (month >= currentMonth) continue; // skip current month
    if (month < minMonth) continue; // outside 12-month window
    if (!monthBuckets[month]) monthBuckets[month] = [];
    monthBuckets[month].push(d);
  }
  for (const month of Object.keys(monthBuckets)) {
    const latest = monthBuckets[month].sort().reverse()[0];
    keep.add(latest);
  }

  return keep;
};

export const runRetention = (dir, today = new Date()) => {
  const files = fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
  if (files.length === 0) return;

  const dates = files.map(f => f.replace('.json', ''));
  const keep = computeKeepSet(dates, today);

  for (const date of dates) {
    if (!keep.has(date)) {
      fs.unlinkSync(path.join(dir, `${date}.json`));
    }
  }
};

// CLI entry point
if (process.argv[2]) {
  const dir = process.argv[2];
  runRetention(dir);
  console.log(`Retention cleanup complete in ${dir}`);
}
