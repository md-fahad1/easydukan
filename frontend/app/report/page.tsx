'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const TABS: [string, string][] = [['TODAY', 'আজ'], ['WEEK', 'এই সপ্তাহ'], ['MONTH', 'এই মাস']];
const PERIOD_TITLE: Record<string, string> = { TODAY: 'আজকের', WEEK: 'এই সপ্তাহের', MONTH: 'এই মাসের' };

function CountUp({ value, format = taka }: { value: number; format?: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const to = value || 0;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 900, 1);
      setN(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(Math.round(n))}</>;
}

const plain = (n: number) => n.toLocaleString('bn-BD');

function Tile({ icon, label, value, tone, format }: { icon: string; label: string; value: number; tone: string; format?: (n: number) => string }) {
  return (
    <div className="card">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-2 ${tone}`}>{icon}</div>
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="text-xl font-bold text-slate-800"><CountUp value={value} format={format} /></div>
    </div>
  );
}

function Line({ icon, label, value, tone, format }: { icon: string; label: string; value: number; tone: string; format?: (n: number) => string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-lg ${tone}`}>{icon}</div>
      <span className="flex-1 text-slate-600">{label}</span>
      <b className="text-lg text-slate-800"><CountUp value={value} format={format} /></b>
    </div>
  );
}

export default function Report() {
  const [p, setP] = useState('TODAY');
  const [s, setS] = useState<any>(null);
  const [err, setErr] = useState('');
  const [grow, setGrow] = useState(false);

  useEffect(() => {
    setS(null); setGrow(false); setErr('');
    gql(`query($p:Period!){ summary(period:$p){ totalSale cash bkash due expense profit received cashInHand saleCount customerDue supplierDue lowStockCount returnTotal } }`, { p })
      .then((d) => { setS(d.summary); setTimeout(() => setGrow(true), 80); })
      .catch((e) => setErr(e.message));
  }, [p]);

  const idx = TABS.findIndex(([k]) => k === p);
  const sum = s ? (s.cash || 0) + (s.bkash || 0) + (s.due || 0) : 0;
  const pct = (v: number) => (sum > 0 ? ((v || 0) / sum) * 100 : 0);
  const segs = s ? [
    { k: 'নগদ', v: s.cash, bar: 'bg-brand-500', dot: 'bg-brand-500' },
    { k: 'বিকাশ', v: s.bkash, bar: 'bg-pink-500', dot: 'bg-pink-500' },
    { k: 'বাকিতে', v: s.due, bar: 'bg-amber-400', dot: 'bg-amber-400' },
  ] : [];

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-slate-800">📊 রিপোর্ট</h1>

      {/* ট্যাব */}
      <div className="relative grid grid-cols-3 rounded-full bg-white shadow-soft p-1.5">
        <div
          className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-full bg-ink transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${idx * 100}%)` }}
        />
        {TABS.map(([k, v]) => (
          <button key={k} onClick={() => setP(k)} className={`relative z-10 py-2.5 rounded-full font-semibold transition-colors duration-300 ${p === k ? 'text-white' : 'text-slate-500'}`}>{v}</button>
        ))}
      </div>

      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

      {!s && !err && (
        <>
          <div className="skeleton h-40" />
          <div className="skeleton h-28" />
          <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28" />)}</div>
        </>
      )}

      {s && (
        <div key={p} className="space-y-4 stagger">
          {/* মোট বিক্রি */}
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white p-5 shadow-glow">
            <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10" />
            <div className="absolute right-8 -bottom-12 w-28 h-28 rounded-full bg-white/10" />
            <div className="relative">
              <div className="text-brand-50 text-sm">{PERIOD_TITLE[p]} মোট বিক্রি</div>
              <div className="text-4xl font-bold mt-1"><CountUp value={s.totalSale} /></div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-white/20 backdrop-blur px-3 py-1">🧾 {plain(s.saleCount)}টি বিক্রি</span>
                <span className="rounded-full bg-white/20 backdrop-blur px-3 py-1">↩️ ফেরত {taka(s.returnTotal)}</span>
              </div>
            </div>
          </div>

          {/* নগদ / বিকাশ / বাকি */}
          <div className="card">
            <div className="font-bold text-slate-700 mb-3">টাকা কীভাবে এলো?</div>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
              {segs.map((g) => (
                <div key={g.k} className={`h-full ${g.bar} transition-all duration-1000 ease-out`} style={{ width: grow ? `${pct(g.v)}%` : '0%' }} />
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {segs.map((g) => (
                <div key={g.k} className="flex items-center gap-2 text-sm">
                  <span className={`w-3 h-3 rounded-full ${g.dot}`} />
                  <span className="flex-1 text-slate-600">{g.k}</span>
                  <span className="text-slate-400">{Math.round(pct(g.v)).toLocaleString('bn-BD')}%</span>
                  <b className="w-24 text-right text-slate-800">{taka(g.v)}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 stagger">
            <Tile icon="💸" label="মোট খরচ" value={s.expense} tone="bg-rose-50" />
            <Tile icon="💵" label="বাকির টাকা পেয়েছেন" value={s.received} tone="bg-sky-50" />
            <Tile icon="👛" label="হাতে থাকার কথা" value={s.cashInHand} tone="bg-brand-50" />
            <Tile icon="📦" label="শেষ হয়ে আসছে" value={s.lowStockCount} tone="bg-amber-50" format={(n) => `${plain(n)}টি`} />
          </div>

          {/* লাভ */}
          <div className="relative overflow-hidden rounded-[32px] bg-ink text-white p-5">
            <div className="absolute -left-6 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-slate-300 text-sm">📈 আনুমানিক লাভ</div>
                <div className="text-3xl font-bold mt-1"><CountUp value={s.profit} /></div>
              </div>
              <div className="text-5xl animate-float">💹</div>
            </div>
          </div>

          <div className="card divide-y divide-slate-100 !py-1">
            <Line icon="📕" label="কাস্টমারের কাছে পাবেন" value={s.customerDue} tone="bg-amber-50" />
            <Line icon="🚚" label="মালদাতাকে দিতে হবে" value={s.supplierDue} tone="bg-sky-50" />
          </div>
        </div>
      )}
    </AppShell>
  );
}