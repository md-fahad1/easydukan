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
    setBusy(true); setErr('');
    try {
      const d = await gql(`mutation($p:String!,$w:String!){ login(phone:$p,password:$w){ token user{id name role} tenant{name shopType} } }`, { p: phone, w: password });
      saveAuth(d.login);
      router.replace(d.login.user.role === 'EMPLOYEE' ? '/sale' : '/');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* পেছনের সবুজ গোল আকার (সাজানোর জন্য) */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-300/40 blur-2xl" />
      <div className="absolute top-1/2 -left-24 w-64 h-64 rounded-full bg-teal-300/30 blur-2xl" />

      <div className="relative max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center gap-6">
        {/* লোগো */}
        <div className="text-center animate-fade-up">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-glow flex items-center justify-center text-5xl animate-float">🏪</div>
          <h1 className="text-3xl font-bold text-emerald-700 mt-4">ইজিদোকান</h1>
          <p className="text-slate-500 mt-1">দোকানের হিসাব, একদম সহজে।</p>
        </div>

        {/* ফর্ম কার্ড */}
        <div className="card p-5 space-y-4 shadow-lg animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div>
            <label className="label">📱 মোবাইল নম্বর</label>
            <input className="input" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">🔑 পাসওয়ার্ড</label>
            <div className="relative">
              <input
                className="input pr-14"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !busy && go()}
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xl px-1 active:scale-90 transition" aria-label="পাসওয়ার্ড দেখুন">
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          {err && <div className="animate-pop rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}
          <button className="btn" disabled={busy} onClick={go}>
            {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : 'ঢুকুন'}
          </button>
        </div>

        <Link href="/register" className="text-center text-emerald-700 font-semibold animate-fade-up" style={{ animationDelay: '220ms' }}>
          নতুন দোকান খুলুন →
        </Link>
      </div>
    </div>
  );
}