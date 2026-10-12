import { readFileSync } from 'node:fs';
import { ensureVectors, vectorPath, VECTOR_FILES } from './download';

// Usage: npm run inspect:map -- [search terms...]  (no terms: print all names)
const terms = process.argv.slice(2).map(t => t.toLowerCase());
await ensureVectors();
for (const f of VECTOR_FILES) {
  const gj = JSON.parse(readFileSync(vectorPath(f), 'utf8'));
  for (const ft of gj.features) {
    const p = ft.properties ?? {};
    const names = [p.name, p.name_nl, p.name_en, p.NAME, p.NAME_NL, p.NAME_EN].filter(Boolean);
    const line = `${f}\t${ft.geometry?.type}\tname=${p.name ?? p.NAME}\tnl=${p.name_nl ?? p.NAME_NL}\ten=${p.name_en ?? p.NAME_EN}`;
    if (!terms.length || terms.some(t => names.some(n => String(n).toLowerCase().includes(t)))) console.log(line);
  }
}
