import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { computeKeepSet, runRetention } from './retention.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'retention-test-'));
}

function createSnapshots(dir, dates) {
  for (const d of dates) {
    fs.writeFileSync(path.join(dir, `${d}.json`), '{}');
  }
}

function listSnapshots(dir) {
  return fs.readdirSync(dir).filter(f => f !== 'manifest.json').sort();
}

describe('computeKeepSet', () => {
  it('keeps snapshots from the last 7 calendar days', () => {
    const today = new Date('2026-03-28');
    const dates = [
      '2026-03-28', '2026-03-27', '2026-03-26', '2026-03-25',
      '2026-03-24', '2026-03-23', '2026-03-22', '2026-03-21',
    ];
    const keep = computeKeepSet(dates, today);
    // 3/22 through 3/28 kept (7 days), 3/21 is day 8
    assert.ok(keep.has('2026-03-22'));
    assert.ok(keep.has('2026-03-28'));
    assert.ok(!keep.has('2026-03-21'));
  });

  it('keeps latest from each of the past 4 weeks', () => {
    const today = new Date('2026-03-28'); // Saturday, week 13
    const dates = [
      '2026-03-28', // current week — kept by daily
      '2026-03-20', '2026-03-16', // week 12 (Mar 16-22)
      '2026-03-13', '2026-03-09', // week 11 (Mar 9-15)
      '2026-03-06', '2026-03-02', // week 10 (Mar 2-8)
      '2026-02-27', '2026-02-23', // week 9 (Feb 23 - Mar 1)
      '2026-02-20', // week 8 — outside 4-week window
    ];
    const keep = computeKeepSet(dates, today);
    // Latest from each of past 4 weeks
    assert.ok(keep.has('2026-03-20')); // latest in week 12
    assert.ok(keep.has('2026-03-13')); // latest in week 11
    assert.ok(keep.has('2026-03-06')); // latest in week 10
    assert.ok(keep.has('2026-02-27')); // latest in week 9
    // Earlier in same week not kept (unless by daily rule)
    assert.ok(!keep.has('2026-02-20')); // week 8, outside 4-week range
  });

  it('keeps latest from each of the past 12 months', () => {
    const today = new Date('2026-03-28');
    const dates = [
      '2026-03-28',
      '2026-02-28', '2026-02-15',
      '2026-01-31', '2026-01-15',
      '2025-12-31',
      '2025-06-15',
      '2025-03-28', // exactly 12 months ago — within range
      '2025-02-28', // 13 months ago — outside range
    ];
    const keep = computeKeepSet(dates, today);
    assert.ok(keep.has('2026-02-28')); // latest in Feb
    assert.ok(!keep.has('2026-02-15')); // not latest in Feb (unless daily/weekly)
    assert.ok(keep.has('2026-01-31')); // latest in Jan
    assert.ok(keep.has('2025-12-31'));
    assert.ok(keep.has('2025-06-15'));
    assert.ok(keep.has('2025-03-28')); // Mar 2025 is within 12-month window
    assert.ok(!keep.has('2025-02-28')); // Feb 2025 is 13 months ago
  });

  it('handles empty date list', () => {
    const keep = computeKeepSet([], new Date('2026-03-28'));
    assert.equal(keep.size, 0);
  });

  it('union of all rules — a date kept by any rule survives', () => {
    const today = new Date('2026-03-28');
    // A date that's within daily range is kept even if it's not the weekly latest
    const dates = ['2026-03-25', '2026-03-26'];
    const keep = computeKeepSet(dates, today);
    assert.ok(keep.has('2026-03-25'));
    assert.ok(keep.has('2026-03-26'));
  });
});

describe('runRetention', () => {
  it('deletes files outside retention window', () => {
    const dir = makeTmpDir();
    createSnapshots(dir, [
      '2026-03-28', '2026-03-27', '2025-01-01',
    ]);
    // Also put a manifest.json that should not be deleted
    fs.writeFileSync(path.join(dir, 'manifest.json'), '{}');

    runRetention(dir, new Date('2026-03-28'));

    const remaining = listSnapshots(dir);
    assert.ok(remaining.includes('2026-03-28.json'));
    assert.ok(remaining.includes('2026-03-27.json'));
    assert.ok(!remaining.includes('2025-01-01.json')); // deleted
    // manifest.json preserved
    assert.ok(fs.existsSync(path.join(dir, 'manifest.json')));

    fs.rmSync(dir, { recursive: true });
  });

  it('does nothing with empty directory', () => {
    const dir = makeTmpDir();
    runRetention(dir, new Date('2026-03-28'));
    assert.deepEqual(fs.readdirSync(dir), []);
    fs.rmSync(dir, { recursive: true });
  });
});
