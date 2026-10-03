'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import BarcodeScanner from '@/components/BarcodeScanner';
import { gql, taka, timeOf, fmtStock, unitsFor, unitFactor, r2 } from '@/lib/api';

type Line = { p: any; unit: string; qty: number; price: number };
const PAY: [string, string, string][] = [['CASH', 'নগদ', '💵'], ['BKASH', 'বিকাশ', '📲'], ['PART', 'কিছু নগদ, বাকি বাকি', '➗'], ['DUE', 'পুরো বাকি', '📕']];

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

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(t);
  }, [msg]);

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
    if (needCustomer && !customerId && !newName.trim()) return setErr('কার নামে বাকি? কাস্টমার বেছে নিন বা নাম লিখুন');
    let cash = 0, bkash = 0, due = 0;
    if (pay === 'CASH') cash = total;
    if (pay === 'BKASH') bkash = total;
    if (pay === 'DUE') due = total;
    if (pay === 'PART') { cash = Number(paid) || 0; due = r2(total - cash); if (due <= 0 || cash < 0) return setErr('নগদ টাকা মোট টাকার চেয়ে কম হতে হবে'); }
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
      setMsg(`বিক্রি লেখা হয়েছে ✅ ${taka(total)}`);
      setCart([]); setPaid(''); setNewName(''); setPay('CASH'); setCustomerId('');
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      {scan && <BarcodeScanner onScan={onScan} onClose={() => setScan(false)} />}
      <h1 className="text-2xl font-bold text-slate-800">💊 ওষুধ বিক্রি</h1>

      {msg && <div className="animate-pop rounded-2xl bg-brand-50 text-brand-700 font-semibold px-4 py-3 text-center">{msg}</div>}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          <input className="input !pl-12" placeholder="ওষুধের নাম / বারকোড" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onEnter()} />
        </div>
        <button className="rounded-2xl bg-ink text-white px-5 text-xl active:scale-95 transition" onClick={() => setScan(true)} aria-label="স্ক্যান করুন">📷</button>
      </div>

      {q && found.length === 0 && <div className="text-slate-400 text-center animate-fade-in">এই নামে কোনো ওষুধ নেই</div>}
      {found.map((p, i) => (
        <button key={p.id} onClick={() => add(p)} style={{ animationDelay: `${i * 40}ms` }} className="card animate-fade-up w-full text-left">
          <div className="flex justify-between"><b className="text-slate-800">{p.name}</b><span className="text-sm text-slate-500">আছে {fmtStock(p.stock, p)}</span></div>
          <div className="text-xs text-slate-500">{[p.genericName, p.company].filter(Boolean).join(' · ')}</div>
          <div className="text-sm text-slate-600">{unitsFor(p).map(([k, l]) => `${l} ${taka(r2(p.sellingPrice * unitFactor(p, k)))}`).join(' · ')}</div>
        </button>
      ))}

      {cart.map((l, i) => (
        <div key={i} className="card animate-pop space-y-2">
          <div className="flex justify-between items-center">
            <b className="text-slate-800">{l.p.name}</b>
            <button className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 active:scale-90 transition" onClick={() => setCart(cart.filter((_, k) => k !== i))} aria-label="বাদ দিন">✕</button>
          </div>
          <div className="text-xs text-slate-500">স্টকে আছে: {fmtStock(l.p.stock, l.p)}</div>
          <div className="flex gap-2">
            {unitsFor(l.p).map(([k, v]) => (
              <button key={k} onClick={() => setUnit(i, k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold transition active:scale-95 ${l.unit === k ? 'bg-ink text-white' : 'bg-slate-100 text-slate-600'}`}>{v}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">কতটা</label><input className="input" inputMode="decimal" value={l.qty} onChange={(e) => upd(i, { qty: Number(e.target.value) })} /></div>
            <div><label className="label">দাম (প্রতিটার)</label><input className="input" inputMode="decimal" value={l.price} onChange={(e) => upd(i, { price: Number(e.target.value) })} /></div>
          </div>
          <div className="text-right font-semibold text-slate-800">{taka(l.qty * l.price)}</div>
        </div>
      ))}
      {cart.length > 0 && (
        <div className="animate-pop rounded-3xl bg-ink text-white px-5 py-4 flex justify-between items-center">
          <span>মোট</span><span className="text-2xl font-bold">{taka(total)}</span>
        </div>
      )}
      {cart.length === 0 && !q && <div className="text-slate-400 text-center py-4">👆 উপরে ওষুধের নাম লিখুন বা 📷 দিয়ে স্ক্যান করুন</div>}

      <div>
        <label className="label">টাকা কীভাবে পেলেন?</label>
        <div className="grid grid-cols-2 gap-2">
          {PAY.map(([k, v, ic]) => (
            <button key={k} onClick={() => setPay(k)} className={`rounded-2xl px-3 py-3 text-left font-semibold flex items-center gap-2 transition active:scale-95 ${pay === k ? 'bg-ink text-white' : 'bg-white text-slate-600 shadow-soft'}`}>
              <span className="text-xl">{ic}</span><span className="text-sm leading-tight">{v}</span>
            </button>
          ))}
        </div>
      </div>
      {pay === 'PART' && (
        <div className="card animate-fade-up">
          <label className="label">এখন কত টাকা নগদ পেলেন?</label>
          <input className="input" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} />
          {total > 0 && <div className="badge bg-amber-100 text-amber-700 mt-2">বাকি থাকবে: {taka(total - (Number(paid) || 0))}</div>}
        </div>
      )}
      {needCustomer && (
        <div className="card animate-fade-up space-y-2">
          <label className="label">কার নামে বাকি?</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— কাস্টমার বেছে নিন —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} (বাকি {taka(c.balance)})</option>)}
          </select>
          {!customerId && <input className="input" placeholder="অথবা নতুন কাস্টমারের নাম লিখুন" value={newName} onChange={(e) => setNewName(e.target.value)} />}
        </div>
      )}

      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}
      <button className="btn" disabled={busy} onClick={submit}>
        {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : `✔ বিক্রি লিখে রাখুন${total > 0 ? ' · ' + taka(total) : ''}`}
      </button>

      <div className="pt-2">
        <h2 className="font-bold text-slate-700 mb-2">আজকের বিক্রির তালিকা</h2>
        <div className="space-y-2 stagger">
          {sales.map((s) => (
            <div key={s.id} className="card flex items-center gap-3 !p-3">
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-brand-50 flex items-center justify-center text-lg">🧾</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800">{taka(s.total)}</div>
                <div className="text-sm text-slate-500 truncate">{s.customer?.name || 'সাধারণ'} · {timeOf(s.createdAt)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {s.dueAmount > 0 && <span className="badge bg-amber-100 text-amber-700">বাকি {taka(s.dueAmount)}</span>}
                {s.bkashAmount > 0 && <span className="badge bg-pink-100 text-pink-600">বিকাশ</span>}
              </div>
            </div>
          ))}
          {sales.length === 0 && <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">🛍️</div>আজ এখনো কোনো বিক্রি নেই</div>}
        </div>
      </div>
    </AppShell>
  );
}