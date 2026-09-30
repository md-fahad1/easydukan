'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const TABS: [string, string][] = [['TODAY', 'আজ'], ['WEEK', 'এই সপ্তাহ'], ['MONTH', 'এই মাস']];

export default function Report() {
  const [p, setP] = useState('TODAY');
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    gql(`query($p:Period!){ summary(period:$p){ totalSale cash bkash due expense profit received cashInHand saleCount customerDue supplierDue lowStockCount } }`, { p })
      .then((d) => setS(d.summary)).catch((e) => setErr(e.message));
  }, [p]);

  const rows = s ? [
    ['📊 মোট বিক্রি', taka(s.totalSale)], ['   নগদ', taka(s.cash)], ['   বিকাশ', taka(s.bkash)], ['   বাকিতে', taka(s.due)],
    ['💰 মোট খরচ', taka(s.expense)], ['💵 বাকি আদায়', taka(s.received)], ['💵 হাতে থাকার কথা', taka(s.cashInHand)],
    ['📈 আনুমানিক লাভ', taka(s.profit)], ['🧾 বিক্রির সংখ্যা', s.saleCount],
    ['📕 মোট বাকি (পাবেন)', taka(s.customerDue)], ['🚚 মোট পাওনা (দেবেন)', taka(s.supplierDue)], ['📦 কমে যাওয়া পণ্য', s.lowStockCount],
  ] : [];

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">রিপোর্ট</h1>
      <div className="flex gap-2">{TABS.map(([k, v]) => <button key={k} onClick={() => setP(k)} className={`chip flex-1 ${p === k ? 'chip-on' : ''}`}>{v}</button>)}</div>
      {err && <div className="text-rose-600">{err}</div>}
      <div className="card divide-y">
        {rows.map(([l, v]: any) => <div key={l} className="flex justify-between py-2"><span className="whitespace-pre">{l}</span><b>{v}</b></div>)}
      </div>
    </AppShell>
  );
}
