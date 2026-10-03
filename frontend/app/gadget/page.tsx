'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const Q = `query($d:Int!){
  summary(period:TODAY){ totalSale expense due cashInHand profit customerDue supplierDue }
  salesTrend(days:$d){ date sale due expense profit }
  products{ id name stock minStock }
  gadgetBreakdown(by:"brand", days:30){ key stock stockValue sold revenue profit }
}`;
const Stat = ({ l, v, c = '' }: any) => <div className="card"><div className="text-gray-500 text-sm">{l}</div><div className={`text-2xl font-bold ${c}`}>{v}</div></div>;

export default function GadgetHome() {
  const router = useRouter();
  const [days, setDays] = useState(7);
  const [d, setD] = useState<any>(null);
  const [imei, setImei] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { gql(Q, { d: days }).then(setD).catch((e) => setErr(e.message)); }, [days]);

  const s = d?.summary;
  const tr: any[] = d?.salesTrend || [];
  const tot = (k: string) => tr.reduce((a, x) => a + x[k], 0);
  const max = Math.max(1, ...tr.map((x) => x.sale));
  const low: any[] = (d?.products || []).filter((m: any) => m.minStock > 0 && m.stock <= m.minStock);
  const brands: any[] = (d?.gadgetBreakdown || []).filter((b: any) => b.revenue > 0).slice(0, 5);
  const stockValue = (d?.gadgetBreakdown || []).reduce((a: number, b: any) => a + b.stockValue, 0);
  const stockQty = (d?.gadgetBreakdown || []).reduce((a: number, b: any) => a + b.stock, 0);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">গ্যাজেট হিসাব</h1>
      {err && <div className="text-rose-600">{err}</div>}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/gadget/sell" className="btn text-center">📱 বিক্রি করুন</Link>
        <Link href="/gadget/purchase" className="btn-outline text-center">📦 মাল কেনা</Link>
      </div>

      <form className="card flex gap-2" onSubmit={(e) => { e.preventDefault(); if (imei.trim()) router.push(`/gadget/warranty?q=${encodeURIComponent(imei.trim())}`); }}>
        <input className="input" placeholder="🛡️ IMEI-র শেষ ৪+ ডিজিট (ওয়ারেন্টি দেখতে)" value={imei} onChange={(e) => setImei(e.target.value)} />
        <button className="rounded-xl bg-emerald-600 text-white px-4">খুঁজুন</button>
      </form>

      {s && (
        <div className="grid grid-cols-2 gap-3">
          <Stat l="আজকের বিক্রি" v={taka(s.totalSale)} c="text-emerald-700" />
          <Stat l="আজকের লাভ" v={taka(s.profit)} c="text-emerald-700" />
          <Stat l="আজ বাকিতে" v={taka(s.due)} c="text-amber-600" />
          <Stat l="আজকের খরচ" v={taka(s.expense)} c="text-rose-600" />
          <Stat l="মোট বাকি (পাবেন)" v={taka(s.customerDue)} c="text-amber-600" />
          <Stat l="সাপ্লায়ারকে দিতে হবে" v={taka(s.supplierDue)} c="text-rose-600" />
        </div>
      )}
      {d && <div className="card flex justify-between"><div><div className="text-gray-500 text-sm">স্টকে মোট পণ্য</div><b className="text-xl">{stockQty}টি</b></div><div className="text-right"><div className="text-gray-500 text-sm">স্টকের দাম (কেনা দামে)</div><b className="text-xl">{taka(stockValue)}</b></div></div>}

      <div className="flex gap-2">
        {[7, 30].map((x) => <button key={x} onClick={() => setDays(x)} className={`chip flex-1 ${days === x ? 'chip-on' : ''}`}>{x} দিন</button>)}
      </div>

      {d && (
        <div className="card space-y-3">
          <div className="grid grid-cols-3 text-center">
            <div><div className="text-xs text-gray-500">বিক্রি</div><b className="text-emerald-700">{taka(tot('sale'))}</b></div>
            <div><div className="text-xs text-gray-500">লাভ</div><b className="text-emerald-700">{taka(tot('profit'))}</b></div>
            <div><div className="text-xs text-gray-500">খরচ</div><b className="text-rose-600">{taka(tot('expense'))}</b></div>
          </div>
          <div className="flex items-end gap-[2px] h-32">
            {tr.map((x) => (
              <div key={x.date} className="flex-1 flex flex-col justify-end items-center h-full">
                <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${(x.sale / max) * 100}%`, minHeight: x.sale > 0 ? 2 : 0 }} />
                <div className="text-[9px] text-gray-500 mt-1">{x.date.slice(8)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {d && (
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <div className="font-bold">🏷️ ব্র্যান্ড অনুযায়ী বিক্রি (৩০ দিন)</div>
            <Link href="/gadget/report" className="text-sm text-emerald-700 underline">সব দেখুন</Link>
          </div>
          {brands.length === 0 && <div className="text-gray-400 text-sm">এখনো বিক্রি নেই</div>}
          <div className="divide-y">
            {brands.map((b, i) => (
              <div key={b.key} className="flex justify-between py-2 text-sm">
                <span>{i + 1}. {b.key}</span>
                <span><b>{taka(b.revenue)}</b> <span className="text-gray-500">({b.sold}টি)</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d && (
        <div className="card">
          <div className="font-bold mb-2">⚠️ কমে যাওয়া পণ্য — {low.length}টি</div>
          {low.length === 0 && <div className="text-gray-400 text-sm">সব ঠিক আছে ✅</div>}
          <div className="divide-y">
            {low.map((m) => (
              <div key={m.id} className="flex justify-between py-2 text-sm">
                <span>{m.name}</span>
                <span className="text-rose-600 font-semibold">{m.stock}টি <span className="text-gray-400 font-normal">/ কমপক্ষে {m.minStock}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}