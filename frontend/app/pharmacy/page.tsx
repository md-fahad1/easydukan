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
const Stat = ({ l, v, c = '' }: any) => <div className="card"><div className="text-gray-500 text-sm">{l}</div><div className={`text-2xl font-bold ${c}`}>{v}</div></div>;

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

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">ফার্মেসি হিসাব</h1>
      {err && <div className="text-rose-600">{err}</div>}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/pharmacy/sell" className="btn text-center">💊 বিক্রি করুন</Link>
        <Link href="/pharmacy/purchase" className="btn-outline text-center">📦 মাল কেনা</Link>
      </div>

      {s && (
        <div className="grid grid-cols-2 gap-3">
          <Stat l="আজকের বিক্রি" v={taka(s.totalSale)} c="text-emerald-700" />
          <Stat l="আজকের খরচ" v={taka(s.expense)} c="text-rose-600" />
          <Stat l="আজ বাকিতে" v={taka(s.due)} c="text-amber-600" />
          <Stat l="হাতে থাকার কথা" v={taka(s.cashInHand)} />
          <Stat l="মোট বাকি (পাবেন)" v={taka(s.customerDue)} c="text-amber-600" />
          <Stat l="কোম্পানিকে দিতে হবে" v={taka(s.supplierDue)} c="text-rose-600" />
        </div>
      )}

      <div className="flex gap-2">
        {[7, 30].map((x) => <button key={x} onClick={() => setDays(x)} className={`chip flex-1 ${days === x ? 'chip-on' : ''}`}>{x} দিন</button>)}
      </div>

      {d && (
        <div className="card space-y-3">
          <div className="grid grid-cols-3 text-center">
            <div><div className="text-xs text-gray-500">বিক্রি</div><b className="text-emerald-700">{taka(tot('sale'))}</b></div>
            <div><div className="text-xs text-gray-500">বাকি</div><b className="text-amber-600">{taka(tot('due'))}</b></div>
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
          <div className="divide-y text-sm">
            {[...tr].reverse().map((x) => (
              <div key={x.date} className="flex justify-between py-1">
                <span className="text-gray-500">{x.date.slice(5)}</span>
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
          <div className="font-bold mb-2">⏳ মেয়াদ শেষ হচ্ছে / হয়ে গেছে (৯০ দিনের মধ্যে)</div>
          {d.expiringBatches.length === 0 && <div className="text-gray-400 text-sm">কিছু নেই ✅</div>}
          <div className="space-y-2">
            {d.expiringBatches.map((e: any) => (
              <div key={e.id} className={`rounded-xl p-3 ${e.expired ? 'bg-rose-50 border border-rose-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex justify-between">
                  <b>{e.productName}</b>
                  <span className={e.expired ? 'text-rose-600 font-semibold' : 'text-amber-700'}>{e.expired ? 'মেয়াদ শেষ' : mon(e.expiry)}</span>
                </div>
                <div className="text-sm text-gray-600">ব্যাচ {e.batchNo || '-'} · {fmtStock(e.qty, e)} · মেয়াদ {mon(e.expiry)}</div>
                {e.expired && <button className="text-sm text-rose-600 underline mt-1" onClick={() => discard(e.id)}>স্টক থেকে বাদ দিন</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {d && (
        <div className="card">
          <div className="font-bold mb-2">⚠️ কমে যাওয়া ওষুধ — {d.lowStockMedicines.length}টি</div>
          {d.lowStockMedicines.length === 0 && <div className="text-gray-400 text-sm">সব ঠিক আছে ✅</div>}
          <div className="divide-y">
            {d.lowStockMedicines.map((m: any) => (
              <div key={m.id} className="flex justify-between py-2 text-sm">
                <span>{m.name}</span>
                <span className="text-rose-600 font-semibold">{fmtStock(m.stock, m)} <span className="text-gray-400 font-normal">/ কমপক্ষে {fmtStock(m.minStock, m)}</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d && (
        <div className="card">
          <div className="font-bold mb-2">🔥 বেশি বিক্রি হচ্ছে (৩০ দিন, টাকার হিসাবে)</div>
          {d.topSelling.length === 0 && <div className="text-gray-400 text-sm">এখনো বিক্রি নেই</div>}
          <div className="divide-y">
            {d.topSelling.map((m: any, i: number) => (
              <div key={m.productId} className="flex justify-between py-2 text-sm">
                <span>{i + 1}. {m.name}</span>
                <span><b>{taka(m.revenue)}</b> <span className="text-gray-500">({fmtStock(m.pieces, m)})</span></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}