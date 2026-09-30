'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

type Line = { productId: string; name: string; qty: number; cost: number };

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
      <h1 className="text-2xl font-bold">মাল কেনা</h1>
      <div>
        <label className="label">কোথা থেকে?</label>
        <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
          <option value="">— মালদাতা বেছে নিন —</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} (দিতে হবে {taka(s.balance)})</option>)}
        </select>
      </div>
      <div>
        <label className="label">পণ্য (স্টকে যোগ হবে)</label>
        <select className="input" value="" onChange={(e) => addLine(e.target.value)}>
          <option value="">+ পণ্য যোগ করুন</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {lines.map((l) => (
        <div key={l.productId} className="card space-y-2">
          <div className="font-medium">{l.name}</div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">পরিমাণ</label><input className="input" inputMode="decimal" value={l.qty} onChange={(e) => upd(l.productId, 'qty', Number(e.target.value))} /></div>
            <div><label className="label">কেনা দাম</label><input className="input" inputMode="decimal" value={l.cost} onChange={(e) => upd(l.productId, 'cost', Number(e.target.value))} /></div>
          </div>
        </div>
      ))}
      {lines.length === 0 && <div><label className="label">অথবা শুধু মোট টাকা লিখুন</label><input className="input" inputMode="decimal" placeholder="12500" value={manual} onChange={(e) => setManual(e.target.value)} /></div>}
      <div className="text-right text-xl font-bold">মোট: {taka(total)}</div>
      <div>
        <label className="label">পেমেন্ট</label>
        <div className="flex flex-wrap gap-2">
          {[['FULL', 'পুরো টাকা'], ['PART', 'কিছু টাকা'], ['DUE', 'বাকিতে']].map(([k, v]) => <button key={k} onClick={() => setPay(k)} className={`chip ${pay === k ? 'chip-on' : ''}`}>{v}</button>)}
        </div>
      </div>
      {pay === 'PART' && <input className="input" inputMode="decimal" placeholder="এখন কত টাকা দিলেন?" value={paid} onChange={(e) => setPaid(e.target.value)} />}
      {err && <div className="text-rose-600">{err}</div>}
      <button className="btn" disabled={busy} onClick={submit}>মাল কেনা যোগ করুন</button>
    </AppShell>
  );
}
