'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import BarcodeScanner from '@/components/BarcodeScanner';
import { gql, taka, fmtStock, unitsFor, unitFactor, r2 } from '@/lib/api';

type Line = { p: any; unit: string; qty: number; cost: number; batchNo: string; expiry: string };

export default function PharmaPurchase() {
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
    gql(`query{ suppliers{id name balance} products{ id name genericName company barcode form piecesPerStrip stripsPerBox purchasePrice stock } }`)
      .then((d) => { setSuppliers(d.suppliers); setProducts(d.products); }).catch((e) => setErr(e.message));
  }, []);

  const add = (p: any) => {
    setQ('');
    const unit = unitsFor(p)[0][0];
    setLines((l) => [...l, { p, unit, qty: 1, cost: r2(p.purchasePrice * unitFactor(p, unit)), batchNo: '', expiry: '' }]);
  };
  const upd = (i: number, patch: Partial<Line>) => setLines((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const setUnit = (i: number, unit: string) => upd(i, { unit, cost: r2(lines[i].p.purchasePrice * unitFactor(lines[i].p, unit)) });

  const onScan = (code: string) => {
    setScan(false);
    const p = products.find((p) => p.barcode === code);
    if (p) add(p); else setErr(`বারকোড ${code} — এই ওষুধ আগে "নতুন ওষুধ" থেকে যোগ করুন`);
  };

  const total = r2(lines.reduce((a, l) => a + l.qty * l.cost, 0));
  const found = q ? products.filter((p) => (p.name + ' ' + (p.genericName || '') + ' ' + (p.company || '')).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const ex = (m: string) => { if (!m) return null; const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10); };

  const submit = async () => {
    setErr('');
    if (!lines.length) return setErr('কমপক্ষে একটি ওষুধ যোগ করুন');
    if (total <= 0) return setErr('দাম লিখুন');
    const p = pay === 'FULL' ? total : pay === 'DUE' ? 0 : Number(paid) || 0;
    if (p < total && !supplierId) return setErr('বাকির জন্য কোম্পানি বেছে নিন');
    setBusy(true);
    try {
      await gql(`mutation($i:PharmaPurchaseInput!){ pharmacyPurchase(input:$i){ id } }`, {
        i: {
          supplierId: supplierId || null, paid: p,
          items: lines.map((l) => ({ productId: l.p.id, unit: l.unit, qty: l.qty, cost: l.cost, batchNo: l.batchNo || null, expiry: ex(l.expiry) })),
        },
      });
      router.push('/pharmacy/medicines');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      {scan && <BarcodeScanner onScan={onScan} onClose={() => setScan(false)} />}
      <h1 className="text-2xl font-bold text-slate-800">📦 কোম্পানি থেকে মাল কিনেছি</h1>

      <div className="card">
        <label className="label">🚚 কোন কোম্পানি থেকে?</label>
        <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">— কোম্পানি বেছে নিন —</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.balance >= 0 ? 'দিতে হবে' : 'পাবেন'} {taka(Math.abs(s.balance))})</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          <input className="input !pl-12" placeholder="ওষুধ খুঁজুন..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="rounded-2xl bg-ink text-white px-5 text-xl active:scale-95 transition" onClick={() => setScan(true)} aria-label="স্ক্যান করুন">📷</button>
      </div>
      {q && found.length === 0 && <div className="text-slate-400 text-center">এই নামে কোনো ওষুধ নেই। আগে “নতুন ওষুধ” যোগ করুন।</div>}
      {found.map((p) => (
        <button key={p.id} onClick={() => add(p)} className="card w-full text-left flex justify-between">
          <span className="text-slate-800">{p.name}<span className="block text-xs text-slate-500">{p.company}</span></span>
          <span className="text-sm text-slate-500">আছে {fmtStock(p.stock, p)}</span>
        </button>
      ))}

      {lines.map((l, i) => (
        <div key={i} className="card animate-pop space-y-2">
          <div className="flex justify-between items-center">
            <b className="text-slate-800">{l.p.name}</b>
            <button className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 active:scale-90 transition" onClick={() => setLines(lines.filter((_, k) => k !== i))} aria-label="বাদ দিন">✕</button>
          </div>
          <div className="flex gap-2">
            {unitsFor(l.p).map(([k, v]) => (
              <button key={k} onClick={() => setUnit(i, k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition active:scale-95 ${l.unit === k ? 'bg-ink text-white' : 'bg-slate-100 text-slate-600'}`}>{v}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">কতটা</label><input className="input" inputMode="decimal" value={l.qty} onChange={(e) => upd(i, { qty: Number(e.target.value) })} /></div>
            <div><label className="label">কেনা দাম (প্রতিটার)</label><input className="input" inputMode="decimal" value={l.cost} onChange={(e) => upd(i, { cost: Number(e.target.value) })} /></div>
            <div><label className="label">ব্যাচ নং</label><input className="input" value={l.batchNo} onChange={(e) => upd(i, { batchNo: e.target.value })} /></div>
            <div><label className="label">মেয়াদ</label><input className="input" type="month" value={l.expiry} onChange={(e) => upd(i, { expiry: e.target.value })} /></div>
          </div>
          <div className="text-right font-semibold text-slate-800">{taka(l.qty * l.cost)}</div>
        </div>
      ))}

      <div className="rounded-3xl bg-ink text-white px-5 py-4 flex justify-between items-center">
        <span>মোট</span><span className="text-2xl font-bold">{taka(total)}</span>
      </div>

      <div>
        <label className="label">টাকা কীভাবে দিয়েছেন?</label>
        <div className="grid grid-cols-1 gap-2">
          {[['FULL', 'পুরো টাকা দিয়েছি', '💵'], ['PART', 'কিছু টাকা দিয়েছি', '➗'], ['DUE', 'বাকিতে এনেছি', '📕']].map(([k, v, ic]) => (
            <button key={k} onClick={() => setPay(k)} className={`rounded-2xl px-4 py-3 text-left font-semibold flex items-center gap-3 transition active:scale-95 ${pay === k ? 'bg-ink text-white' : 'bg-white text-slate-600 shadow-soft'}`}>
              <span className="text-xl">{ic}</span>{v}
            </button>
          ))}
        </div>
      </div>
      {pay === 'PART' && (
        <div className="card animate-fade-up">
          <input className="input" inputMode="decimal" placeholder="এখন কত টাকা দিলেন?" value={paid} onChange={(e) => setPaid(e.target.value)} />
          {total > 0 && <div className="badge bg-amber-100 text-amber-700 mt-2">বাকি থাকবে: {taka(Math.max(0, total - (Number(paid) || 0)))}</div>}
        </div>
      )}
      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}
      <button className="btn" disabled={busy} onClick={submit}>
        {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : '✔ মাল কেনা লিখে রাখুন'}
      </button>
    </AppShell>
  );
}