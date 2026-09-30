'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const Row = ({ l, v, b = false }: any) => <div className={`flex justify-between py-1 ${b ? 'font-bold text-lg' : ''}`}><span>{l}</span><span>{v}</span></div>;

export default function Closing() {
  const [s, setS] = useState<any>(null);
  const [past, setPast] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    const d = await gql(`query{ summary(period:TODAY){ totalSale cash bkash due expense profit cashInHand } closings{ id date totalSale expense profit } }`);
    setS(d.summary); setPast(d.closings);
  };
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  const close = async () => {
    setErr('');
    try { await gql(`mutation{ closeDay{ id } }`); setMsg('আজকের হিসাব বন্ধ হয়েছে ✅'); await load(); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">আজকের হিসাব</h1>
      {s && (
        <div className="card">
          <Row l="মোট বিক্রি" v={taka(s.totalSale)} b />
          <Row l="নগদ" v={taka(s.cash)} />
          <Row l="বিকাশ" v={taka(s.bkash)} />
          <Row l="বাকিতে" v={taka(s.due)} />
          <hr className="my-2" />
          <Row l="মোট খরচ" v={taka(s.expense)} b />
          <Row l="হাতে থাকার কথা" v={taka(s.cashInHand)} b />
          <hr className="my-2" />
          <Row l="আজকের লাভ*" v={taka(s.profit)} b />
          <div className="text-xs text-gray-400 mt-1">* আনুমানিক — পণ্যের ক্রয় মূল্য দেওয়া থাকলে সঠিক হবে</div>
        </div>
      )}
      {err && <div className="text-rose-600">{err}</div>}
      {msg && <div className="text-emerald-700 text-center font-semibold">{msg}</div>}
      <button className="btn" onClick={close}>🔒 হিসাব বন্ধ করুন</button>
      <h2 className="font-bold pt-2">আগের দিনের হিসাব</h2>
      <div className="space-y-2">
        {past.map((p) => (
          <div key={p.id} className="card flex justify-between text-sm">
            <span>{p.date}</span><span>বিক্রি {taka(p.totalSale)}</span><span>খরচ {taka(p.expense)}</span><b className="text-emerald-700">লাভ {taka(p.profit)}</b>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
