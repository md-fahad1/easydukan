'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const BY: [string, string][] = [['brand', '🏷️ ব্র্যান্ড'], ['category', '🗂️ ক্যাটাগরি'], ['color', '🎨 রং']];
const DAYS: [number, string][] = [[7, '৭ দিন'], [30, '৩০ দিন'], [90, '৯০ দিন']];

export default function GadgetReport() {
  const [by, setBy] = useState('brand');
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    setErr('');
    gql(`query($b:String!,$d:Int!){ gadgetBreakdown(by:$b,days:$d){ key stock stockValue sold revenue profit } }`, { b: by, d: days })
      .then((d) => setRows(d.gadgetBreakdown)).catch((e) => setErr(e.message));
  }, [by, days]);

  const sum = (k: string) => rows.reduce((a, r) => a + r[k], 0);
  const max = Math.max(1, ...rows.map((r) => r.revenue));

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">ব্র্যান্ড / ক্যাটাগরি রিপোর্ট</h1>
      <div className="flex gap-2">{BY.map(([k, v]) => <button key={k} onClick={() => setBy(k)} className={`chip flex-1 !px-2 ${by === k ? 'chip-on' : ''}`}>{v}</button>)}</div>
      <div className="flex gap-2">{DAYS.map(([d, l]) => <button key={d} onClick={() => setDays(d)} className={`chip flex-1 ${days === d ? 'chip-on' : ''}`}>{l}</button>)}</div>
      {err && <div className="text-rose-600">{err}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div className="card"><div className="text-gray-500 text-sm">বিক্রি ({days} দিন)</div><div className="text-xl font-bold text-emerald-700">{taka(sum('revenue'))}</div></div>
        <div className="card"><div className="text-gray-500 text-sm">লাভ</div><div className="text-xl font-bold text-emerald-700">{taka(sum('profit'))}</div></div>
        <div className="card"><div className="text-gray-500 text-sm">স্টকে আছে</div><div className="text-xl font-bold">{sum('stock')}টি</div></div>
        <div className="card"><div className="text-gray-500 text-sm">স্টকের দাম</div><div className="text-xl font-bold">{taka(sum('stockValue'))}</div></div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="card space-y-2">
            <div className="flex justify-between gap-2">
              <b className="truncate">{r.key}</b>
              <b className="text-emerald-700 shrink-0">{taka(r.revenue)}</b>
            </div>
            <div className="h-2 rounded-full bg-emerald-100 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(r.revenue, 0) / max * 100}%` }} /></div>
            <div className="grid grid-cols-3 text-center text-sm">
              <div><div className="text-xs text-gray-500">বিক্রি</div><b>{r.sold}টি</b></div>
              <div><div className="text-xs text-gray-500">লাভ</div><b className={r.profit < 0 ? 'text-rose-600' : 'text-emerald-700'}>{taka(r.profit)}</b></div>
              <div><div className="text-xs text-gray-500">স্টক</div><b>{r.stock}টি</b><div className="text-[11px] text-gray-500">{taka(r.stockValue)}</div></div>
            </div>
          </div>
        ))}
        {rows.length === 0 && !err && <div className="text-gray-400 text-center py-6">এখনো কোনো পণ্য নেই</div>}
      </div>
    </AppShell>
  );
}