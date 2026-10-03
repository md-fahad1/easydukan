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
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const d = await gql(`query($id:ID!){ customer(id:$id){id name phone balance} customerLedger(customerId:$id){date type amount note} }`, { id });
    setC(d.customer); setLedger(d.customerLedger);
  };
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [id]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  const receive = async () => {
    setErr(''); setMsg('');
    if (!Number(amount) || Number(amount) <= 0) return setErr('কত টাকা পেলেন লিখুন');
    setBusy(true);
    try {
      await gql(`mutation($id:ID!,$a:Float!,$m:String){ receivePayment(customerId:$id,amount:$a,method:$m){ id } }`, { id, a: Number(amount), m: method });
      setMsg(`টাকা জমা হয়েছে ✅ ${taka(Number(amount))}`);
      setAmount(''); await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  if (!c) {
    return (
      <AppShell>
        {err ? <div className="rounded-2xl bg-rose-50 text-rose-700 px-4 py-3">⚠️ {err}</div> : <><div className="skeleton h-40" /><div className="skeleton h-48" /></>}
      </AppShell>
    );
  }

  const text = `আসসালামু আলাইকুম ${c.name}, আপনার দোকানের বাকি ${taka(c.balance)} টাকা। সময় হলে পরিশোধ করবেন। ধন্যবাদ।`;
  const wa = c.phone ? `https://wa.me/88${c.phone}?text=${encodeURIComponent(text)}` : '';

  return (
    <AppShell>
      <Link href="/baki" className="inline-flex items-center gap-1 text-brand-700 font-semibold">← বাকির খাতা</Link>

      {/* কাস্টমার প্রোফাইল */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-amber-400 to-orange-500 text-white p-5 shadow-lg">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/15" />
        <div className="relative flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur flex items-center justify-center text-2xl font-bold">{c.name.trim().charAt(0)}</div>
          <div>
            <div className="text-2xl font-bold">{c.name}</div>
            <div className="text-amber-50">{c.phone || 'মোবাইল নেই'}</div>
          </div>
        </div>
        <div className="relative mt-4 text-amber-50 text-sm">এর কাছে মোট পাবেন</div>
        <div className="relative text-4xl font-bold">{taka(c.balance)}</div>
      </div>

      {/* টাকা গ্রহণ */}
      <div className="card space-y-3">
        <div className="font-bold text-slate-700">💰 টাকা পেয়েছি</div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-brand-600">৳</span>
          <input className="input !pl-11 text-2xl" inputMode="decimal" placeholder="কত টাকা দিয়েছে?" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        {c.balance > 0 && (
          <button onClick={() => setAmount(String(c.balance))} className="chip !py-1.5 !px-3 text-sm !bg-slate-100 !shadow-none">পুরো {taka(c.balance)} দিয়েছে</button>
        )}
        <div className="grid grid-cols-2 gap-2">
          {[['CASH', 'নগদ', '💵'], ['BKASH', 'বিকাশ', '📲']].map(([k, v, ic]) => (
            <button key={k} onClick={() => setMethod(k)} className={`rounded-2xl py-3 font-semibold transition active:scale-95 ${method === k ? 'bg-ink text-white' : 'bg-slate-100 text-slate-600'}`}>{ic} {v}</button>
          ))}
        </div>
        {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}
        {msg && <div className="animate-pop rounded-2xl bg-brand-50 text-brand-700 font-semibold px-4 py-3 text-center">{msg}</div>}
        <button className="btn" disabled={busy || !amount} onClick={receive}>
          {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : '✔ টাকা জমা করুন'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href={`/sale?customer=${c.id}`} className="btn-outline block text-center">+ নতুন বাকি</Link>
        {wa
          ? <a href={wa} target="_blank" className="btn-outline block text-center !border-green-500 !text-green-700">💬 মনে করিয়ে দিন</a>
          : <div className="btn-outline block text-center opacity-40">মোবাইল নেই</div>}
      </div>

      {/* হিসাবের তালিকা */}
      <h2 className="font-bold text-slate-700">লেনদেনের হিসাব</h2>
      <div className="space-y-2 stagger">
        {ledger.map((e, i) => (
          <div key={i} className="card flex items-center gap-3 !p-3">
            <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-lg ${e.type === 'BAKI' ? 'bg-amber-50' : 'bg-brand-50'}`}>{e.type === 'BAKI' ? '📕' : '💰'}</div>
            <div className="flex-1">
              <div className="font-medium text-slate-800">{e.type === 'BAKI' ? 'বাকি নিয়েছে' : 'টাকা দিয়েছে'}</div>
              <div className="text-sm text-slate-500">{dateOf(e.date)}</div>
            </div>
            <b className={`text-lg ${e.type === 'BAKI' ? 'text-amber-600' : 'text-brand-700'}`}>{e.type === 'BAKI' ? '+' : '−'}{taka(e.amount)}</b>
          </div>
        ))}
        {ledger.length === 0 && <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">📒</div>এখনো কোনো লেনদেন নেই</div>}
      </div>
    </AppShell>
  );
}