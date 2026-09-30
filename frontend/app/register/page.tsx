'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gql } from '@/lib/api';

const TYPES = ['মুদি দোকান', 'মনোহারি', 'কনফেকশনারি', 'ফার্মেসি', 'অন্যান্য'];
const TYPE_ICON: Record<string, string> = { 'মুদি দোকান': '🛒', 'মনোহারি': '🧴', 'কনফেকশনারি': '🍬', 'ফার্মেসি': '💊', 'অন্যান্য': '🏬' };
const STEP_INFO = [
  { icon: '👤', title: 'আপনার নাম কী?' },
  { icon: '🏪', title: 'দোকানের নাম কী?' },
  { icon: '📱', title: 'মোবাইল নম্বর দিন' },
  { icon: '🔐', title: 'শেষ ধাপ!' },
];

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: '', shopName: '', phone: '', shopType: TYPES[0], password: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  const next = () => {
    setErr('');
    if (step === 1 && !f.name.trim()) return setErr('আপনার নাম লিখুন');
    if (step === 2 && !f.shopName.trim()) return setErr('দোকানের নাম লিখুন');
    if (step === 3 && !/^01\d{9}$/.test(f.phone)) return setErr('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)');
    setStep(step + 1);
  };

  const submit = async () => {
    if (f.password.length < 6) return setErr('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের দিন');
    setBusy(true); setErr('');
    try {
      const d = await gql(`mutation($i:RegisterInput!){ register(input:$i){ token user{id name role} tenant{name shopType} } }`, { i: f });
      localStorage.setItem('ed_token', d.register.token);
      localStorage.setItem('ed_user', JSON.stringify(d.register.user));
      localStorage.setItem('ed_shop', d.register.tenant.name);
      localStorage.setItem('ed_type', d.register.tenant.shopType);
      router.replace('/');
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  // Enter চাপলে পরের ধাপ / জমা
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || busy) return;
    step < 4 ? next() : submit();
  };

  const info = STEP_INFO[step - 1];

  return (
    <div className="relative overflow-hidden min-h-screen">
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-300/40 blur-2xl" />
      <div className="absolute bottom-0 -right-24 w-64 h-64 rounded-full bg-teal-300/30 blur-2xl" />

      <div className="relative max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center gap-5">
        {/* প্রগ্রেস বার */}
        <div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-2 rounded-full bg-emerald-100 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ${i <= step ? 'w-full' : 'w-0'}`} />
              </div>
            ))}
          </div>
          <div className="text-center text-slate-500 text-sm mt-2">ধাপ {step} / 4</div>
        </div>

        {/* প্রতিটা ধাপে key বদলায় তাই নতুন করে এনিমেশন হয় */}
        <div key={step} className="card p-5 space-y-4 shadow-lg animate-fade-up" onKeyDown={onEnter}>
          <div className="text-center">
            <div className="text-5xl animate-float">{info.icon}</div>
            <h1 className="text-xl font-bold text-slate-800 mt-2">{info.title}</h1>
          </div>

          {step === 1 && <div><label className="label">আপনার নাম</label><input autoFocus className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>}
          {step === 2 && <div><label className="label">দোকানের নাম</label><input autoFocus className="input" value={f.shopName} onChange={(e) => set('shopName', e.target.value)} /></div>}
          {step === 3 && <div><label className="label">মোবাইল নম্বর</label><input autoFocus className="input" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>}
          {step === 4 && (
            <>
              <div>
                <label className="label">দোকানের ধরন</label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map((t) => (
                    <button key={t} onClick={() => set('shopType', t)} className={`chip ${f.shopType === t ? 'chip-on' : ''}`}>
                      {TYPE_ICON[t]} {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)</label>
                <div className="relative">
                  <input className="input pr-14" type={show ? 'text' : 'password'} autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xl px-1 active:scale-90 transition" aria-label="পাসওয়ার্ড দেখুন">
                    {show ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </>
          )}

          {err && <div className="animate-pop rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

          {step < 4 ? (
            <button className="btn" onClick={next}>পরের ধাপ →</button>
          ) : (
            <button className="btn" disabled={busy} onClick={submit}>
              {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : '🎉 দোকান তৈরি করুন'}
            </button>
          )}
          {step > 1 && <button className="w-full text-slate-500 py-1 active:scale-95 transition" onClick={() => { setErr(''); setStep(step - 1); }}>← পেছনে</button>}
        </div>

        <Link href="/login" className="text-center text-emerald-700 font-semibold">আগেই একাউন্ট আছে? ঢুকুন</Link>
      </div>
    </div>
  );
}