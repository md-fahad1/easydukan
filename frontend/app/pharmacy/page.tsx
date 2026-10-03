'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { gql, taka, fmtStock } from '@/lib/api';

const Q = `query($d:Int!){
  summary(period:TODAY){ totalSale expense due cashInHand profit customerDue supplierDue }
  salesTrend(days:$d){ date sale due expense profit }
  lowStockMedicines{ id name stock minStock piecesPerStrip stripsPerBox form }
  expiringBatches(days:90){ id productName batchNo expiry qty expired piecesPerStrip stripsPerBox }
  topSelling(days:30){ productId name pieces revenue piecesPerStrip stripsPerBox }
}`;

const mon = (d: string) => new Date(d).toLocaleDateString('bn-BD', { month: 'short', year: 'numeric' });

function Stat({ l, v, icon, tone, c = '' }: { l: string; v: string; icon: string; tone: string; c?: string }) {
  return (
    <div className="card">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-2 ${tone}`}>{icon}</div>
      <div className="text-slate-500 text-sm">{l}</div>
      <div className={`text-xl font-bold ${c || 'text-slate-800'}`}>{v}</div>
    </div>
  );
}

function Big({ href, icon, label, sub, tone }: { href: string; icon: string; label: string; sub: string; tone: string }) {
  return (
    <Link href={href} className="card flex flex-col gap-2 !p-4 min-h-[118px]">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${tone}`}>{icon}</div>
      <div>
        <div className="font-bold text-slate-800 text-[17px] leading-tight">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      </div>
    </Link>
  );
}

export default function PharmacyHome() {
  const [days, setDays] = useState(7);
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');

  const load = () => gql(Q, { d: days }).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [days]);

  const discard = async (id: string) => {
    if (!confirm('এই ব্যাচের বাকি স্টক বাদ দেবেন?')) return;
    try { await gql(`mutation($id:ID!){ discardBatch(batchId:$id) }`, { id }); load(); } catch (e: any) { setErr(e.message); }
  };

  const s = d?.summary;
  const tr: any[] = d?.salesTrend || [];
  const tot = (k: string) => tr.reduce((a, x) => a + x[k], 0);
  const max = Math.max(1, ...tr.map((x) => x.sale));
  const today = new Date().toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">ফার্মেসি হিসাব</h1>
        <div className="text-slate-500 text-sm">{today}</div>
      </div>
      {err && <div className="rounded-2xl bg-rose-50 text-rose-700 px-4 py-3">⚠️ {err}</div>}
      {!d && !err && <><div className="skeleton h-36" /><div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}</div></>}

      {s && (
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white p-5 shadow-glow">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute right-12 -bottom-12 w-32 h-32 rounded-full bg-white/10" />
          <div className="relative">
            <div className="text-brand-50 text-sm">আজ মোট বিক্রি</div>
            <div className="text-4xl font-bold mt-1">{taka(s.totalSale)}</div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1.5 text-sm">
              <span>📈 আনুমানিক লাভ</span><b>{taka(s.profit)}</b>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="font-bold text-slate-700 mb-2">কী করতে চান?</div>
        <div className="grid grid-cols-2 gap-3">
          <Big href="/pharmacy/sell" icon="💊" tone="bg-brand-50" label="ওষুধ বিক্রি" sub="নতুন বিক্রি লিখুন" />
          <Big href="/pharmacy/purchase" icon="📦" tone="bg-sky-50" label="মাল কিনেছি" sub="কোম্পানি থেকে আনলে" />
          <Big href="/baki" icon="📕" tone="bg-amber-50" label="বাকির টাকা নিন" sub="কেউ টাকা দিলে" />
          <Big href="/expense" icon="💸" tone="bg-rose-50" label="খরচ লিখুন" sub="ভাড়া, বিল ইত্যাদি" />
        </div>
      </div>

      {s && (
        <div className="grid grid-cols-2 gap-3 stagger">
          <Stat l="আজকের খরচ" v={taka(s.expense)} icon="💸" tone="bg-rose-50" c="text-rose-600" />
          <Stat l="আজ বাকিতে গেছে" v={taka(s.due)} icon="📕" tone="bg-amber-50" c="text-amber-600" />
          <Stat l="হাতে থাকার কথা" v={taka(s.cashInHand)} icon="👛" tone="bg-brand-50" />
          <Stat l="কাস্টমারের কাছে পাবেন" v={taka(s.customerDue)} icon="👥" tone="bg-sky-50" c="text-amber-600" />
          <Stat l="কোম্পানিকে দিতে হবে" v={taka(s.supplierDue)} icon="🚚" tone="bg-violet-50" c="text-rose-600" />
        </div>
      )}

      <div className="flex gap-1.5 bg-white rounded-full p-1.5 shadow-soft">
        {[7, 30].map((x) => (
          <button key={x} onClick={() => setDays(x)} className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${days === x ? 'bg-ink text-white' : 'text-slate-500'}`}>{x} দিন</button>
        ))}
      </div>

      {d && (
        <div className="card space-y-3">
          <div className="grid grid-cols-3 text-center">
            <div><div className="text-xs text-slate-500">বিক্রি</div><b className="text-brand-700">{taka(tot('sale'))}</b></div>
            <div><div className="text-xs text-slate-500">বাকি</div><b className="text-amber-600">{taka(tot('due'))}</b></div>
            <div><div className="text-xs text-slate-500">খরচ</div><b className="text-rose-600">{taka(tot('expense'))}</b></div>
          </div>
          <div className="flex items-end gap-[3px] h-32">
            {tr.map((x) => (
              <div key={x.date} className="flex-1 flex flex-col justify-end items-center h-full">
                <div className="w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-lg" style={{ height: `${(x.sale / max) * 100}%`, minHeight: x.sale > 0 ? 3 : 0 }} />
                <div className="text-[9px] text-slate-500 mt-1">{x.date.slice(8)}</div>
              </div>
            ))}
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            {[...tr].reverse().map((x) => (
              <div key={x.date} className="flex justify-between py-1.5">
                <span className="text-slate-500">{x.date.slice(5)}</span>
                <span>বিক্রি {taka(x.sale)}</span>
                <span className="text-amber-600">বাকি {taka(x.due)}</span>
                <span className="text-rose-600">খরচ {taka(x.expense)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d && (
        <div className="card">
          <div className="font-bold text-slate-800 mb-2">⏳ মেয়াদ শেষ হচ্ছে / হয়ে গেছে (৯০ দিনের মধ্যে)</div>
          {d.expiringBatches.length === 0 && <div className="text-slate-400 text-sm">কিছু নেই ✅</div>}
          <div className="space-y-2">
            {d.expiringBatches.map((e: any) => (
              <div key={e.id} className={`rounded-2xl p-3 ${e.expired ? 'bg-rose-50' : 'bg-amber-50'}`}>
                <div className="flex justify-between">
                  <b className="text-slate-800">{e.productName}</b>
                  <span className={e.expired ? 'text-rose-600 font-semibold' : 'text-amber-700'}>{e.expired ? 'মেয়াদ শেষ' : mon(e.expiry)}</span>
                </div>
                <div className="text-sm text-slate-600">ব্যাচ {e.batchNo || '-'} · {fmtStock(e.qty, e)} · মেয়াদ {mon(e.expiry)}</div>
                {e.expired && <button className="text-sm text-rose-600 underline mt-1" onClick={() => discard(e.id)}>স্টক থেকে বাদ দিন</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {d && (
        <div className="card">
          <div className="font-bold text-slate-800 mb-2">⚠️ শেষ হয়ে আসছে — {d.lowStockMedicines.length}টি ওষুধ</div>
          {d.lowStockMedicines.length === 0 && <div className="text-slate-400 text-sm">সব ঠিক আছে ✅</div>}
          <div className="divide-y divide-slate-100">
            {d.lowStockMedicines.map((m: any) => (
              <div key={m.id} className="flex justify-between py-2 text-sm">
                <span>{m.name}</span>
                <span className="text-rose-600 font-semibold">{fmtStock(m.stock, m)} <span className="text-slate-400 font-normal">/ সীমা {fmtStock(m.minStock, m)}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d && (
        <div className="card">
          <div className="font-bold text-slate-800 mb-2">🔥 বেশি বিক্রি হচ্ছে (৩০ দিন)</div>
          {d.topSelling.length === 0 && <div className="text-slate-400 text-sm">এখনো বিক্রি নেই</div>}
          <div className="divide-y divide-slate-100">
            {d.topSelling.map((m: any, i: number) => (
              <div key={m.productId} className="flex justify-between py-2 text-sm">
                <span>{i + 1}. {m.name}</span>
                <span><b>{taka(m.revenue)}</b> <span className="text-slate-500">({fmtStock(m.pieces, m)})</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link href="/closing" className="btn-dark text-center">🔒 আজকের হিসাব শেষ করুন</Link>
    </AppShell>
  );
}