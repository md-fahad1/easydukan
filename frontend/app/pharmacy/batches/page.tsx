'use client';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka, fmtStock } from '@/lib/api';

const DAY = 86400000;
const SOON = 90;
const FILTERS: [string, string][] = [['ALL', 'সব'], ['SOON', '⚠️ মেয়াদ কাছে'], ['EXPIRED', '❌ মেয়াদ শেষ'], ['LOW', '📉 কম আছে']];
const Q = `query{ batchStock{ id name genericName company form piecesPerStrip stripsPerBox stock minStock purchasePrice sellingPrice batches{ id batchNo expiry qty cost receivedAt } } }`;

const daysLeft = (e?: string | null) => (e ? Math.ceil((new Date(e).getTime() - Date.now()) / DAY) : null);
const fmtDate = (d: string) => new Date(d).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });

function tone(d: number | null) {
  if (d === null) return { c: 'text-slate-500', bg: 'bg-slate-100', t: 'মেয়াদ নেই' };
  if (d < 0) return { c: 'text-rose-700', bg: 'bg-rose-100', t: `${-d} দিন আগে শেষ` };
  if (d <= 30) return { c: 'text-rose-600', bg: 'bg-rose-50', t: `${d} দিন বাকি` };
  if (d <= SOON) return { c: 'text-amber-700', bg: 'bg-amber-50', t: `${d} দিন বাকি` };
  return { c: 'text-brand-700', bg: 'bg-brand-50', t: `${d} দিন বাকি` };
}

export default function Batches() {
  const [list, setList] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [open, setOpen] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const load = () => gql(Q).then((d) => setList(d.batchStock)).catch((e) => setErr(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => list.map((p) => {
    const bs = p.batches.map((b: any) => ({ ...b, d: daysLeft(b.expiry) }));
    const expiredQty = bs.filter((b: any) => b.d !== null && b.d < 0).reduce((a: number, b: any) => a + b.qty, 0);
    const soonQty = bs.filter((b: any) => b.d !== null && b.d >= 0 && b.d <= SOON).reduce((a: number, b: any) => a + b.qty, 0);
    const nearest = bs.reduce((m: number | null, b: any) => (b.d !== null && (m === null || b.d < m) ? b.d : m), null);
    const low = p.minStock > 0 && p.stock <= p.minStock;
    return { ...p, bs, expiredQty, soonQty, nearest, low };
  }), [list]);

  const sum = useMemo(() => {
    let cost = 0, sale = 0, expiredCost = 0, soonCount = 0, expiredCount = 0;
    for (const p of rows) {
      cost += p.stock * p.purchasePrice;
      sale += p.stock * p.sellingPrice;
      for (const b of p.bs) {
        if (b.d !== null && b.d < 0) { expiredCost += b.qty * b.cost; expiredCount++; }
        else if (b.d !== null && b.d <= SOON) soonCount++;
      }
    }
    return { cost, sale, expiredCost, soonCount, expiredCount };
  }, [rows]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    let r = rows.filter((p) => p.stock > 0 || p.bs.length > 0 || filter === 'LOW');
    if (k) r = r.filter((p) => p.name.toLowerCase().includes(k) || (p.genericName || '').toLowerCase().includes(k) || (p.company || '').toLowerCase().includes(k) || p.bs.some((b: any) => (b.batchNo || '').toLowerCase().includes(k)));
    if (filter === 'SOON') r = r.filter((p) => p.soonQty > 0).sort((a, b) => (a.nearest ?? 9999) - (b.nearest ?? 9999));
    if (filter === 'EXPIRED') r = r.filter((p) => p.expiredQty > 0);
    if (filter === 'LOW') r = r.filter((p) => p.low);
    return r;
  }, [rows, q, filter]);

  const discard = async (p: any, b: any) => {
    if (!window.confirm(`${p.name} (ব্যাচ ${b.batchNo || '—'}) — ${fmtStock(b.qty, p)} স্টক থেকে বাদ দিবেন?`)) return;
    setBusy(true); setErr(''); setOk('');
    try {
      await gql(`mutation($id:ID!){ discardBatch(batchId:$id) }`, { id: b.id });
      setOk('🗑️ ব্যাচ স্টক থেকে বাদ দেওয়া হয়েছে');
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-slate-800">🗂️ মেয়াদ ও ব্যাচ</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="card"><div className="text-sm text-slate-500">স্টকের দাম (কেনা দামে)</div><div className="text-xl font-bold text-slate-800">{taka(sum.cost)}</div></div>
        <div className="card"><div className="text-sm text-slate-500">স্টকের দাম (বিক্রির দামে)</div><div className="text-xl font-bold text-brand-700">{taka(sum.sale)}</div></div>
        <div className="rounded-3xl bg-rose-50 p-4"><div className="text-sm text-slate-600">মেয়াদ শেষ মাল</div><div className="text-xl font-bold text-rose-700">{taka(sum.expiredCost)}</div><div className="text-xs text-slate-500">{sum.expiredCount} ব্যাচ</div></div>
        <div className="rounded-3xl bg-amber-50 p-4"><div className="text-sm text-slate-600">{SOON} দিনের মধ্যে শেষ</div><div className="text-xl font-bold text-amber-700">{sum.soonCount} ব্যাচ</div></div>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
        <input className="input !pl-12" placeholder="ওষুধ, কোম্পানি বা ব্যাচ নং" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`chip whitespace-nowrap ${filter === k ? 'chip-on' : ''}`}>{l}</button>)}
      </div>

      {ok && <div className="animate-pop rounded-2xl bg-brand-50 text-brand-700 font-semibold px-4 py-3 text-center">{ok}</div>}
      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

      <div className="space-y-2">
        {!loaded && [0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}
        {shown.map((p) => (
          <div key={p.id} className="card !p-0 overflow-hidden">
            <button onClick={() => setOpen(open === p.id ? '' : p.id)} className="w-full text-left p-4 flex justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{p.name}</div>
                <div className="text-sm text-slate-500 truncate">{[p.company, p.genericName].filter(Boolean).join(' • ') || '—'}</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.expiredQty > 0 && <span className="badge bg-rose-100 text-rose-700">মেয়াদ শেষ</span>}
                  {p.soonQty > 0 && <span className="badge bg-amber-100 text-amber-700">মেয়াদ কাছে</span>}
                  {p.low && <span className="badge bg-orange-100 text-orange-700">কম আছে</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-slate-800">{fmtStock(p.stock, p)}</div>
                <div className="text-xs text-slate-500">{p.bs.length} ব্যাচ</div>
              </div>
            </button>

            {open === p.id && (
              <div className="bg-slate-50 p-3 space-y-2 animate-fade-in">
                {p.bs.map((b: any) => {
                  const t = tone(b.d);
                  return (
                    <div key={b.id} className="bg-white rounded-2xl p-3 space-y-2 shadow-soft">
                      <div className="flex justify-between gap-2">
                        <div className="font-medium text-slate-800">ব্যাচ: {b.batchNo || '—'}</div>
                        <span className={`badge h-fit ${t.bg} ${t.c}`}>{t.t}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                        <div className="text-slate-500">মেয়াদ</div><div className="text-right">{b.expiry ? fmtDate(b.expiry) : '—'}</div>
                        <div className="text-slate-500">পরিমাণ</div><div className="text-right font-semibold">{fmtStock(b.qty, p)}</div>
                        <div className="text-slate-500">কেনা দামে মোট</div><div className="text-right">{taka(b.qty * b.cost)}</div>
                        <div className="text-slate-500">এসেছে</div><div className="text-right">{fmtDate(b.receivedAt)}</div>
                      </div>
                      {b.d !== null && b.d < 0 && (
                        <button className="btn-red !py-2 !text-base" disabled={busy} onClick={() => discard(p, b)}>🗑️ স্টক থেকে বাদ দিন</button>
                      )}
                    </div>
                  );
                })}
                {p.bs.length === 0 && <div className="text-sm text-slate-500 text-center py-2">কোনো ব্যাচ নেই (স্টক: {fmtStock(p.stock, p)})</div>}
                <div className="text-xs text-slate-500 text-center">বিক্রির সময় যে ব্যাচের মেয়াদ আগে শেষ হবে সেটা আগে কাটা হয়।</div>
              </div>
            )}
          </div>
        ))}
        {loaded && shown.length === 0 && <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">🗂️</div>কিছু পাওয়া যায়নি</div>}
      </div>
    </AppShell>
  );
}