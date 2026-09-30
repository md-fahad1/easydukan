'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gql } from '@/lib/api';

const TYPES = ['মুদি দোকান', 'মনোহারি', 'কনফেকশনারি', 'ফার্মেসি', 'অন্যান্য'];

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: '', shopName: '', phone: '', shopType: TYPES[0], password: '' });
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

  return (
    <div className="max-w-md mx-auto p-6 min-h-screen flex flex-col justify-center gap-5">
      <div className="text-center text-gray-500">ধাপ {step} / 4</div>
      {step === 1 && <div><label className="label">আপনার নাম</label><input autoFocus className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>}
      {step === 2 && <div><label className="label">দোকানের নাম</label><input autoFocus className="input" value={f.shopName} onChange={(e) => set('shopName', e.target.value)} /></div>}
      {step === 3 && <div><label className="label">মোবাইল নম্বর</label><input autoFocus className="input" inputMode="numeric" placeholder="01XXXXXXXXX" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>}
      {step === 4 && (
        <>
          <div>
            <label className="label">দোকানের ধরন</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => <button key={t} onClick={() => set('shopType', t)} className={`chip ${f.shopType === t ? 'chip-on' : ''}`}>{t}</button>)}
            </div>
          </div>
          <div><label className="label">পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)</label><input className="input" type="password" value={f.password} onChange={(e) => set('password', e.target.value)} /></div>
        </>
      )}
      {err && <div className="text-rose-600 text-center">{err}</div>}
      {step < 4 ? <button className="btn" onClick={next}>পরের ধাপ</button> : <button className="btn" disabled={busy} onClick={submit}>{busy ? '...' : 'দোকান তৈরি করুন'}</button>}
      {step > 1 && <button className="text-gray-500" onClick={() => setStep(step - 1)}>← পেছনে</button>}
      <Link href="/login" className="text-center text-emerald-700 underline">আগেই একাউন্ট আছে? ঢুকুন</Link>
    </div>
  );
}
