'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gql } from '@/lib/api';

const saveAuth = (a: any) => {
  localStorage.setItem('ed_token', a.token);
  localStorage.setItem('ed_user', JSON.stringify(a.user));
  localStorage.setItem('ed_shop', a.tenant.name);
  localStorage.setItem('ed_type', a.tenant.shopType);
};

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true); setErr('');
    try {
      const d = await gql(`mutation($p:String!,$w:String!){ login(phone:$p,password:$w){ token user{id name role} tenant{name shopType} } }`, { p: phone, w: password });
      saveAuth(d.login);
      router.replace(d.login.user.role === 'EMPLOYEE' ? '/sale' : '/');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center gap-5">
      <div className="text-center">
        <div className="text-5xl">🏪</div>
        <h1 className="text-3xl font-bold text-emerald-700 mt-2">ইজিদোকান</h1>
        <p className="text-gray-500">দোকানের হিসাব, একদম সহজে।</p>
      </div>
      <div><label className="label">মোবাইল নম্বর</label><input className="input" inputMode="numeric" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <div><label className="label">পাসওয়ার্ড</label><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {err && <div className="text-rose-600 text-center">{err}</div>}
      <button className="btn" disabled={busy} onClick={go}>{busy ? '...' : 'ঢুকুন'}</button>
      <Link href="/register" className="text-center text-emerald-700 underline">নতুন দোকান খুলুন</Link>
    </div>
  );
}
