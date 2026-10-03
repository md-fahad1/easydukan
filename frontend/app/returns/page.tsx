'use client';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka, timeOf, dateOf } from '@/lib/api';

const UNIT: Record<string, string> = { BOX: 'বক্স', STRIP: 'পাতা', PIECE: 'পিস' };
const DAYS: [number, string][] = [[1, 'আজ'], [7, '৭ দিন'], [30, '৩০ দিন']];
const SALES_Q = `query($d:Int!){ returnableSales(days:$d){ id total dueAmount dueLeft createdAt customerName returnedTotal items{ id name unit qty returnedQty price } } }`;
const HIST_Q = `query($d:Int!){ saleReturns(days:$d){ id total refund dueAdjusted refundMethod note createdAt customerName items{ name unit qty } } }`;

const unitOf = (u?: string | null) => (u ? UNIT[u] || u : '');
const r2 = (n: number) => Math.round(n * 100) / 100;

function Seg({ items, value, onChange }: { items: [any, string][]; value: any; onChange: (v: any) => void }) {
  return (
    <div className="flex gap-1.5 bg-white rounded-full p-1.5 shadow-soft">
      {items.map(([k, l]) => (
        <button key={String(k)} onClick={() => onChange(k)} className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${value === k ? 'bg-ink text-white' : 'text-slate-500'}`}>{l}</button>
      ))}
    </div>
  );
}

export default function Returns() {
  const [tab, setTab] = useState<'new' | 'list'>('new');
  const [days, setDays] = useState(7);
  const [sales, setSales] = useState<any[]>([]);
  const [hist, setHist] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const [qty, setQty] = useState<Record<string, string>>({});
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const load = () => {
    setErr('');
    gql(SALES_Q, { d: days }).then((d) => setSales(d.returnableSales)).catch((e) => setErr(e.message));
    gql(HIST_Q, { d: days }).then((d) => setHist(d.saleReturns)).catch((e) => setErr(e.message));
  };
  useEffect(() => { load(); }, [days]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return sales.filter((s) => {
      if (!s.items.some((i: any) => i.qty - i.returnedQty > 0)) return false;
      if (!k) return true;
      return (s.customerName || '').toLowerCase().includes(k) || s.items.some((i: any) => i.name.toLowerCase().includes(k));
    });
  }, [sales, q]);

  const pick = (id: string) => {
    setOpen(open === id ? '' : id);
    setQty({}); setNote(''); setMethod('CASH'); setErr(''); setOk('');
  };

  const sale = sales.find((s) => s.id === open);
  const left = (i: any) => r2(i.qty - i.returnedQty);
  const setItem = (i: any, v: number) => {
    const c = Math.min(Math.max(v, 0), left(i));
    setQty((p) => ({ ...p, [i.id]: c ? String(c) : '' }));
  };
  const total = sale ? r2(sale.items.reduce((a: number, i: any) => a + (Number(qty[i.id]) || 0) * i.price, 0)) : 0;
  const dueAdj = sale && sale.customerName ? r2(Math.min(total, sale.dueLeft)) : 0;
  const refund = r2(total - dueAdj);

  const submit = async () => {
    if (!sale) return;
    const items = Object.entries(qty).map(([saleItemId, v]) => ({ saleItemId, qty: Number(v) || 0 })).filter((x) => x.qty > 0);
    if (!items.length) { setErr('কতটা ফেরত দিচ্ছে লিখুন'); return; }
    if (!window.confirm(`মোট ${taka(total)} ফেরত নিবেন?`)) return;
    setBusy(true); setErr('');
    try {
      await gql(`mutation($i:SaleReturnInput!){ createSaleReturn(input:$i){ id } }`, {
        i: { saleId: sale.id, items, refundMethod: method, note: note || null },
      });
      setOk(`✅ ফেরত নেওয়া হয়েছে — ${taka(total)}`);
      setOpen(''); setQty({}); setNote('');
      load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-slate-800">↩️ বিক্রি ফেরত</h1>

      <Seg items={[['new', 'নতুন ফেরত'], ['list', 'ফেরতের তালিকা']]} value={tab} onChange={setTab} />
      <Seg items={DAYS} value={days} onChange={setDays} />

      {ok && <div className="animate-pop rounded-2xl bg-brand-50 text-brand-700 font-semibold px-4 py-3 text-center">{ok}</div>}
      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

      {tab === 'new' && (
        <>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            <input className="input !pl-12" placeholder="কাস্টমার বা পণ্যের নাম দিয়ে খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="space-y-2">
            {shown.map((s) => (
              <div key={s.id} className="card !p-0 overflow-hidden">
                <button onClick={() => pick(s.id)} className="w-full text-left p-4 flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{s.customerName || 'নগদ কাস্টমার'}</div>
                    <div className="text-sm text-slate-500">{dateOf(s.createdAt)} • {timeOf(s.createdAt)}</div>
                    <div className="text-sm text-slate-500 truncate">{s.items.map((i: any) => i.name).join(', ')}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-800">{taka(s.total)}</div>
                    {s.returnedTotal > 0 && <div className="text-xs text-rose-500">ফেরত {taka(s.returnedTotal)}</div>}
                  </div>
                </button>

                {open === s.id && (
                  <div className="bg-slate-50 p-4 space-y-3 animate-fade-in">
                    {s.items.filter((i: any) => left(i) > 0).map((i: any) => (
                      <div key={i.id} className="bg-white rounded-2xl p-3 space-y-2 shadow-soft">
                        <div className="flex justify-between gap-2">
                          <div className="font-medium text-slate-800">{i.name}</div>
                          <div className="text-sm text-slate-500 shrink-0">{taka(i.price)} / {unitOf(i.unit) || 'একক'}</div>
                        </div>
                        <div className="text-sm text-slate-500">ফেরত দেওয়া যাবে: {left(i)} {unitOf(i.unit)}</div>
                        <div className="flex items-center gap-2">
                          <button className="w-12 h-12 rounded-full bg-slate-100 text-2xl active:scale-95" onClick={() => setItem(i, (Number(qty[i.id]) || 0) - 1)}>−</button>
                          <input className="input text-center" inputMode="decimal" placeholder="0" value={qty[i.id] || ''} onChange={(e) => setItem(i, Number(e.target.value) || 0)} />
                          <button className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 text-2xl active:scale-95" onClick={() => setItem(i, (Number(qty[i.id]) || 0) + 1)}>+</button>
                          <button className="px-4 h-12 rounded-full bg-brand-50 text-sm font-semibold text-brand-700 active:scale-95" onClick={() => setItem(i, left(i))}>সব</button>
                        </div>
                      </div>
                    ))}

                    {total > 0 && (
                      <div className="card space-y-1">
                        <div className="flex justify-between"><span>ফেরতের মোট</span><b>{taka(total)}</b></div>
                        {dueAdj > 0 && <div className="flex justify-between text-amber-700"><span>বাকি থেকে কমবে</span><b>− {taka(dueAdj)}</b></div>}
                        {refund > 0 && <div className="flex justify-between text-rose-600"><span>কাস্টমারকে ফেরত দিতে হবে</span><b>{taka(refund)}</b></div>}
                      </div>
                    )}

                    {refund > 0 && <Seg items={[['CASH', '💵 নগদ দিলাম'], ['BKASH', '📱 বিকাশে দিলাম']]} value={method} onChange={setMethod} />}

                    <input className="input" placeholder="কারণ (না লিখলেও চলবে) — যেমন: ভুল পণ্য" value={note} onChange={(e) => setNote(e.target.value)} />
                    <button className="btn" disabled={busy || total <= 0} onClick={submit}>{busy ? 'অপেক্ষা করুন...' : `↩️ ${taka(total)} ফেরত নিন`}</button>
                  </div>
                )}
              </div>
            ))}
            {shown.length === 0 && <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">🧾</div>ফেরত নেওয়ার মতো বিক্রি নেই</div>}
          </div>
        </>
      )}

      {tab === 'list' && (
        <div className="space-y-2 stagger">
          {hist.map((r) => (
            <div key={r.id} className="card space-y-1">
              <div className="flex justify-between gap-2">
                <div className="font-semibold text-slate-800 truncate">{r.customerName || 'নগদ কাস্টমার'}</div>
                <div className="font-bold text-rose-600 shrink-0">{taka(r.total)}</div>
              </div>
              <div className="text-sm text-slate-500">{dateOf(r.createdAt)} • {timeOf(r.createdAt)}</div>
              <div className="text-sm">{r.items.map((i: any) => `${i.name} × ${i.qty} ${unitOf(i.unit)}`.trim()).join(', ')}</div>
              <div className="text-sm text-slate-500">
                {r.dueAdjusted > 0 && <>বাকি কমেছে {taka(r.dueAdjusted)}</>}
                {r.dueAdjusted > 0 && r.refund > 0 && ' • '}
                {r.refund > 0 && <>{r.refundMethod === 'BKASH' ? 'বিকাশে' : 'নগদ'} ফেরত {taka(r.refund)}</>}
              </div>
              {r.note && <div className="text-sm text-slate-500">📝 {r.note}</div>}
            </div>
          ))}
          {hist.length === 0 && <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">📋</div>কোনো ফেরত নেই</div>}
        </div>
      )}
    </AppShell>
  );
}