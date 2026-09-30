'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import BarcodeScanner from '@/components/BarcodeScanner';
import { gql, taka, timeOf, fmtStock, unitsFor, unitFactor, r2 } from '@/lib/api';

type Line = { p: any; unit: string; qty: number; price: number };
const PAY: [string, string][] = [['CASH', 'নগদ'], ['BKASH', 'বিকাশ'], ['PART', 'নগদ + বাকী'], ['DUE', 'পুরো বাকি']];

export default function PharmaSell() {
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [cart, setCart] = useState<Line[]>([]);
  const [q, setQ] = useState('');
  const [scan, setScan] = useState(false);
  const [pay, setPay] = useState('CASH');
  const [paid, setPaid] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await gql(`query{
      products{ id name genericName company barcode form piecesPerStrip stripsPerBox sellingPrice stock }
      customers{ id name balance }
      sales(period:TODAY){ id total dueAmount bkashAmount createdAt customer{ name } }
    }`);
    setProducts(d.products); setCustomers(d.customers); setSales(d.sales);
  };
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  const add = (p: any) => {
    setQ(''); setMsg(''); setErr('');
    const units = unitsFor(p);
    const unit = units.some((u) => u[0] === 'STRIP') ? 'STRIP' : 'PIECE';
    setCart((c) => {
      const i = c.findIndex((l) => l.p.id === p.id && l.unit === unit);
      if (i >= 0) return c.map((l, k) => (k === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { p, unit, qty: 1, price: r2(p.sellingPrice * unitFactor(p, unit)) }];
    });
  };
  const upd = (i: number, patch: Partial<Line>) => setCart((c) => c.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const setUnit = (i: number, unit: string) => upd(i, { unit, price: r2(cart[i].p.sellingPrice * unitFactor(cart[i].p, unit)) });

  const onScan = (code: string) => {
    setScan(false);
    const p = products.find((p) => p.barcode === code);
    if (p) add(p); else setErr(`বারকোড ${code} — এই ওষুধ পাওয়া যায়নি`);
  };

  const found = q ? products.filter((p) => (p.name + ' ' + (p.genericName || '') + ' ' + (p.company || '')).toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  // USB scanner বা Enter চাপলে: বারকোড মিললে অথবা একটাই রেজাল্ট থাকলে যোগ হবে
  const onEnter = () => {
    const byCode = products.find((p) => p.barcode && p.barcode === q.trim());
    if (byCode) return add(byCode);
    if (found.length === 1) add(found[0]);
  };

  const total = r2(cart.reduce((a, l) => a + l.qty * l.price, 0));
  const needCustomer = pay === 'DUE' || pay === 'PART';

  const submit = async () => {
    setErr(''); setMsg('');
    if (!cart.length) return setErr('কমপক্ষে একটি ওষুধ যোগ করুন');
    if (needCustomer && !customerId && !newName.trim()) return setErr('কাস্টমার বেছে নিন বা নাম লিখুন');
    let cash = 0, bkash = 0, due = 0;
    if (pay === 'CASH') cash = total;
    if (pay === 'BKASH') bkash = total;
    if (pay === 'DUE') due = total;
    if (pay === 'PART') { cash = Number(paid) || 0; due = r2(total - cash); if (due <= 0 || cash < 0) return setErr('নগদ টাকা মোট টাকার কম হতে হবে'); }
    setBusy(true);
    try {
      let cid = customerId;
      if (needCustomer && !cid) {
        const c = await gql(`mutation($n:String!){ createCustomer(name:$n){ id } }`, { n: newName });
        cid = c.createCustomer.id;
      }
      await gql(`mutation($i:PharmaSaleInput!){ pharmacySale(input:$i){ id } }`, {
        i: {
          items: cart.map((l) => ({ productId: l.p.id, unit: l.unit, qty: l.qty, price: l.price })),
          cashAmount: cash, bkashAmount: bkash, dueAmount: due, customerId: needCustomer ? cid : null,
        },
      });
      setMsg(`বিক্রি সফল ✅ ${taka(total)}`);
      setCart([]); setPaid(''); setNewName(''); setPay('CASH'); setCustomerId('');
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      {scan && <BarcodeScanner onScan={onScan} onClose={() => setScan(false)} />}
      <h1 className="text-2xl font-bold">ওষুধ বিক্রি</h1>

      <div className="flex gap-2">
        <input className="input" placeholder="নাম / জেনেরিক / বারকোড" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onEnter()} />
        <button className="rounded-xl bg-emerald-600 text-white px-4 text-xl" onClick={() => setScan(true)}>📷</button>
      </div>
      {found.map((p) => (
        <button key={p.id} onClick={() => add(p)} className="card w-full text-left">
          <div className="flex justify-between"><b>{p.name}</b><span className="text-sm text-gray-500">স্টক {fmtStock(p.stock, p)}</span></div>
          <div className="text-xs text-gray-500">{[p.genericName, p.company].filter(Boolean).join(' · ')}</div>
          <div className="text-sm text-gray-600">{unitsFor(p).map(([k, l]) => `${l} ${taka(r2(p.sellingPrice * unitFactor(p, k)))}`).join(' · ')}</div>
        </button>
      ))}

      {cart.map((l, i) => (
        <div key={i} className="card space-y-2">
          <div className="flex justify-between"><b>{l.p.name}</b><button className="text-rose-500" onClick={() => setCart(cart.filter((_, k) => k !== i))}>✕</button></div>
          <div className="text-xs text-gray-500">স্টক: {fmtStock(l.p.stock, l.p)}</div>
          <div className="flex gap-2">{unitsFor(l.p).map(([k, v]) => <button key={k} onClick={() => setUnit(i, k)} className={`chip ${l.unit === k ? 'chip-on' : ''}`}>{v}</button>)}</div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">পরিমাণ</label><input className="input" inputMode="decimal" value={l.qty} onChange={(e) => upd(i, { qty: Number(e.target.value) })} /></div>
            <div><label className="label">দাম (প্রতি ইউনিট)</label><input className="input" inputMode="decimal" value={l.price} onChange={(e) => upd(i, { price: Number(e.target.value) })} /></div>
          </div>
          <div className="text-right font-semibold">{taka(l.qty * l.price)}</div>
        </div>
      ))}
      {cart.length > 0 && <div className="text-right text-2xl font-bold">মোট: {taka(total)}</div>}

      <div>
        <label className="label">পেমেন্ট</label>
        <div className="flex flex-wrap gap-2">{PAY.map(([k, v]) => <button key={k} onClick={() => setPay(k)} className={`chip ${pay === k ? 'chip-on' : ''}`}>{v}</button>)}</div>
      </div>
      {pay === 'PART' && (
        <div>
          <label className="label">এখন কত টাকা নগদ নিলেন?</label>
          <input className="input" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} />
          {total > 0 && <div className="text-amber-600 mt-1">বাকি থাকবে: {taka(total - (Number(paid) || 0))}</div>}
        </div>
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
        <h2 className="font-bold mb-2">আজকের বিক্রি</h2>
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