'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const Row = ({ l, v, b = false }: any) => (
  <div className={`flex justify-between py-1.5 ${b ? 'font-bold text-lg text-slate-800' : 'text-slate-600'}`}><span>{l}</span><span>{v}</span></div>
);

export default function Closing() {
  const [s, setS] = useState<any>(null);
  const [past, setPast] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const load = async () => {
    const d = await gql(`query{ summary(period:TODAY){ totalSale cash bkash due expense profit cashInHand } closings{ id date totalSale expense profit } }`);
    setS(d.summary); setPast(d.closings);
  };
  useEffect(() => { load().catch((e) => setErr(e.message)); }, []);

  const close = async () => {
    setErr(''); setBusy(true);
    try { await gql(`mutation{ closeDay{ id } }`); setMsg('আজকের হিসাব বন্ধ হয়েছে ✅'); setConfirm(false); await load(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-slate-800">আজকের হিসাব</h1>

      {!s && !err && <div className="skeleton h-72" />}

      {s && (
        <>
          <div className="card">
            <Row l="মোট বিক্রি" v={taka(s.totalSale)} b />
            <Row l="💵 নগদ" v={taka(s.cash)} />
            <Row l="📲 বিকাশ" v={taka(s.bkash)} />
            <Row l="📕 বাকিতে" v={taka(s.due)} />
            <hr className="my-2 border-slate-100" />
            <Row l="মোট খরচ" v={taka(s.expense)} b />
            <Row l="👛 হাতে থাকার কথা" v={taka(s.cashInHand)} b />
          </div>

          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white p-5 shadow-glow">
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
            <div className="relative">
              <div className="text-brand-50 text-sm">আজকের লাভ*</div>
              <div className="text-4xl font-bold mt-1">{taka(s.profit)}</div>
              <div className="text-xs text-brand-50 mt-2">* আনুমানিক। পণ্যের কেনা দাম দেওয়া থাকলে সঠিক হবে।</div>
            </div>
          </div>
        </>
      )}

      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}
      {msg && <div className="animate-pop rounded-2xl bg-brand-50 text-brand-700 font-semibold px-4 py-3 text-center">{msg}</div>}

      {!confirm ? (
        <button className="btn-dark" onClick={() => setConfirm(true)}>🔒 আজকের হিসাব শেষ করুন</button>
      ) : (
        <div className="card animate-pop space-y-3">
          <div className="font-bold text-slate-800 text-center">আজকের হিসাব শেষ করবেন?</div>
          <div className="text-sm text-slate-500 text-center">শেষ করলে আজকের হিসাব খাতায় জমা হয়ে যাবে।</div>
          <div className="grid grid-cols-2 gap-3">
            <button className="rounded-full bg-slate-100 text-slate-600 font-semibold py-3 active:scale-95 transition" onClick={() => setConfirm(false)}>না</button>
            <button className="rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold py-3 shadow-glow active:scale-95 transition disabled:opacity-50" disabled={busy} onClick={close}>
              {busy ? <span className="inline-block w-5 h-5 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : 'হ্যাঁ, শেষ করুন'}
            </button>
          </div>
        </div>
      )}

      <h2 className="font-bold text-slate-700 pt-2">আগের দিনের হিসাব</h2>
      <div className="space-y-2 stagger">
        {past.map((p) => (
          <div key={p.id} className="card !p-3">
            <div className="font-semibold text-slate-800 mb-1">📅 {p.date}</div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><div className="text-slate-500">বিক্রি</div><div className="font-semibold">{taka(p.totalSale)}</div></div>
              <div><div className="text-slate-500">খরচ</div><div className="font-semibold text-rose-600">{taka(p.expense)}</div></div>
              <div><div className="text-slate-500">লাভ</div><div className="font-bold text-brand-700">{taka(p.profit)}</div></div>
            </div>
          </div>
        ))}
        {past.length === 0 && <div className="text-slate-400 text-center py-4">এখনো কোনো দিনের হিসাব শেষ করা হয়নি</div>}
      </div>
    </AppShell>
  );
}