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
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!phone.trim() || !password) { setErr('মোবাইল নম্বর ও পাসওয়ার্ড দিন'); return; }
    setBusy(true); setErr('');
    try {
      const d = await gql(`mutation($p:String!,$w:String!){ login(phone:$p,password:$w){ token user{id name role} tenant{name shopType} } }`, { p: phone, w: password });
      saveAuth(d.login);
      router.replace(d.login.user.role === 'EMPLOYEE' ? '/sale' : '/');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-500 via-brand-600 to-brand-700 relative overflow-hidden">
      <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-white/10" />
      <div className="absolute top-40 -left-20 w-56 h-56 rounded-full bg-white/10" />

      <div className="relative max-w-md mx-auto min-h-screen flex flex-col">
        {/* লোগো */}
        <div className="text-center text-white pt-14 pb-10 px-6 animate-fade-up">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-white shadow-xl flex items-center justify-center text-4xl animate-float">🏪</div>
          <h1 className="text-3xl font-bold mt-4">ইজিদোকান</h1>
          <p className="text-brand-100 mt-1">দোকানের হিসাব, একদম সহজে।</p>
        </div>

        {/* ফর্ম */}
        <div className="flex-1 bg-white rounded-t-[40px] px-6 pt-8 pb-10 space-y-5 animate-slide-up shadow-2xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">স্বাগতম 👋</h2>
            <p className="text-slate-500 text-sm mt-1">আপনার একাউন্টে ঢুকুন</p>
          </div>

          <div>
            <label className="label">মোবাইল নম্বর</label>
            <input className="input" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div>
            <label className="label">পাসওয়ার্ড</label>
            <div className="relative">
              <input
                className="input pr-14"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !busy && go()}
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xl px-1 active:scale-90 transition" aria-label="পাসওয়ার্ড দেখুন">
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center text-sm">⚠️ {err}</div>}

          <button className="btn-dark" disabled={busy} onClick={go}>
            {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : 'ঢুকুন'}
          </button>

          <div className="text-center text-slate-500 text-sm pt-2">
            নতুন দোকান?{' '}
            <Link href="/register" className="text-brand-700 font-bold">একাউন্ট খুলুন →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}