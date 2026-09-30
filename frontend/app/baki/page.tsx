'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

export default function Baki() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  const load = () => gql(`query{ customers{id name phone balance} }`).then((d) => setList(d.customers)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const add = async () => {
    setErr('');
    try {
      await gql(`mutation($n:String!,$p:String){ createCustomer(name:$n,phone:$p){ id } }`, { n: name, p: phone || null });
      setName(''); setPhone(''); setShow(false); load();
    } catch (e: any) { setErr(e.message); }
  };

  const total = list.reduce((a, c) => a + c.balance, 0);
  const shown = list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q));

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">বাকির খাতা</h1>
      <div className="card bg-amber-50 border-amber-200"><div className="text-gray-600">মোট পাবেন</div><div className="text-3xl font-bold text-amber-700">{taka(total)}</div></div>
      <input className="input" placeholder="নাম বা মোবাইল দিয়ে খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} />
      <button className="btn-outline" onClick={() => setShow(!show)}>+ নতুন কাস্টমার</button>
      {show && (
        <div className="card space-y-2">
          <input className="input" placeholder="নাম" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" inputMode="numeric" placeholder="মোবাইল (ঐচ্ছিক)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn" onClick={add}>সেভ করুন</button>
        </div>
      )}
      {err && <div className="text-rose-600">{err}</div>}
      <div className="space-y-2">
        {shown.map((c) => (
          <Link key={c.id} href={`/baki/${c.id}`} className="card flex justify-between items-center">
            <div><div className="font-semibold text-lg">{c.name}</div><div className="text-sm text-gray-500">{c.phone}</div></div>
            <div className={`font-bold text-lg ${c.balance > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{taka(c.balance)}</div>
          </Link>
        ))}
        {shown.length === 0 && <div className="text-gray-400 text-center">কোনো কাস্টমার নেই</div>}
      </div>
    </AppShell>
  );
}
