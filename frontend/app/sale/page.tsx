'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka, timeOf } from '@/lib/api';

type Line = { productId: string; name: string; price: number; qty: number };
const PAY: [string, string, string][] = [['CASH', 'নগদ', '💵'], ['BKASH', 'বিকাশ', '📲'], ['PART', 'নগদ + বাকী', '➗'], ['DUE', 'পুরো বাকি', '📕']];
const QUICK = [50, 100, 200, 500, 1000]; // দ্রুত টাকা যোগ করার বাটন

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
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await gql(`query{ products{id name unit sellingPrice stock} customers{id name balance} sales(period:TODAY){id total dueAmount bkashAmount createdAt customer{name}} }`);
    setProducts(d.products); setCustomers(d.customers); setSales(d.sales);
  };
  useEffect(() => {
    load().catch((e) => setErr(e.message)).finally(() => setLoaded(true));
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
  const todayTotal = sales.reduce((a, s) => a + (s.total || 0), 0);

  return (
    <AppShell>
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold text-slate-800">আজকের বিক্রি</h1>
        {sales.length > 0 && <span className="badge bg-emerald-100 text-emerald-700">{sales.length}টি · {taka(todayTotal)}</span>}
      </div>

      {/* মোড বাছাই */}
      <div className="flex gap-2">
        <button onClick={() => setMode('quick')} className={`chip flex-1 ${mode === 'quick' ? 'chip-on' : ''}`}>⚡ দ্রুত বিক্রি</button>
        <button onClick={() => setMode('product')} className={`chip flex-1 ${mode === 'product' ? 'chip-on' : ''}`}>📦 পণ্য দিয়ে</button>
      </div>

      {mode === 'quick' ? (
        <div className="card space-y-3">
          <label className="label">টাকার পরিমাণ</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-emerald-600">৳</span>
            <input className="input !pl-11 text-3xl font-bold" inputMode="decimal" placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((n) => (
              <button key={n} onClick={() => setAmount(String((Number(amount) || 0) + n))} className="chip !py-1.5 !px-3 text-sm">+{n}</button>
            ))}
            {amount && <button onClick={() => setAmount('')} className="chip !py-1.5 !px-3 text-sm !text-rose-600 !border-rose-200">মুছুন</button>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            <input className="input !pl-12" placeholder="পণ্য খুঁজুন..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {q && found.length === 0 && <div className="text-slate-400 text-center animate-fade-in">কোনো পণ্য পাওয়া যায়নি</div>}
          {found.map((p, i) => (
            <button key={p.id} onClick={() => add(p)} style={{ animationDelay: `${i * 40}ms` }} className="card animate-fade-up w-full text-left flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">{p.name}</span>
              <span className="text-slate-500 text-sm text-right">{taka(p.sellingPrice)}/{p.unit}<br />স্টক {p.stock}</span>
            </button>
          ))}
          {cart.map((l) => (
            <div key={l.productId} className="card animate-pop flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 truncate">{l.name}</div>
                <div className="text-sm text-slate-500">{taka(l.price)}</div>
              </div>
              {/* − সংখ্যা + */}
              <div className="flex items-center gap-1">
                <button onClick={() => setQty(l.productId, l.qty - 1)} className="w-9 h-9 rounded-full bg-slate-100 text-xl font-bold text-slate-600 active:scale-90 transition">−</button>
                <input className="input !w-16 !py-1.5 !px-1 !text-base text-center" inputMode="decimal" value={l.qty} onChange={(e) => setQty(l.productId, Number(e.target.value))} />
                <button onClick={() => setQty(l.productId, l.qty + 1)} className="w-9 h-9 rounded-full bg-emerald-100 text-xl font-bold text-emerald-700 active:scale-90 transition">+</button>
              </div>
              <div className="w-20 text-right font-semibold text-slate-800">{taka(l.qty * l.price)}</div>
            </div>
          ))}
          {cart.length > 0 && (
            <div className="animate-pop rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-3 flex justify-between items-center shadow-glow">
              <span>মোট</span><span className="text-2xl font-bold">{taka(total)}</span>
            </div>
          )}
          {cart.length === 0 && !q && <div className="text-slate-400 text-center py-4">👆 উপরে পণ্যের নাম লিখে খুঁজুন</div>}
        </div>
      )}

      {/* পেমেন্ট */}
      <div>
        <label className="label">পেমেন্ট</label>
        <div className="flex flex-wrap gap-2">
          {PAY.map(([k, v, ic]) => <button key={k} onClick={() => setPay(k)} className={`chip ${pay === k ? 'chip-on' : ''}`}>{ic} {v}</button>)}
        </div>
      </div>

      {pay === 'PART' && (
        <div className="card animate-fade-up">
          <label className="label">এখন কত টাকা নগদ নিলেন?</label>
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

      {err && <div className="animate-pop rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}
      {msg && <div className="animate-pop rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold px-4 py-3 text-center">{msg}</div>}
      <button className="btn" disabled={busy} onClick={submit}>
        {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : `বিক্রি যোগ করুন${total > 0 ? ' · ' + taka(total) : ''}`}
      </button>

      {/* আজকের তালিকা */}
      <div className="pt-2">
        <h2 className="font-bold text-slate-700 mb-2">আজকের বিক্রির তালিকা</h2>
        <div className="space-y-2 stagger">
          {!loaded && [0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}
          {sales.map((s) => (
            <div key={s.id} className="card flex items-center gap-3 !p-3">
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-emerald-50 flex items-center justify-center text-lg">🧾</div>
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
          {loaded && sales.length === 0 && (
            <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">🛍️</div>আজ এখনো কোনো বিক্রি নেই</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}