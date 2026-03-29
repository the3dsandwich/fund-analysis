import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateManifest } from './manifest.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));
}

function createSnapshots(dir, dates) {
  for (const d of dates) {
    fs.writeFileSync(path.join(dir, `${d}.json`), JSON.stringify({ date: d }));
  }
}

describe('generateManifest', () => {
  it('generates correct structure with multiple snapshots', () => {
    const dir = makeTmpDir();
    createSnapshots(dir, ['2026-03-28', '2026-03-27', '2026-03-20']);
    const manifest = generateManifest(dir, new Date('2026-03-28'));

    assert.ok(manifest.generated);
    assert.equal(manifest.latest, '2026-03-28');
    assert.equal(manifest.snapshots.length, 3);
    // Sorted descending
    assert.equal(manifest.snapshots[0].date, '2026-03-28');
    assert.equal(manifest.snapshots[1].date, '2026-03-27');
    assert.equal(manifest.snapshots[2].date, '2026-03-20');

    fs.rmSync(dir, { recursive: true });
  });

  it('latest is the most recent date', () => {
    const dir = makeTmpDir();
    createSnapshots(dir, ['2026-01-15', '2026-03-01']);
    const manifest = generateManifest(dir, new Date('2026-03-28'));
    assert.equal(manifest.latest, '2026-03-01');
    fs.rmSync(dir, { recursive: true });
  });

  it('assigns daily category for recent snapshots', () => {
    const dir = makeTmpDir();
    createSnapshots(dir, ['2026-03-28', '2026-03-25']);
    const manifest = generateManifest(dir, new Date('2026-03-28'));
    assert.equal(manifest.snapshots[0].category, 'daily');
    assert.equal(manifest.snapshots[1].category, 'daily');
    fs.rmSync(dir, { recursive: true });
  });

  it('assigns weekly category for older snapshots within 4 weeks', () => {
    const dir = makeTmpDir();
    createSnapshots(dir, ['2026-03-28', '2026-03-15']);
    const manifest = generateManifest(dir, new Date('2026-03-28'));
    assert.equal(manifest.snapshots[0].category, 'daily');
    assert.equal(manifest.snapshots[1].category, 'weekly');
    fs.rmSync(dir, { recursive: true });
  });

  it('assigns monthly category for snapshots older than 4 weeks', () => {
    const dir = makeTmpDir();
    createSnapshots(dir, ['2026-03-28', '2026-01-15']);
    const manifest = generateManifest(dir, new Date('2026-03-28'));
    assert.equal(manifest.snapshots[1].category, 'monthly');
    fs.rmSync(dir, { recursive: true });
  });

  it('empty directory produces valid empty manifest', () => {
    const dir = makeTmpDir();
    const manifest = generateManifest(dir, new Date('2026-03-28'));
    assert.equal(manifest.latest, null);
    assert.deepEqual(manifest.snapshots, []);
    fs.rmSync(dir, { recursive: true });
  });

  it('ignores manifest.json in directory', () => {
    const dir = makeTmpDir();
    createSnapshots(dir, ['2026-03-28']);
    fs.writeFileSync(path.join(dir, 'manifest.json'), '{}');
    const manifest = generateManifest(dir, new Date('2026-03-28'));
    assert.equal(manifest.snapshots.length, 1);
    fs.rmSync(dir, { recursive: true });
  });
});
