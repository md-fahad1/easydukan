'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql } from '@/lib/api';

const ROLE: Record<string, string> = { OWNER: 'মালিক', MANAGER: 'ম্যানেজার', EMPLOYEE: 'কর্মচারী (শুধু বিক্রি)' };

export default function Team() {
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState({ name: '', phone: '', password: '', role: 'EMPLOYEE' });
  const [err, setErr] = useState('');
  const load = () => gql(`query{ users{id name phone role} }`).then((d) => setList(d.users)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const add = async () => {
    setErr('');
    try { await gql(`mutation($i:AddUserInput!){ addUser(input:$i){ id } }`, { i: f }); setF({ name: '', phone: '', password: '', role: 'EMPLOYEE' }); load(); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">কর্মচারী</h1>
      <div className="card space-y-2">
        <input className="input" placeholder="নাম" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="input" inputMode="numeric" placeholder="মোবাইল (লগইনের জন্য)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className="input" type="password" placeholder="পাসওয়ার্ড" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <div className="flex gap-2">{['EMPLOYEE', 'MANAGER'].map((r) => <button key={r} onClick={() => setF({ ...f, role: r })} className={`chip ${f.role === r ? 'chip-on' : ''}`}>{ROLE[r]}</button>)}</div>
        {err && <div className="text-rose-600">{err}</div>}
        <button className="btn" onClick={add}>যোগ করুন</button>
      </div>
      {list.map((u) => <div key={u.id} className="card flex justify-between"><div><div className="font-semibold">{u.name}</div><div className="text-sm text-gray-500">{u.phone}</div></div><span className="text-sm">{ROLE[u.role]}</span></div>)}
    </AppShell>
  );
}
