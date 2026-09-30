'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql } from '@/lib/api';

const ROLE: Record<string, string> = { OWNER: 'মালিক', MANAGER: 'ম্যানেজার', EMPLOYEE: 'কর্মচারী (শুধু বিক্রি)' };
const ROLE_ICON: Record<string, string> = { OWNER: '👑', MANAGER: '🧑‍💼', EMPLOYEE: '👷' };
const ROLE_TONE: Record<string, string> = { OWNER: 'bg-amber-100 text-amber-700', MANAGER: 'bg-sky-100 text-sky-700', EMPLOYEE: 'bg-emerald-100 text-emerald-700' };

export default function Team() {
  const [list, setList] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', password: '', role: 'EMPLOYEE' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const load = () => gql(`query{ users{id name phone role} }`).then((d) => setList(d.users)).catch((e) => setErr(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  const add = async () => {
    setErr('');
    try { await gql(`mutation($i:AddUserInput!){ addUser(input:$i){ id } }`, { i: f }); setF({ name: '', phone: '', password: '', role: 'EMPLOYEE' }); setShow(false); load(); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-slate-800">👥 কর্মচারী</h1>

      <button className="btn-outline" onClick={() => setShow(!show)}>{show ? '✕ বন্ধ করুন' : '+ নতুন কর্মচারী'}</button>
      {show && (
        <div className="card animate-fade-up space-y-3">
          <input className="input" placeholder="নাম" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="input" inputMode="numeric" placeholder="মোবাইল (লগইনের জন্য)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className="input" type="password" placeholder="পাসওয়ার্ড" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <div className="flex flex-wrap gap-2">{['EMPLOYEE', 'MANAGER'].map((r) => <button key={r} onClick={() => setF({ ...f, role: r })} className={`chip ${f.role === r ? 'chip-on' : ''}`}>{ROLE_ICON[r]} {ROLE[r]}</button>)}</div>
          {err && <div className="animate-pop rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}
          <button className="btn" onClick={add}>যোগ করুন</button>
        </div>
      )}
      {!show && err && <div className="animate-pop rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

      <div className="space-y-2 stagger">
        {!loaded && [0, 1, 2].map((i) => <div key={i} className="skeleton h-20" />)}
        {list.map((u) => (
          <div key={u.id} className="card flex items-center gap-3 !p-3">
            <div className="w-12 h-12 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-2xl">{ROLE_ICON[u.role] || '👤'}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 truncate">{u.name}</div>
              <div className="text-sm text-slate-500">{u.phone}</div>
            </div>
            <span className={`badge ${ROLE_TONE[u.role] || 'bg-slate-100 text-slate-600'}`}>{ROLE[u.role]}</span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}