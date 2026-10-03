'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gql } from '@/lib/api';

const TYPES: { name: string; icon: string; sub: string; tone: string }[] = [
  { name: 'মুদি দোকান', icon: '🛒', sub: 'চাল, ডাল, তেল, মসলা', tone: 'bg-brand-50' },
  { name: 'মনোহারি', icon: '🧴', sub: 'সাবান, প্রসাধনী, ঘরের জিনিস', tone: 'bg-sky-50' },
  { name: 'কনফেকশনারি', icon: '🍬', sub: 'বিস্কুট, চকলেট, ঠান্ডা পানীয়', tone: 'bg-amber-50' },
  { name: 'ফার্মেসি', icon: '💊', sub: 'ওষুধ, ব্যাচ ও মেয়াদ হিসাব', tone: 'bg-rose-50' },
  { name: 'গ্যাজেট ', icon: '📱', sub: 'মোবাইল, গ্যাজেট, IMEI ওয়ারেন্টি', tone: 'bg-emerald-50' },
  { name: 'অন্যান্য', icon: '🏬', sub: 'অন্য যেকোনো দোকান', tone: 'bg-violet-50' },
];

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState({ shopType: '', name: '', shopName: '', phone: '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const pick = (t: string) => {
    set('shopType', t);
    setErr('');
    setStep(2);
  };

  const submit = async () => {
    setErr('');
    if (!f.name.trim()) return setErr('আপনার নাম লিখুন');
    if (!f.shopName.trim()) return setErr('দোকানের নাম লিখুন');
    if (!/^01\d{9}$/.test(f.phone)) return setErr('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)');
    if (f.password.length < 6) return setErr('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন');
    if (f.password !== f.confirm) return setErr('দুই জায়গার পাসওয়ার্ড মেলেনি');
    setBusy(true);
    try {
      const input = { name: f.name, shopName: f.shopName, phone: f.phone, shopType: f.shopType, password: f.password };
      const d = await gql(`mutation($i:RegisterInput!){ register(input:$i){ token user{id name role} tenant{name shopType} } }`, { i: input });
      localStorage.setItem('ed_token', d.register.token);
      localStorage.setItem('ed_user', JSON.stringify(d.register.user));
      localStorage.setItem('ed_shop', d.register.tenant.name);
      localStorage.setItem('ed_type', d.register.tenant.shopType);
      router.replace('/');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const cur = TYPES.find((t) => t.name === f.shopType);
  const mismatch = f.confirm.length > 0 && f.password !== f.confirm;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-500 via-brand-600 to-brand-700 relative overflow-hidden">
      <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-white/10" />
      <div className="absolute top-44 -left-20 w-56 h-56 rounded-full bg-white/10" />

      <div className="relative max-w-md mx-auto min-h-screen flex flex-col">
        {/* উপরের অংশ */}
        <div className="text-white pt-10 pb-8 px-6 animate-fade-up">
          <div className="flex items-center justify-between mb-5">
            {step === 2 ? (
              <button onClick={() => { setErr(''); setStep(1); }} className="bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium active:scale-95 transition">← পেছনে</button>
            ) : (
              <Link href="/login" className="bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium active:scale-95 transition">← ঢুকুন</Link>
            )}
            <div className="text-sm text-brand-50">ধাপ {step} / ২</div>
          </div>
          <div className="flex gap-2 mb-5">
            {[1, 2].map((i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-white/25 overflow-hidden">
                <div className={`h-full bg-white rounded-full transition-all duration-500 ${i <= step ? 'w-full' : 'w-0'}`} />
              </div>
            ))}
          </div>
          <h1 className="text-3xl font-bold">{step === 1 ? 'আপনার দোকান কেমন?' : 'প্রায় শেষ!'}</h1>
          <p className="text-brand-100 mt-1">
            {step === 1 ? 'দোকানের ধরন বেছে নিন' : 'নিচের তথ্যগুলো দিয়ে একাউন্ট খুলুন'}
          </p>
        </div>

        {/* সাদা অংশ */}
        <div key={step} className="flex-1 bg-white rounded-t-[40px] px-5 pt-7 pb-10 shadow-2xl animate-slide-up">
          {step === 1 && (
            <div className="space-y-3">
              {TYPES.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => pick(t.name)}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="animate-fade-up w-full flex items-center gap-4 rounded-3xl bg-white p-4 text-left shadow-soft border-2 border-transparent hover:border-brand-500 active:scale-[.98] transition"
                >
                  <div className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-4xl ${t.tone}`}>{t.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg text-slate-800">{t.name}</div>
                    <div className="text-sm text-slate-500">{t.sub}</div>
                  </div>
                  <span className="text-slate-300 text-2xl">›</span>
                </button>
              ))}
              <div className="text-center text-slate-500 text-sm pt-4">
                আগেই একাউন্ট আছে? <Link href="/login" className="text-brand-700 font-bold">ঢুকুন</Link>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4" onKeyDown={(e) => e.key === 'Enter' && !busy && submit()}>
              {/* বাছাই করা ধরন */}
              {cur && (
                <div className={`flex items-center gap-3 rounded-2xl p-3 ${cur.tone}`}>
                  <span className="text-3xl">{cur.icon}</span>
                  <div className="flex-1 font-semibold text-slate-800">{cur.name}</div>
                  <button onClick={() => setStep(1)} className="text-sm font-semibold text-brand-700">বদলান</button>
                </div>
              )}

              <div>
                <label className="label">আপনার নাম</label>
                <input autoFocus className="input" placeholder="যেমন: রহিম উদ্দিন" value={f.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label className="label">দোকানের নাম</label>
                <input className="input" placeholder="যেমন: রহিম স্টোর" value={f.shopName} onChange={(e) => set('shopName', e.target.value)} />
              </div>
              <div>
                <label className="label">মোবাইল নম্বর</label>
                <input className="input" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)</label>
                <div className="relative">
                  <input className="input pr-14" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••" value={f.password} onChange={(e) => set('password', e.target.value)} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xl px-1 active:scale-90 transition" aria-label="পাসওয়ার্ড দেখুন">
                    {show ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">পাসওয়ার্ড আবার লিখুন</label>
                <input
                  className={`input ${mismatch ? '!border-rose-400 !bg-rose-50' : ''}`}
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••"
                  value={f.confirm}
                  onChange={(e) => set('confirm', e.target.value)}
                />
                {mismatch && <div className="text-rose-600 text-sm mt-1">পাসওয়ার্ড মিলছে না</div>}
                {f.confirm.length > 0 && !mismatch && f.password.length >= 6 && <div className="text-brand-700 text-sm mt-1">✓ পাসওয়ার্ড মিলেছে</div>}
              </div>

              {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center text-sm">⚠️ {err}</div>}

              <button className="btn-dark" disabled={busy} onClick={submit}>
                {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : '🎉 দোকান তৈরি করুন'}
              </button>

              <div className="text-center text-slate-500 text-sm">
                আগেই একাউন্ট আছে? <Link href="/login" className="text-brand-700 font-bold">ঢুকুন</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}