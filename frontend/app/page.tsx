'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const Q = `query{ summary(period:TODAY){ totalSale expense due cashInHand profit customerDue supplierDue lowStockCount } }`;

function Stat({ label, value, color = '' }: any) {
  return <div className="card"><div className="text-gray-500 text-sm">{label}</div><div className={`text-2xl font-bold ${color}`}>{value}</div></div>;
}

export default function Home() {
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { gql(Q).then((d) => setS(d.summary)).catch((e) => setErr(e.message)); }, []);
  const today = new Date().toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold">আজকের হিসাব</h1>
        <div className="text-gray-500">আজ {today}</div>
      </div>
      {err && <div className="text-rose-600">{err}</div>}
      {s && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="আজকের বিক্রি" value={taka(s.totalSale)} color="text-emerald-700" />
            <Stat label="আজকের খরচ" value={taka(s.expense)} color="text-rose-600" />
            <Stat label="আজ বাকিতে" value={taka(s.due)} color="text-amber-600" />
            <Stat label="হাতে থাকার কথা" value={taka(s.cashInHand)} />
          </div>
          <div className="card flex justify-between items-center">
            <span className="text-gray-600">আনুমানিক লাভ*</span>
            <span className="text-xl font-bold text-emerald-700">{taka(s.profit)}</span>
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/sale" className="btn text-center">+ বিক্রি যোগ করুন</Link>
        <Link href="/expense" className="btn-red text-center">+ খরচ যোগ করুন</Link>
        <Link href="/baki" className="btn-outline text-center">+ বাকির টাকা নিন</Link>
        <Link href="/sale?due=1" className="btn-outline text-center">+ বাকিতে বিক্রি</Link>
      </div>
      {s && (
        <div className="space-y-3">
          <Link href="/baki" className="card flex justify-between"><span>📕 কে টাকা পাবে (বাকির খাতা)</span><b>{taka(s.customerDue)}</b></Link>
          <Link href="/supplier" className="card flex justify-between"><span>🚚 কাকে টাকা দিতে হবে</span><b>{taka(s.supplierDue)}</b></Link>
          <Link href="/mal" className="card flex justify-between"><span>⚠️ কমে যাওয়া পণ্য</span><b>{s.lowStockCount}টি</b></Link>
        </div>
      )}
      <Link href="/closing" className="btn-outline block text-center">🔒 আজকের হিসাব শেষ করুন</Link>
    </AppShell>
  );
}
