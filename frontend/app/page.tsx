'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const Q = `query{ summary(period:TODAY){ totalSale expense due cashInHand profit customerDue supplierDue lowStockCount } }`;

// সংখ্যা 0 থেকে গুনে গুনে উঠবে (count-up এনিমেশন)
function CountUp({ value, format = taka }: { value: number; format?: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const to = value || 0;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 800, 1);
      setN(to * (1 - Math.pow(1 - p, 3))); // ease-out
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(Math.round(n))}</>;
}

// ছোট স্ট্যাট কার্ড
function Stat({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: string }) {
  return (
    <div className="card">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-2 ${tone}`}>{icon}</div>
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="text-xl font-bold text-slate-800"><CountUp value={value} /></div>
    </div>
  );
}

// নিচের লিস্ট-কার্ড (বাকি / মালদাতা / স্টক)
function Row({ href, icon, label, value, tone }: { href: string; icon: string; label: string; value: string; tone: string }) {
  return (
    <Link href={href} className="card flex items-center gap-3">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${tone}`}>{icon}</div>
      <span className="flex-1 text-slate-700">{label}</span>
      <b className="text-lg text-slate-800">{value}</b>
      <span className="text-slate-300 text-xl">›</span>
    </Link>
  );
}

// লোড হওয়ার সময় স্কেলেটন
function Loading() {
  return (
    <>
      <div className="skeleton h-32" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}
      </div>
    </>
  );
}

export default function Home() {
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { gql(Q).then((d) => setS(d.summary)).catch((e) => setErr(e.message)); }, []);
  const today = new Date().toLocaleDateString('bn-BD', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">আজকের হিসাব</h1>
        <div className="text-slate-500">আজ {today}</div>
      </div>

      {err && <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3">⚠️ {err}</div>}
      {!s && !err && <Loading />}

      {s && (
        <>
          {/* বড় হিরো কার্ড: আজকের বিক্রি */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white p-5 shadow-glow">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute right-10 -bottom-10 w-28 h-28 rounded-full bg-white/10" />
            <div className="relative">
              <div className="text-emerald-100 text-sm">আজকের বিক্রি</div>
              <div className="text-4xl font-bold mt-1"><CountUp value={s.totalSale} /></div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1.5 text-sm">
                <span>📈 আনুমানিক লাভ*</span>
                <b><CountUp value={s.profit} /></b>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 stagger">
            <Stat label="আজকের খরচ" value={s.expense} icon="💸" tone="bg-rose-50" />
            <Stat label="আজ বাকিতে" value={s.due} icon="📕" tone="bg-amber-50" />
            <Stat label="হাতে থাকার কথা" value={s.cashInHand} icon="👛" tone="bg-emerald-50" />
            <Link href="/mal" className="card">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-2 bg-sky-50">⚠️</div>
              <div className="text-slate-500 text-sm">কমে যাওয়া পণ্য</div>
              <div className="text-xl font-bold text-slate-800">{s.lowStockCount}টি</div>
            </Link>
          </div>
        </>
      )}

      {/* দ্রুত কাজ */}
      <div>
        <div className="font-bold text-slate-700 mb-2">দ্রুত কাজ</div>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/sale" className="btn text-center">+ বিক্রি যোগ করুন</Link>
          <Link href="/expense" className="btn-red text-center">+ খরচ যোগ করুন</Link>
          <Link href="/baki" className="btn-outline block text-center">+ বাকির টাকা নিন</Link>
          <Link href="/sale?due=1" className="btn-outline block text-center">+ বাকিতে বিক্রি</Link>
        </div>
      </div>

      {s && (
        <div className="space-y-3 stagger">
          <Row href="/baki" icon="📕" tone="bg-amber-50" label="কে টাকা পাবে (বাকির খাতা)" value={taka(s.customerDue)} />
          <Row href="/supplier" icon="🚚" tone="bg-sky-50" label="কাকে টাকা দিতে হবে" value={taka(s.supplierDue)} />
        </div>
      )}

      <Link href="/closing" className="btn-outline block text-center">🔒 আজকের হিসাব শেষ করুন</Link>
    </AppShell>
  );
}