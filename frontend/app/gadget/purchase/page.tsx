'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import BarcodeScanner from '@/components/BarcodeScanner';
import SerialBox from '@/components/SerialBox';
import { gql, taka, r2, parseSerials } from '@/lib/api';

type Line = { p: any; qty: string; cost: string; serials: string };

export default function GadgetPurchase() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState('');
  const [scan, setScan] = useState(false);
  const [pay, setPay] = useState('FULL');
  const [paid, setPaid] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    gql(`query{ suppliers{ id name balance } products{ id name category color barcode trackSerial purchasePrice stock } }`)
      .then((d) => { setSuppliers(d.suppliers); setProducts(d.products); }).catch((e) => setErr(e.message));
  }, []);

  const add = (p: any) => {
    setQ(''); setErr('');
    setLines((l) => (l.some((x) => x.p.id === p.id) ? l : [...l, { p, qty: '1', cost: p.purchasePrice ? String(p.purchasePrice) : '', serials: '' }]));
  };
  const upd = (i: number, patch: Partial<Line>) => setLines((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const onScan = (code: string) => {
    setScan(false);
    const p = products.find((p) => p.barcode === code);
    if (p) add(p); else setErr(`বারকোড ${code} — এই পণ্য আগে "নতুন পণ্য" থেকে যোগ করুন`);
  };

  const qtyOf = (l: Line) => (l.p.trackSerial ? parseSerials(l.serials).length : Number(l.qty) || 0);
  const total = r2(lines.reduce((a, l) => a + qtyOf(l) * (Number(l.cost) || 0), 0));
  const found = q.trim() ? products.filter((p) => (p.name + ' ' + (p.category || '') + ' ' + (p.barcode || '')).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];

  const submit = async () => {
    setErr('');
    if (!lines.length) return setErr('কমপক্ষে একটি পণ্য যোগ করুন');
    for (const l of lines) {
      const n = qtyOf(l);
      if (n <= 0 || !Number.isInteger(n)) return setErr(`${l.p.name}: ${l.p.trackSerial ? 'IMEI / সিরিয়াল দিন' : 'পরিমাণ পূর্ণসংখ্যায় দিন'}`);
      if (!(Number(l.cost) > 0)) return setErr(`${l.p.name}: কেনা দাম দিন`);
    }
    const p = pay === 'FULL' ? total : pay === 'DUE' ? 0 : Number(paid) || 0;
    if (p > total) return setErr('দেওয়া টাকা মোটের চেয়ে বেশি');
    if (p < total && !supplierId) return setErr('বাকির জন্য সাপ্লায়ার বেছে নিন');
    setBusy(true);
    try {
      await gql(`mutation($i:GadgetPurchaseInput!){ gadgetPurchase(input:$i){ id } }`, {
        i: {
          supplierId: supplierId || null, paid: p,
          items: lines.map((l) => ({ productId: l.p.id, qty: qtyOf(l), cost: Number(l.cost), serials: l.p.trackSerial ? parseSerials(l.serials) : null })),
        },
      });
      router.push('/gadget/products');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      {scan && <BarcodeScanner onScan={onScan} onClose={() => setScan(false)} />}
      <h1 className="text-2xl font-bold">সাপ্লায়ার থেকে মাল কেনা</h1>
      <div>
        <label className="label">কোন সাপ্লায়ার থেকে?</label>
        <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">— সাপ্লায়ার বেছে নিন —</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.balance >= 0 ? 'দিতে হবে' : 'পাবেন'} {taka(Math.abs(s.balance))})</option>)}
        </select>
        <Link href="/supplier" className="text-sm text-emerald-700 underline">+ নতুন সাপ্লায়ার যোগ করুন</Link>
      </div>

      <div className="flex gap-2">
        <input className="input" placeholder="পণ্য খুঁজুন (নাম / ব্র্যান্ড / রং)..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="rounded-xl bg-emerald-600 text-white px-4" onClick={() => setScan(true)}>📷</button>
      </div>
      {found.map((p) => (
        <button key={p.id} onClick={() => add(p)} className="card w-full text-left flex justify-between gap-2">
          <span>{p.name}<span className="block text-xs text-gray-500">{p.category} {p.trackSerial ? '· IMEI' : ''}</span></span>
          <span className="text-sm text-gray-500 shrink-0">স্টক {p.stock}</span>
        </button>
      ))}
      {q.trim() && found.length === 0 && <div className="text-sm text-gray-500">পণ্য পাওয়া যায়নি — <Link href="/gadget/products" className="text-emerald-700 underline">নতুন পণ্য যোগ করুন</Link></div>}

      {lines.map((l, i) => (
        <div key={l.p.id} className="card space-y-2">
          <div className="flex justify-between gap-2"><b>{l.p.name}</b><button className="text-rose-500" onClick={() => setLines(lines.filter((_, k) => k !== i))}>✕</button></div>
          <div className="grid grid-cols-2 gap-2">
            {l.p.trackSerial
              ? <div><label className="label">পরিমাণ</label><div className="input !bg-gray-50 font-bold">{qtyOf(l)}টি</div></div>
              : <div><label className="label">পরিমাণ</label><input className="input" inputMode="numeric" value={l.qty} onChange={(e) => upd(i, { qty: e.target.value })} /></div>}
            <div><label className="label">কেনা দাম (প্রতিটি)</label><input className="input" inputMode="decimal" value={l.cost} onChange={(e) => upd(i, { cost: e.target.value })} /></div>
          </div>
          {l.p.trackSerial && <SerialBox value={l.serials} onChange={(v) => upd(i, { serials: v })} />}
          <div className="text-right font-semibold">{taka(qtyOf(l) * (Number(l.cost) || 0))}</div>
        </div>
      ))}

      <div className="text-right text-xl font-bold">মোট: {taka(total)}</div>
      <div>
        <label className="label">পেমেন্ট</label>
        <div className="flex flex-wrap gap-2">
          {[['FULL', 'পুরো টাকা'], ['PART', 'কিছু টাকা'], ['DUE', 'বাকিতে']].map(([k, v]) => <button key={k} onClick={() => setPay(k)} className={`chip ${pay === k ? 'chip-on' : ''}`}>{v}</button>)}
        </div>
      </div>
      {pay === 'PART' && (
        <div>
          <input className="input" inputMode="decimal" placeholder="এখন কত টাকা দিলেন?" value={paid} onChange={(e) => setPaid(e.target.value)} />
          {total > 0 && <div className="text-amber-600 mt-1">বাকি থাকবে: {taka(Math.max(0, total - (Number(paid) || 0)))}</div>}
        </div>
      )}
      {err && <div className="text-rose-600">{err}</div>}
      <button className="btn" disabled={busy} onClick={submit}>{busy ? '...' : 'মাল কেনা যোগ করুন'}</button>
    </AppShell>
  );
}