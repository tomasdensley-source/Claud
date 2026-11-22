// Parses Appendix A of the brief into src/data/seed.json.
// Records are taken exactly as registered: no renames, merges or drops.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'data/odd-work-atlas-claude-code-brief-2026-11-22.md'), 'utf8');

const start = md.indexOf('## APPENDIX A');
if (start < 0) throw new Error('Appendix A not found');
const body = md.slice(start);
const chunks = body.split(/\n### /).slice(1);

const field = (chunk, label) => {
  const m = chunk.match(new RegExp(`^- \\*\\*${label}:\\*\\* ?(.*)$`, 'm'));
  return m ? m[1].trim() : '';
};

const records = chunks.map((chunk) => {
  const name = chunk.split('\n', 1)[0].trim();
  const appRaw = field(chunk, 'App');
  let appUrl = null;
  let appName = null;
  const link = appRaw.match(/^\[(.*)\]\((https?:\/\/[^)]+)\)/);
  if (link) {
    appName = link[1];
    appUrl = link[2];
  } else if (!/^No app/i.test(appRaw)) {
    throw new Error(`Unexpected App value for ${name}: ${appRaw}`);
  }
  return {
    name,
    category: field(chunk, 'Category'),
    stage: field(chunk, 'Stage'),
    description: field(chunk, 'Description'),
    note: field(chunk, 'Note'),
    appUrl,
    appName,
    appSweepNote: field(chunk, 'App sweep note'),
  };
});

const stages = new Set(['not_started', 'researching', 'signed_up', 'active', 'first_job', 'earning']);
for (const r of records) {
  if (!r.name || !r.category || !stages.has(r.stage)) throw new Error(`Bad record: ${JSON.stringify(r)}`);
}
const names = new Set(records.map((r) => r.name));
if (names.size !== records.length) throw new Error('Duplicate names');
if (records.length !== 340) throw new Error(`Expected 340 records, got ${records.length}`);

writeFileSync(join(root, 'src/data/seed.json'), JSON.stringify(records));
console.log(`seed.json: ${records.length} records, ${records.filter((r) => r.appUrl).length} with app links`);
