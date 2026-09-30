'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka, timeOf } from '@/lib/api';

type Line = { productId: string; name: string; price: number; qty: number };
const PAY: [string, string][] = [['CASH', 'নগদ'], ['BKASH', 'বিকাশ'], ['PART', 'নগদ + বাকী'], ['DUE', 'পুরো বাকি']];

export default function Sale() {
  const [mode, setMode] = useState<'quick' | 'product'>('quick');
  const [amount, setAmount] = useState('');
  const [cart, setCart] = useState<Line[]>([]);
  const [q, setQ] = useState('');
  const [pay, setPay] = useState('CASH');
  const [paid, setPaid] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [newName, setNewName] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await gql(`query{ products{id name unit sellingPrice stock} customers{id name balance} sales(period:TODAY){id total dueAmount bkashAmount createdAt customer{name}} }`);
    setProducts(d.products); setCustomers(d.customers); setSales(d.sales);
  };
  useEffect(() => {
    load().catch((e) => setErr(e.message));
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('customer')) { setCustomerId(sp.get('customer')!); setPay('DUE'); }
    if (sp.get('due')) setPay('DUE');
  }, []);

  const total = mode === 'quick' ? Number(amount) || 0 : cart.reduce((a, l) => a + l.qty * l.price, 0);
  const needCustomer = pay === 'DUE' || pay === 'PART';

  const add = (p: any) => {
    setQ('');
    setCart((c) => c.find((l) => l.productId === p.id)
      ? c.map((l) => l.productId === p.id ? { ...l, qty: l.qty + 1 } : l)
      : [...c, { productId: p.id, name: p.name, price: p.sellingPrice, qty: 1 }]);
  };
  const setQty = (id: string, qty: number) => setCart((c) => c.map((l) => l.productId === id ? { ...l, qty } : l).filter((l) => l.qty > 0));

  const submit = async () => {
    setErr(''); setMsg('');
    if (total <= 0) return setErr('টাকার পরিমাণ দিন');
    if (needCustomer && !customerId && !newName.trim()) return setErr('কাস্টমার বেছে নিন বা নাম লিখুন');
    let cash = 0, bkash = 0, due = 0;
    if (pay === 'CASH') cash = total;
    if (pay === 'BKASH') bkash = total;
    if (pay === 'DUE') due = total;
    if (pay === 'PART') { cash = Number(paid) || 0; due = total - cash; if (due <= 0 || cash < 0) return setErr('নগদ টাকা মোট টাকার কম হতে হবে'); }
    setBusy(true);
    try {
      let cid = customerId;
      if (needCustomer && !cid) {
        const c = await gql(`mutation($n:String!){ createCustomer(name:$n){ id } }`, { n: newName });
        cid = c.createCustomer.id;
      }
      const input: any = { cashAmount: cash, bkashAmount: bkash, dueAmount: due, customerId: needCustomer ? cid : null };
      if (mode === 'quick') input.amount = total;
      else input.items = cart.map((l) => ({ productId: l.productId, qty: l.qty, price: l.price }));
      await gql(`mutation($i:SaleInput!){ createSale(input:$i){ id } }`, { i: input });
      setMsg(`বিক্রি সফল ✅ ${taka(total)}`);
      setAmount(''); setCart([]); setPaid(''); setNewName(''); setPay('CASH'); setCustomerId('');
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const found = q ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">আজকের বিক্রি</h1>
      <div className="flex gap-2">
        <button onClick={() => setMode('quick')} className={`chip flex-1 ${mode === 'quick' ? 'chip-on' : ''}`}>⚡ দ্রুত বিক্রি</button>
        <button onClick={() => setMode('product')} className={`chip flex-1 ${mode === 'product' ? 'chip-on' : ''}`}>📦 পণ্য দিয়ে</button>
      </div>

      {mode === 'quick' ? (
        <div><label className="label">টাকার পরিমাণ</label><input className="input text-3xl font-bold" inputMode="decimal" placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      ) : (
        <div className="space-y-3">
          <input className="input" placeholder="পণ্য খুঁজুন..." value={q} onChange={(e) => setQ(e.target.value)} />
          {found.map((p) => (
            <button key={p.id} onClick={() => add(p)} className="card w-full text-left flex justify-between">
              <span>{p.name}</span><span className="text-gray-500">{taka(p.sellingPrice)}/{p.unit} · স্টক {p.stock}</span>
            </button>
          ))}
          {cart.map((l) => (
            <div key={l.productId} className="card flex items-center justify-between gap-2">
              <div className="flex-1"><div className="font-medium">{l.name}</div><div className="text-sm text-gray-500">{taka(l.price)}</div></div>
              <input className="input !w-24 !py-2 text-center" inputMode="decimal" value={l.qty} onChange={(e) => setQty(l.productId, Number(e.target.value))} />
              <div className="w-20 text-right font-semibold">{taka(l.qty * l.price)}</div>
            </div>
          ))}
          {cart.length > 0 && <div className="text-right text-xl font-bold">মোট: {taka(total)}</div>}
        </div>
      )}

      <div>
        <label className="label">পেমেন্ট</label>
        <div className="flex flex-wrap gap-2">
          {PAY.map(([k, v]) => <button key={k} onClick={() => setPay(k)} className={`chip ${pay === k ? 'chip-on' : ''}`}>{v}</button>)}
        </div>
      </div>

      {pay === 'PART' && (
        <div><label className="label">এখন কত টাকা নগদ নিলেন?</label><input className="input" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} />
          {total > 0 && <div className="text-amber-600 mt-1">বাকি থাকবে: {taka(total - (Number(paid) || 0))}</div>}</div>
      )}
      {needCustomer && (
        <div className="space-y-2">
          <label className="label">কার নামে বাকি?</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— কাস্টমার বেছে নিন —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} (বাকি {taka(c.balance)})</option>)}
          </select>
          {!customerId && <input className="input" placeholder="অথবা নতুন কাস্টমারের নাম লিখুন" value={newName} onChange={(e) => setNewName(e.target.value)} />}
        </div>
      )}

      {err && <div className="text-rose-600">{err}</div>}
      {msg && <div className="text-emerald-700 font-semibold text-center">{msg}</div>}
      <button className="btn" disabled={busy} onClick={submit}>{busy ? '...' : 'বিক্রি যোগ করুন'}</button>

      <div className="pt-2">
        <h2 className="font-bold mb-2">আজকের বিক্রির তালিকা</h2>
        <div className="space-y-2">
          {sales.map((s) => (
            <div key={s.id} className="card flex justify-between">
              <div><div className="font-semibold">{taka(s.total)}</div><div className="text-sm text-gray-500">{s.customer?.name || 'সাধারণ'} · {timeOf(s.createdAt)}</div></div>
              <div className="text-sm text-right">{s.dueAmount > 0 && <div className="text-amber-600">বাকি {taka(s.dueAmount)}</div>}{s.bkashAmount > 0 && <div className="text-pink-600">বিকাশ</div>}</div>
            </div>
          ))}
          {sales.length === 0 && <div className="text-gray-400 text-center">আজ এখনো কোনো বিক্রি নেই</div>}
        </div>
      </div>
    </AppShell>
  );
}
