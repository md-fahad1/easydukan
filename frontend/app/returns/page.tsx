'use client';
import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka, timeOf, dateOf } from '@/lib/api';

const UNIT: Record<string, string> = { BOX: 'বক্স', STRIP: 'পাতা', PIECE: 'পিস', pcs: 'টি' };
const DAYS: [number, string][] = [[1, 'আজ'], [7, '৭ দিন'], [30, '৩০ দিন']];
const SALES_Q = `query($d:Int!){ returnableSales(days:$d){ id total dueAmount dueLeft createdAt customerName returnedTotal items{ id name unit qty returnedQty price serials } } }`;
const HIST_Q = `query($d:Int!){ saleReturns(days:$d){ id total refund dueAdjusted refundMethod note createdAt customerName items{ name unit qty } } }`;

const unitOf = (u?: string | null) => (u ? UNIT[u] || u : '');
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function Returns() {
  const [tab, setTab] = useState<'new' | 'list'>('new');
  const [days, setDays] = useState(7);
  const [sales, setSales] = useState<any[]>([]);
  const [hist, setHist] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const [qty, setQty] = useState<Record<string, string>>({});
  const [pickSer, setPickSer] = useState<Record<string, string[]>>({}); // IMEI-ওয়ালা আইটেমে কোন কোনটি ফেরত
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
      if (!s.items.some((i: any) => i.qty - i.returnedQty > 0)) return false; // সব ফেরত হয়ে গেলে দেখাব না
      if (!k) return true;
      return (s.customerName || '').toLowerCase().includes(k) || s.items.some((i: any) => i.name.toLowerCase().includes(k));
    });
  }, [sales, q]);

  const pick = (id: string) => {
    setOpen(open === id ? '' : id);
    setQty({}); setPickSer({}); setNote(''); setMethod('CASH'); setErr(''); setOk('');
  };

  const sale = sales.find((s) => s.id === open);
  const left = (i: any) => r2(i.qty - i.returnedQty);
  const setItem = (i: any, v: number) => {
    const c = Math.min(Math.max(v, 0), left(i));
    setQty((p) => ({ ...p, [i.id]: c ? String(c) : '' }));
  };
  // IMEI-ওয়ালা আইটেমে পরিমাণ = বাছাই করা IMEI-র সংখ্যা
  const qOf = (i: any) => (i.serials?.length ? (pickSer[i.id] || []).length : Number(qty[i.id]) || 0);
  const toggleSer = (i: any, s: string) => setPickSer((p) => { const cur = p[i.id] || []; return { ...p, [i.id]: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] }; });
  const total = sale ? r2(sale.items.reduce((a: number, i: any) => a + qOf(i) * i.price, 0)) : 0;
  const dueAdj = sale && sale.customerName ? r2(Math.min(total, sale.dueLeft)) : 0;
  const refund = r2(total - dueAdj);

  const submit = async () => {
    if (!sale) return;
    const items = sale.items
      .map((i: any) => ({ saleItemId: i.id, qty: qOf(i), serials: i.serials?.length ? pickSer[i.id] || [] : null }))
      .filter((x: any) => x.qty > 0);
    if (!items.length) { setErr('কত ফেরত দিবেন লিখুন'); return; }
    if (!window.confirm(`মোট ${taka(total)} ফেরত নিবেন?`)) return;
    setBusy(true); setErr('');
    try {
      await gql(`mutation($i:SaleReturnInput!){ createSaleReturn(input:$i){ id } }`, {
        i: { saleId: sale.id, items, refundMethod: method, note: note || null },
      });
      setOk(`✅ ফেরত নেওয়া হয়েছে — ${taka(total)}`);
      setOpen(''); setQty({}); setPickSer({}); setNote('');
      load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">বিক্রি ফেরত</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab('new')} className={`chip flex-1 ${tab === 'new' ? 'chip-on' : ''}`}>↩️ নতুন ফেরত</button>
        <button onClick={() => setTab('list')} className={`chip flex-1 ${tab === 'list' ? 'chip-on' : ''}`}>📋 ফেরতের তালিকা</button>
      </div>
      <div className="flex gap-2">
        {DAYS.map(([d, l]) => <button key={d} onClick={() => setDays(d)} className={`chip flex-1 ${days === d ? 'chip-on' : ''}`}>{l}</button>)}
      </div>

      {ok && <div className="card bg-emerald-50 border-emerald-200 text-emerald-700">{ok}</div>}
      {err && <div className="text-rose-600">{err}</div>}

      {tab === 'new' && (
        <>
          <input className="input" placeholder="কাস্টমার বা ওষুধের নাম দিয়ে খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="space-y-2">
            {shown.map((s) => (
              <div key={s.id} className="card p-0 overflow-hidden">
                <button onClick={() => pick(s.id)} className="w-full text-left p-4 flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.customerName || 'নগদ কাস্টমার'}</div>
                    <div className="text-sm text-gray-500">{dateOf(s.createdAt)} • {timeOf(s.createdAt)}</div>
                    <div className="text-sm text-gray-500 truncate">{s.items.map((i: any) => i.name).join(', ')}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">{taka(s.total)}</div>
                    {s.returnedTotal > 0 && <div className="text-xs text-rose-500">ফেরত {taka(s.returnedTotal)}</div>}
                  </div>
                </button>

                {open === s.id && (
                  <div className="border-t bg-gray-50 p-4 space-y-3">
                    {s.items.filter((i: any) => left(i) > 0).map((i: any) => (
                      <div key={i.id} className="bg-white rounded-xl border p-3 space-y-2">
                        <div className="flex justify-between gap-2">
                          <div className="font-medium">{i.name}</div>
                          <div className="text-sm text-gray-500 shrink-0">{taka(i.price)} / {unitOf(i.unit) || 'একক'}</div>
                        </div>
                        <div className="text-sm text-gray-500">ফেরত দেওয়া যাবে: {left(i)} {unitOf(i.unit)}</div>
                        {i.serials?.length > 0 ? (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">কোনটি ফেরত এসেছে? (IMEI / সিরিয়াল বেছে নিন)</div>
                            <div className="flex flex-wrap gap-1.5">
                              {i.serials.map((s: string) => {
                                const on = (pickSer[i.id] || []).includes(s);
                                return <button key={s} onClick={() => toggleSer(i, s)} className={`badge font-mono !text-sm !py-1.5 active:scale-95 ${on ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{on ? '✓ ' : ''}{s}</button>;
                              })}
                            </div>
                          </div>
                        ) : (
                        <div className="flex items-center gap-2">
                          <button className="w-12 h-12 rounded-xl border text-2xl active:scale-95" onClick={() => setItem(i, (Number(qty[i.id]) || 0) - 1)}>−</button>
                          <input className="input text-center" inputMode="decimal" placeholder="0" value={qty[i.id] || ''}
                            onChange={(e) => setItem(i, Number(e.target.value) || 0)} />
                          <button className="w-12 h-12 rounded-xl border text-2xl active:scale-95" onClick={() => setItem(i, (Number(qty[i.id]) || 0) + 1)}>+</button>
                          <button className="px-3 h-12 rounded-xl border text-sm text-emerald-700 active:scale-95" onClick={() => setItem(i, left(i))}>সব</button>
                        </div>
                        )}
                      </div>
                    ))}

                    {total > 0 && (
                      <div className="card space-y-1">
                        <div className="flex justify-between"><span>ফেরতের মোট</span><b>{taka(total)}</b></div>
                        {dueAdj > 0 && <div className="flex justify-between text-amber-700"><span>বাকি থেকে কমবে</span><b>− {taka(dueAdj)}</b></div>}
                        {refund > 0 && <div className="flex justify-between text-rose-600"><span>কাস্টমারকে ফেরত দিতে হবে</span><b>{taka(refund)}</b></div>}
                      </div>
                    )}

                    {refund > 0 && (
                      <div className="flex gap-2">
                        <button onClick={() => setMethod('CASH')} className={`chip flex-1 ${method === 'CASH' ? 'chip-on' : ''}`}>💵 নগদ দিলাম</button>
                        <button onClick={() => setMethod('BKASH')} className={`chip flex-1 ${method === 'BKASH' ? 'chip-on' : ''}`}>📱 বিকাশে দিলাম</button>
                      </div>
                    )}

                    <input className="input" placeholder="কারণ (ঐচ্ছিক) — যেমন: ভুল ওষুধ" value={note} onChange={(e) => setNote(e.target.value)} />
                    <button className="btn" disabled={busy || total <= 0} onClick={submit}>{busy ? 'অপেক্ষা করুন...' : `↩️ ${taka(total)} ফেরত নিন`}</button>
                  </div>
                )}
              </div>
            ))}
            {shown.length === 0 && <div className="text-gray-400 text-center py-6">ফেরত দেওয়ার মতো বিক্রি নেই</div>}
          </div>
        </>
      )}

      {tab === 'list' && (
        <div className="space-y-2">
          {hist.map((r) => (
            <div key={r.id} className="card space-y-1">
              <div className="flex justify-between gap-2">
                <div className="font-semibold truncate">{r.customerName || 'নগদ কাস্টমার'}</div>
                <div className="font-bold text-rose-600 shrink-0">{taka(r.total)}</div>
              </div>
              <div className="text-sm text-gray-500">{dateOf(r.createdAt)} • {timeOf(r.createdAt)}</div>
              <div className="text-sm">{r.items.map((i: any) => `${i.name} × ${i.qty} ${unitOf(i.unit)}`.trim()).join(', ')}</div>
              <div className="text-sm text-gray-500">
                {r.dueAdjusted > 0 && <>বাকি কমেছে {taka(r.dueAdjusted)}</>}
                {r.dueAdjusted > 0 && r.refund > 0 && ' • '}
                {r.refund > 0 && <>{r.refundMethod === 'BKASH' ? 'বিকাশে' : 'নগদ'} ফেরত {taka(r.refund)}</>}
              </div>
              {r.note && <div className="text-sm text-gray-500">📝 {r.note}</div>}
            </div>
          ))}
          {hist.length === 0 && <div className="text-gray-400 text-center py-6">কোনো ফেরত নেই</div>}
        </div>
      )}
    </AppShell>
  );
}