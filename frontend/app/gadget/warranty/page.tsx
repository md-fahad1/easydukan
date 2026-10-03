'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import BarcodeScanner from '@/components/BarcodeScanner';
import { gql, taka, fullDate } from '@/lib/api';

export default function Warranty() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<any[] | null>(null);
  const [scan, setScan] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const find = async (text: string) => {
    const k = text.trim();
    setErr(''); setRes(null);
    if (k.replace(/\s+/g, '').length < 4) return setErr('কমপক্ষে ৪টি ডিজিট / অক্ষর লিখুন');
    setBusy(true);
    try { setRes((await gql(`query($q:String!){ searchUnits(query:$q){ id serial status productName color price soldAt warrantyEnd inWarranty customerName customerPhone } }`, { q: k })).searchUnits); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  // হোম পেজ থেকে ?q=... নিয়ে এলে সঙ্গে সঙ্গে খুঁজবে
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('q');
    if (k) { setQ(k); find(k); }
  }, []);

  return (
    <AppShell>
      {scan && <BarcodeScanner onScan={(c) => { setScan(false); setQ(c); find(c); }} onClose={() => setScan(false)} />}
      <h1 className="text-2xl font-bold">🛡️ ওয়ারেন্টি / IMEI খুঁজুন</h1>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); find(q); }}>
        <input className="input" placeholder="IMEI বা সিরিয়ালের শেষ ৪+ ডিজিট" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="rounded-xl bg-emerald-600 text-white px-4 text-xl" onClick={() => setScan(true)}>📷</button>
      </form>
      <button className="btn" disabled={busy} onClick={() => find(q)}>{busy ? '...' : 'খুঁজুন'}</button>
      {err && <div className="text-rose-600">{err}</div>}

      {res && res.length === 0 && <div className="text-gray-400 text-center py-6">এই নম্বরে কিছু পাওয়া যায়নি</div>}
      {res?.map((u) => (
        <div key={u.id} className="card space-y-2">
          <div className="flex justify-between gap-2">
            <div className="min-w-0"><div className="font-semibold">{u.productName}</div><div className="font-mono text-sm text-gray-600">{u.serial}</div></div>
            <span className={`badge shrink-0 self-start ${u.status === 'SOLD' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>{u.status === 'SOLD' ? 'বিক্রি হয়েছে' : 'দোকানে স্টকে আছে'}</span>
          </div>
          {u.status === 'SOLD' ? (
            <>
              <div className="text-sm space-y-0.5">
                <div>👤 {u.customerName || 'কাস্টমারের নাম রাখা হয়নি'}{u.customerPhone && <> • <a className="text-emerald-700 underline" href={`tel:${u.customerPhone}`}>{u.customerPhone}</a></>}</div>
                <div>🗓️ বিক্রির তারিখ: {fullDate(u.soldAt)} {u.price != null && `• ${taka(u.price)}`}</div>
              </div>
              {u.warrantyEnd ? (
                <div className={`rounded-xl px-3 py-2 font-semibold ${u.inWarranty ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {u.inWarranty ? '✅ ওয়ারেন্টি আছে' : '❌ ওয়ারেন্টি শেষ'} — {fullDate(u.warrantyEnd)} পর্যন্ত
                </div>
              ) : <div className="rounded-xl px-3 py-2 bg-gray-50 text-gray-600">এই পণ্যে ওয়ারেন্টি দেওয়া হয়নি</div>}
            </>
          ) : <div className="text-sm text-gray-500">এখনো বিক্রি হয়নি।</div>}
        </div>
      ))}
    </AppShell>
  );
}