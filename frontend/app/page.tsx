'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const Q = `query{ summary(period:TODAY){ totalSale expense due cashInHand profit customerDue supplierDue lowStockCount } }`;

function CountUp({ value, format = taka }: { value: number; format?: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const to = value || 0;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 800, 1);
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(Math.round(n))}</>;
}

// বড় কাজের বোতাম
function Big({ href, icon, label, sub, tone }: { href: string; icon: string; label: string; sub: string; tone: string }) {
  return (
    <Link href={href} className="card flex flex-col gap-2 !p-4 min-h-[118px]">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${tone}`}>{icon}</div>
      <div>
        <div className="font-bold text-slate-800 text-[17px] leading-tight">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      </div>
    </Link>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: string }) {
  return (
    <div className="card">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-2 ${tone}`}>{icon}</div>
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="text-xl font-bold text-slate-800"><CountUp value={value} /></div>
    </div>
  );
}

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

function Loading() {
  return (
    <>
      <div className="skeleton h-36" />
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
        <div className="text-slate-500 text-sm">{today}</div>
      </div>

      {err && <div className="rounded-2xl bg-rose-50 text-rose-700 px-4 py-3">⚠️ {err}</div>}
      {!s && !err && <Loading />}

      {s && (
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white p-5 shadow-glow">
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute right-12 -bottom-12 w-32 h-32 rounded-full bg-white/10" />
          <div className="relative">
            <div className="text-brand-50 text-sm">আজ মোট বিক্রি</div>
            <div className="text-4xl font-bold mt-1"><CountUp value={s.totalSale} /></div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1.5 text-sm">
              <span>📈 আনুমানিক লাভ</span>
              <b><CountUp value={s.profit} /></b>
            </div>
          </div>
        </div>
      )}

      {/* বড় বোতাম: সবচেয়ে বেশি লাগে এমন কাজ */}
      <div>
        <div className="font-bold text-slate-700 mb-2">কী করতে চান?</div>
        <div className="grid grid-cols-2 gap-3">
          <Big href="/sale" icon="🛒" tone="bg-brand-50" label="বিক্রি করুন" sub="নতুন বিক্রি লিখুন" />
          <Big href="/expense" icon="💸" tone="bg-rose-50" label="খরচ লিখুন" sub="ভাড়া, বিল, চা-নাস্তা" />
          <Big href="/baki" icon="📕" tone="bg-amber-50" label="বাকির টাকা নিন" sub="কেউ টাকা দিলে" />
          <Big href="/sale?due=1" icon="📝" tone="bg-sky-50" label="বাকিতে বিক্রি" sub="পরে টাকা দেবে" />
        </div>
      </div>

      {s && (
        <div className="grid grid-cols-2 gap-3 stagger">
          <Stat label="আজকের খরচ" value={s.expense} icon="💸" tone="bg-rose-50" />
          <Stat label="আজ বাকিতে গেছে" value={s.due} icon="📕" tone="bg-amber-50" />
          <Stat label="হাতে থাকার কথা" value={s.cashInHand} icon="👛" tone="bg-brand-50" />
          <Link href="/mal" className="card">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-2 bg-sky-50">⚠️</div>
            <div className="text-slate-500 text-sm">শেষ হয়ে আসছে</div>
            <div className="text-xl font-bold text-slate-800">{s.lowStockCount}টি পণ্য</div>
          </Link>
        </div>
      )}

      {s && (
        <div className="space-y-3 stagger">
          <Row href="/baki" icon="📕" tone="bg-amber-50" label="কে টাকা দেবে (বাকির খাতা)" value={taka(s.customerDue)} />
          <Row href="/supplier" icon="🚚" tone="bg-sky-50" label="কাকে টাকা দিতে হবে" value={taka(s.supplierDue)} />
        </div>
      )}

      <Link href="/closing" className="btn-dark text-center">🔒 আজকের হিসাব শেষ করুন</Link>
    </AppShell>
  );
}