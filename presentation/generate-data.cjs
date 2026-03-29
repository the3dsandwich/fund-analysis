const fs = require('fs');
const path = require('path');

const input = path.join(__dirname, '..', 'research', 'merge-output', 'output', 'merged-funds.json');
const output = path.join(__dirname, 'src', 'data.js');

if (!fs.existsSync(input)) {
  console.error(`Missing: ${input}`);
  console.error('Run: node research/merge-output/index.js');
  process.exit(1);
}

const raw = fs.readFileSync(input, 'utf-8');
fs.writeFileSync(output, `// Auto-generated — do not edit\nexport default ${raw};\n`);
console.log(`Wrote ${output} (${(raw.length / 1024).toFixed(0)} KB)`);
