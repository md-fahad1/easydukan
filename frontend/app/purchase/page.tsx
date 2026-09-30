'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

type Line = { productId: string; name: string; qty: number; cost: number };
const PAY: [string, string, string][] = [['FULL', 'পুরো টাকা', '💵'], ['PART', 'কিছু টাকা', '➗'], ['DUE', 'বাকিতে', '📕']];

export default function Purchase() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [manual, setManual] = useState('');
  const [pay, setPay] = useState('FULL');
  const [paid, setPaid] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { gql(`query{ suppliers{id name balance} products{id name unit purchasePrice} }`).then((d) => { setSuppliers(d.suppliers); setProducts(d.products); }).catch((e) => setErr(e.message)); }, []);

  const total = lines.length ? lines.reduce((a, l) => a + l.qty * l.cost, 0) : Number(manual) || 0;
  const addLine = (id: string) => {
    const p = products.find((p) => p.id === id);
    if (p && !lines.find((l) => l.productId === id)) setLines([...lines, { productId: p.id, name: p.name, qty: 1, cost: p.purchasePrice }]);
  };
  const upd = (id: string, k: 'qty' | 'cost', v: number) => setLines(lines.map((l) => l.productId === id ? { ...l, [k]: v } : l));
  const remove = (id: string) => setLines(lines.filter((l) => l.productId !== id));

  const submit = async () => {
    setErr('');
    if (total <= 0) return setErr('মালের মোট টাকা দিন');
    const p = pay === 'FULL' ? total : pay === 'DUE' ? 0 : Number(paid) || 0;
    if (p < total && !supplierId) return setErr('বাকির জন্য মালদাতা বেছে নিন');
    setBusy(true);
    try {
      const input: any = { supplierId: supplierId || null, paid: p };
      if (lines.length) input.items = lines.map((l) => ({ productId: l.productId, qty: l.qty, cost: l.cost }));
      else input.total = total;
      await gql(`mutation($i:PurchaseInput!){ createPurchase(input:$i){ id } }`, { i: input });
      router.push('/mal');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-slate-800">📦 মাল কেনা</h1>

      <div className="card space-y-4">
        <div>
          <label className="label">🚚 কোথা থেকে?</label>
          <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— মালদাতা বেছে নিন —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} (দিতে হবে {taka(s.balance)})</option>)}
          </select>
        </div>
        <div>
          <label className="label">📦 পণ্য (স্টকে যোগ হবে)</label>
          <select className="input" value="" onChange={(e) => addLine(e.target.value)}>
            <option value="">+ পণ্য যোগ করুন</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {lines.map((l) => (
        <div key={l.productId} className="card animate-pop space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-800">{l.name}</div>
            <button onClick={() => remove(l.productId)} className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 active:scale-90 transition" aria-label="বাদ দিন">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">পরিমাণ</label><input className="input" inputMode="decimal" value={l.qty} onChange={(e) => upd(l.productId, 'qty', Number(e.target.value))} /></div>
            <div><label className="label">কেনা দাম</label><input className="input" inputMode="decimal" value={l.cost} onChange={(e) => upd(l.productId, 'cost', Number(e.target.value))} /></div>
          </div>
          <div className="text-right text-sm text-slate-500">লাইন মোট: <b className="text-slate-800">{taka(l.qty * l.cost)}</b></div>
        </div>
      ))}

      {lines.length === 0 && (
        <div className="card">
          <label className="label">অথবা শুধু মোট টাকা লিখুন</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-emerald-600">৳</span>
            <input className="input !pl-11 text-2xl" inputMode="decimal" placeholder="12500" value={manual} onChange={(e) => setManual(e.target.value)} />
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-3 flex justify-between items-center shadow-glow">
        <span>মোট</span><span className="text-2xl font-bold">{taka(total)}</span>
      </div>

      <div>
        <label className="label">পেমেন্ট</label>
        <div className="flex flex-wrap gap-2">
          {PAY.map(([k, v, ic]) => <button key={k} onClick={() => setPay(k)} className={`chip ${pay === k ? 'chip-on' : ''}`}>{ic} {v}</button>)}
        </div>
      </div>
      {pay === 'PART' && (
        <div className="card animate-fade-up">
          <input className="input" inputMode="decimal" placeholder="এখন কত টাকা দিলেন?" value={paid} onChange={(e) => setPaid(e.target.value)} />
          {total > 0 && <div className="badge bg-amber-100 text-amber-700 mt-2">বাকি থাকবে: {taka(total - (Number(paid) || 0))}</div>}
        </div>
      )}
      {err && <div className="animate-pop rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}
      <button className="btn" disabled={busy} onClick={submit}>
        {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : 'মাল কেনা যোগ করুন'}
      </button>
    </AppShell>
  );
}