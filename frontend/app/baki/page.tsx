'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const AV = ['bg-brand-100 text-brand-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700'];
const avTone = (name: string) => AV[(name.charCodeAt(0) || 0) % AV.length];

export default function Baki() {
  const [list, setList] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  const load = () => gql(`query{ customers{id name phone balance} }`).then((d) => setList(d.customers)).catch((e) => setErr(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  const add = async () => {
    setErr('');
    if (!name.trim()) return setErr('কাস্টমারের নাম লিখুন');
    try {
      await gql(`mutation($n:String!,$p:String){ createCustomer(name:$n,phone:$p){ id } }`, { n: name, p: phone || null });
      setName(''); setPhone(''); setShow(false); load();
    } catch (e: any) { setErr(e.message); }
  };

  const total = list.reduce((a, c) => a + c.balance, 0);
  const owing = list.filter((c) => c.balance > 0).length;
  const shown = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q));

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-slate-800">বাকির খাতা</h1>

      {/* মোট পাবেন */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-amber-400 to-orange-500 text-white p-5 shadow-lg">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/15" />
        <div className="relative">
          <div className="text-amber-50 text-sm">মোট যত টাকা পাবেন</div>
          <div className="text-4xl font-bold mt-1">{taka(total)}</div>
          <div className="mt-3 inline-flex rounded-full bg-white/25 px-3 py-1 text-sm">👥 {owing} জনের কাছে বাকি</div>
        </div>
      </div>

      {/* খোঁজা */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
        <input className="input !pl-12" placeholder="নাম বা মোবাইল দিয়ে খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <button className="btn-dark" onClick={() => setShow(!show)}>{show ? '✕ বন্ধ করুন' : '+ নতুন কাস্টমার যোগ করুন'}</button>
      {show && (
        <div className="card animate-fade-up space-y-3">
          <input className="input" placeholder="কাস্টমারের নাম" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" inputMode="numeric" placeholder="মোবাইল নম্বর (না দিলেও চলবে)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn" onClick={add}>সেভ করুন</button>
        </div>
      )}
      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

      {/* কাস্টমার লিস্ট */}
      <div className="space-y-2 stagger">
        {!loaded && [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-20" />)}
        {shown.map((c) => (
          <Link key={c.id} href={`/baki/${c.id}`} className="card flex items-center gap-3 !p-3">
            <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-xl font-bold ${avTone(c.name)}`}>{c.name.trim().charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg text-slate-800 truncate">{c.name}</div>
              <div className="text-sm text-slate-500">{c.phone || 'মোবাইল নেই'}</div>
            </div>
            {c.balance > 0
              ? <div className="font-bold text-lg text-amber-600">{taka(c.balance)}</div>
              : <span className="badge bg-brand-100 text-brand-700">✓ পরিশোধ</span>}
            <span className="text-slate-300 text-xl">›</span>
          </Link>
        ))}
        {loaded && shown.length === 0 && (
          <div className="text-slate-400 text-center py-6">
            <div className="text-4xl mb-1">📭</div>
            {list.length === 0 ? 'এখনো কোনো কাস্টমার নেই। উপরের বোতামে চাপ দিয়ে প্রথম কাস্টমার যোগ করুন।' : 'এই নামে কেউ নেই'}
          </div>
        )}
      </div>
    </AppShell>
  );
}