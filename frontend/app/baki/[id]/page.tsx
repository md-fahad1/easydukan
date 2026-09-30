'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { gql, taka, dateOf } from '@/lib/api';

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await gql(`query($id:ID!){ customer(id:$id){id name phone balance} customerLedger(customerId:$id){date type amount note} }`, { id });
    setC(d.customer); setLedger(d.customerLedger);
  };
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [id]);

  const receive = async () => {
    setErr(''); setBusy(true);
    try {
      await gql(`mutation($id:ID!,$a:Float!,$m:String){ receivePayment(customerId:$id,amount:$a,method:$m){ id } }`, { id, a: Number(amount), m: method });
      setAmount(''); await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  if (!c) return <AppShell>{err ? <div className="text-rose-600">{err}</div> : <div>লোড হচ্ছে...</div>}</AppShell>;

  const text = `আসসালামু আলাইকুম ${c.name}, আপনার দোকানের বাকি ${taka(c.balance)} টাকা। সময় হলে পরিশোধ করবেন। ধন্যবাদ।`;
  const wa = c.phone ? `https://wa.me/88${c.phone}?text=${encodeURIComponent(text)}` : '';

  return (
    <AppShell>
      <Link href="/baki" className="text-emerald-700">← বাকির খাতা</Link>
      <div className="card">
        <div className="text-2xl font-bold">{c.name}</div>
        <div className="text-gray-500">{c.phone}</div>
        <div className="mt-3 text-gray-600">মোট বাকি</div>
        <div className="text-3xl font-bold text-amber-600">{taka(c.balance)}</div>
      </div>

      <div className="card space-y-3">
        <div className="font-bold">টাকা নিয়েছি</div>
        <input className="input text-2xl" inputMode="decimal" placeholder="কত টাকা?" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <div className="flex gap-2">
          {[['CASH', 'নগদ'], ['BKASH', 'বিকাশ']].map(([k, v]) => <button key={k} onClick={() => setMethod(k)} className={`chip ${method === k ? 'chip-on' : ''}`}>{v}</button>)}
        </div>
        {err && <div className="text-rose-600">{err}</div>}
        <button className="btn" disabled={busy || !amount} onClick={receive}>টাকা গ্রহণ করুন</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href={`/sale?customer=${c.id}`} className="btn-outline text-center">+ নতুন বাকি</Link>
        {wa ? <a href={wa} target="_blank" className="btn-outline text-center">WhatsApp রিমাইন্ডার</a> : <div className="btn-outline text-center opacity-40">মোবাইল নেই</div>}
      </div>

      <h2 className="font-bold">হিসাব</h2>
      <div className="space-y-2">
        {ledger.map((e, i) => (
          <div key={i} className="card flex justify-between">
            <div><div className="font-medium">{e.type === 'BAKI' ? 'বাকি নিয়েছে' : 'টাকা দিয়েছে'}</div><div className="text-sm text-gray-500">{dateOf(e.date)}</div></div>
            <b className={e.type === 'BAKI' ? 'text-amber-600' : 'text-emerald-700'}>{e.type === 'BAKI' ? '+' : '−'}{taka(e.amount)}</b>
          </div>
        ))}
        {ledger.length === 0 && <div className="text-gray-400 text-center">এখনো কোনো লেনদেন নেই</div>}
      </div>
    </AppShell>
  );
}
