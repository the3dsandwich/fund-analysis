import fs from 'node:fs';
import path from 'node:path';

const categorizeDate = (dateStr, today) => {
  const todayMs = today.getTime();
  const dateMs = new Date(dateStr).getTime();
  const diffDays = (todayMs - dateMs) / (24 * 60 * 60 * 1000);

  if (diffDays < 7) return 'daily';
  if (diffDays < 28) return 'weekly';
  return 'monthly';
};

export const generateManifest = (dir, today = new Date()) => {
  const files = fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
  const dates = files.map(f => f.replace('.json', '')).sort().reverse();

  return {
    generated: today.toISOString(),
    latest: dates[0] || null,
    snapshots: dates.map(date => ({
      date,
      category: categorizeDate(date, today),
    })),
  };
};

// CLI entry point: generate and write manifest.json
if (process.argv[2]) {
  const dir = process.argv[2];
  const manifest = generateManifest(dir);
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Manifest written: ${manifest.snapshots.length} snapshots, latest: ${manifest.latest}`);
}
