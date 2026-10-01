import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ---------- CSV পড়ার ছোট parser (কোটেশন সহ) ----------
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); if (row.some((x) => x.trim())) rows.push(row); }
  return rows;
}

// ডেটাসেটের dosage type → অ্যাপের ফর্ম
export function formOf(d: string) {
  const s = d.toLowerCase();
  if (s.includes('injection') || s.includes('infusion')) return 'INJECTION';
  if (s.includes('tablet')) return 'TABLET';
  if (s.includes('capsule')) return 'CAPSULE';
  if (s.includes('syrup') || s.includes('suspension') || s.includes('drops') || s.includes('solution') || s.includes('elixir') || s.includes('emulsion')) return 'SYRUP';
  return 'OTHER';
}

export function toRows(text: string) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  const head = rows.shift()!.map((h) => h.trim());
  const ix = (n: string) => head.indexOf(n);
  const [g, b, d, s, m] = ['genericName', 'brandName', 'dosageType', 'strength', 'manufacturer'].map(ix);
  if ([g, b, d, s, m].some((i) => i < 0)) throw new Error('CSV-এর কলামের নাম মিলছে না: ' + head.join(', '));
  return rows
    .filter((r) => (r[b] || '').trim())
    .map((r) => ({
      brand: r[b].trim(),
      genericName: (r[g] || '').trim(),
      strength: (r[s] || '').trim() || null,
      dosage: (r[d] || '').trim(),
      form: formOf(r[d] || ''),
      company: (r[m] || '').trim(),
    }));
}

async function main() {
  const db = new PrismaClient();
  const file = path.join(__dirname, 'data', 'bd-medicines.csv');
  if (!fs.existsSync(file)) {
    console.error('ফাইল পাওয়া যায়নি: ' + file);
    process.exit(1);
  }
  const data = toRows(fs.readFileSync(file, 'utf8'));
  await db.medicineCatalog.deleteMany(); // আবার চালালে নতুন করে বসবে, ডুপ্লিকেট হবে না
  for (let i = 0; i < data.length; i += 2000) {
    await db.medicineCatalog.createMany({ data: data.slice(i, i + 2000) });
    console.log(`${Math.min(i + 2000, data.length)} / ${data.length}`);
  }
  console.log(`\n✅ ${data.length}টি ওষুধ ক্যাটালগে বসানো হয়েছে`);
  await db.$disconnect();
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });