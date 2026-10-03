'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import BarcodeScanner from '@/components/BarcodeScanner';
import { gql, taka, timeOf, r2 } from '@/lib/api';

type Line = { p: any; qty: number; price: string; picked: string[]; avail: string[]; filter: string };
const PAY: [string, string][] = [['CASH', 'নগদ'], ['BKASH', 'বিকাশ'], ['PART', 'নগদ + বাকী'], ['DUE', 'পুরো বাকি']];
const qtyOf = (l: Line) => (l.p.trackSerial ? l.picked.length : l.qty);

export default function GadgetSell() {
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [cart, setCart] = useState<Line[]>([]);
  const [q, setQ] = useState('');
  const [scan, setScan] = useState<'' | 'main' | number>('');
  const [pay, setPay] = useState('CASH');
  const [paid, setPaid] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await gql(`query{
      products{ id name brand model category color barcode trackSerial warrantyMonths sellingPrice stock }
      customers{ id name balance }
      sales(period:TODAY){ id total dueAmount bkashAmount createdAt customer{ name } }
    }`);
    setProducts(d.products); setCustomers(d.customers); setSales(d.sales);
  };
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  // পণ্য কার্টে যোগ। IMEI-ওয়ালা হলে স্টকে থাকা IMEI-র তালিকা আনে; first = আগে থেকে বেছে নেওয়া IMEI
  const add = async (p: any, first?: string) => {
    setQ(''); setMsg(''); setErr('');
    if (p.stock <= 0) return setErr(`${p.name} — স্টকে নেই`);
    try {
      const avail = p.trackSerial ? (await gql(`query($p:ID!){ availableUnits(productId:$p){ serial } }`, { p: p.id })).availableUnits.map((u: any) => u.serial) : [];
      setCart((c) => {
        const i = c.findIndex((l) => l.p.id === p.id);
        if (i >= 0) {
          if (p.trackSerial) return first && !c[i].picked.includes(first) ? c.map((l, k) => (k === i ? { ...l, picked: [...l.picked, first] } : l)) : c;
          return c.map((l, k) => (k === i ? { ...l, qty: Math.min(l.qty + 1, p.stock) } : l));
        }
        return [...c, { p, qty: 1, price: String(p.sellingPrice || ''), picked: first ? [first] : [], avail, filter: '' }];
      });
    } catch (e: any) { setErr(e.message); }
  };
  const upd = (i: number, patch: Partial<Line>) => setCart((c) => c.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const toggle = (i: number, s: string) => upd(i, { picked: cart[i].picked.includes(s) ? cart[i].picked.filter((x) => x !== s) : [...cart[i].picked, s] });

  // বারকোড / IMEI স্ক্যান: প্রথমে পণ্যের বারকোড, না মিললে IMEI খুঁজে সেই ফোন কার্টে
  const byCode = async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const p = products.find((p) => p.barcode && p.barcode === code);
    if (p) return add(p);
    if (code.length >= 4) {
      try {
        const clean = code.replace(/\s+/g, '').toUpperCase();
        const d = await gql(`query($q:String!){ searchUnits(query:$q){ serial status productId } }`, { q: clean });
        const hit = d.searchUnits.find((u: any) => u.serial === clean && u.status === 'IN_STOCK') || (d.searchUnits.filter((u: any) => u.status === 'IN_STOCK').length === 1 ? d.searchUnits.find((u: any) => u.status === 'IN_STOCK') : null);
        const prod = hit && products.find((x) => x.id === hit.productId);
        if (prod) return add(prod, hit.serial);
        if (d.searchUnits.some((u: any) => u.serial === clean)) return setErr(`${clean} — এই IMEI আগেই বিক্রি হয়ে গেছে`);
      } catch {}
    }
    setErr(`"${code}" — পাওয়া যায়নি`);
  };
  const onScan = (code: string) => {
    const t = scan; setScan('');
    if (typeof t === 'number') {
      const s = code.replace(/\s+/g, '').toUpperCase();
      if (cart[t].avail.includes(s)) { if (!cart[t].picked.includes(s)) toggle(t, s); } else setErr(`${s} — এই পণ্যের স্টকে নেই`);
    } else byCode(code);
  };

  const found = q.trim() ? products.filter((p) => (p.name + ' ' + (p.category || '')).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const total = r2(cart.reduce((a, l) => a + qtyOf(l) * (Number(l.price) || 0), 0));
  const needCustomer = pay === 'DUE' || pay === 'PART';

  const submit = async () => {
    setErr(''); setMsg('');
    if (!cart.length) return setErr('কমপক্ষে একটি পণ্য যোগ করুন');
    for (const l of cart) {
      if (qtyOf(l) <= 0) return setErr(`${l.p.name}: ${l.p.trackSerial ? 'IMEI বেছে নিন' : 'পরিমাণ দিন'}`);
      if (!(Number(l.price) >= 0)) return setErr(`${l.p.name}: দাম ঠিক নয়`);
    }
    if (needCustomer && !customerId && !newName.trim()) return setErr('কাস্টমার বেছে নিন বা নাম লিখুন');
    let cash = 0, bkash = 0, due = 0;
    if (pay === 'CASH') cash = total;
    if (pay === 'BKASH') bkash = total;
    if (pay === 'DUE') due = total;
    if (pay === 'PART') { cash = Number(paid) || 0; due = r2(total - cash); if (due <= 0 || cash < 0) return setErr('নগদ টাকা মোট টাকার কম হতে হবে'); }
    setBusy(true);
    try {
      let cid = customerId;
      if (!cid && newName.trim()) {
        const c = await gql(`mutation($n:String!,$p:String){ createCustomer(name:$n,phone:$p){ id } }`, { n: newName.trim(), p: newPhone.trim() || null });
        cid = c.createCustomer.id;
      }
      await gql(`mutation($i:GadgetSaleInput!){ gadgetSale(input:$i){ id } }`, {
        i: {
          items: cart.map((l) => ({ productId: l.p.id, qty: qtyOf(l), price: Number(l.price), serials: l.p.trackSerial ? l.picked : null })),
          cashAmount: cash, bkashAmount: bkash, dueAmount: due, customerId: cid || null,
        },
      });
      const w = cart.filter((l) => l.p.warrantyMonths > 0).map((l) => `${l.p.name}: ${l.p.warrantyMonths} মাস`).join(' • ');
      setMsg(`বিক্রি সফল ✅ ${taka(total)}${w ? ` — ওয়ারেন্টি: ${w}` : ''}`);
      setCart([]); setPaid(''); setNewName(''); setNewPhone(''); setPay('CASH'); setCustomerId('');
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      {scan !== '' && <BarcodeScanner onScan={onScan} onClose={() => setScan('')} />}
      <h1 className="text-2xl font-bold">গ্যাজেট বিক্রি</h1>

      <div className="flex gap-2">
        <input className="input" placeholder="পণ্যের নাম / বারকোড / IMEI" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (found.length === 1 ? add(found[0]) : byCode(q))} />
        <button className="rounded-xl bg-emerald-600 text-white px-4 text-xl" onClick={() => setScan('main')}>📷</button>
      </div>
      {found.map((p) => (
        <button key={p.id} onClick={() => add(p)} className="card w-full text-left">
          <div className="flex justify-between gap-2"><b>{p.name}</b><span className={`text-sm shrink-0 ${p.stock === 0 ? 'text-rose-500' : 'text-gray-500'}`}>স্টক {p.stock}</span></div>
          <div className="text-sm text-gray-600">{[p.category, taka(p.sellingPrice)].filter(Boolean).join(' · ')}</div>
        </button>
      ))}

      {cart.map((l, i) => {
        const fl = l.filter.trim().toUpperCase();
        const list = l.avail.filter((s) => !fl || s.includes(fl)).slice(0, 40);
        return (
          <div key={l.p.id} className="card space-y-2">
            <div className="flex justify-between gap-2"><b>{l.p.name}</b><button className="text-rose-500" onClick={() => setCart(cart.filter((_, k) => k !== i))}>✕</button></div>
            <div className="text-xs text-gray-500">স্টক: {l.p.stock}টি{l.p.warrantyMonths > 0 && ` • ওয়ারেন্টি ${l.p.warrantyMonths} মাস`}</div>

            {l.p.trackSerial ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="label !mb-0">IMEI বেছে নিন</span>
                  <span className="text-sm font-semibold text-emerald-700">{l.picked.length}টি বাছা হয়েছে</span>
                </div>
                {l.picked.length > 0 && <div className="flex flex-wrap gap-1.5">{l.picked.map((s) => <button key={s} onClick={() => toggle(i, s)} className="badge bg-emerald-600 text-white font-mono !text-sm !py-1">{s} ✕</button>)}</div>}
                <div className="flex gap-2">
                  <input className="input !py-2 !text-base" placeholder="IMEI-র শেষ কয়েকটি ডিজিট লিখে খুঁজুন" value={l.filter} onChange={(e) => upd(i, { filter: e.target.value })} />
                  <button className="rounded-xl bg-emerald-600 text-white px-3" onClick={() => setScan(i)}>📷</button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {list.filter((s) => !l.picked.includes(s)).map((s) => <button key={s} onClick={() => toggle(i, s)} className="badge bg-slate-100 text-slate-700 font-mono !text-sm !py-1 active:scale-95">{s}</button>)}
                  {list.length === 0 && <span className="text-sm text-gray-400">মিলছে না</span>}
                </div>
              </div>
            ) : (
              <div><label className="label">পরিমাণ</label><input className="input" inputMode="numeric" value={l.qty} onChange={(e) => upd(i, { qty: Math.min(Math.max(Math.floor(Number(e.target.value)) || 0, 0), l.p.stock) })} /></div>
            )}

            <div><label className="label">বিক্রির দাম (প্রতিটি)</label><input className="input" inputMode="decimal" value={l.price} onChange={(e) => upd(i, { price: e.target.value })} /></div>
            <div className="text-right font-semibold">{taka(qtyOf(l) * (Number(l.price) || 0))}</div>
          </div>
        );
      })}
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
      <div className="space-y-2">
        <label className="label">{needCustomer ? 'কার নামে বাকি?' : 'কাস্টমার (ওয়ারেন্টির জন্য রাখলে ভালো)'}</label>
        <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">{needCustomer ? '— কাস্টমার বেছে নিন —' : '— কাস্টমার ছাড়া —'}</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name} (বাকি {taka(c.balance)})</option>)}
        </select>
        {!customerId && (
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="নতুন কাস্টমারের নাম" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input className="input" inputMode="tel" placeholder="মোবাইল (ঐচ্ছিক)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          </div>
        )}
      </div>

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