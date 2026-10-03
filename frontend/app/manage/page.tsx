'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka, timeOf, dateOf } from '@/lib/api';

const UNIT: Record<string, string> = { BOX: 'বক্স', STRIP: 'পাতা', PIECE: 'পিস' };
const DAYS: [number, string][] = [[1, 'আজ'], [7, '৭ দিন'], [30, '৩০ দিন']];
const unitOf = (u?: string | null) => (u ? UNIT[u] || u : '');
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: string) => Number(v) || 0;

const SALES_Q = `query($d:Int!){ manageSales(days:$d){ id total cashAmount bkashAmount dueAmount note createdAt customerId customerName hasReturn items{ id productId name unit qty price } } }`;
const PURCHASES_Q = `query($d:Int!){ managePurchases(days:$d){ id total paid due createdAt supplierId supplierName items{ id productId name unit qty cost batchNo expiry } } }`;

function Seg({ items, value, onChange }: { items: [any, string][]; value: any; onChange: (v: any) => void }) {
  return (
    <div className="flex gap-1.5 bg-white rounded-full p-1.5 shadow-soft">
      {items.map(([k, l]) => (
        <button key={String(k)} onClick={() => onChange(k)} className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${value === k ? 'bg-ink text-white' : 'text-slate-500'}`}>{l}</button>
      ))}
    </div>
  );
}

export default function Manage() {
  const [tab, setTab] = useState<'sale' | 'purchase'>('sale');
  const [days, setDays] = useState(7);
  const [pharma, setPharma] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [open, setOpen] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const [rows, setRows] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [bkash, setBkash] = useState('');
  const [due, setDue] = useState('');
  const [paid, setPaid] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => { setPharma(localStorage.getItem('ed_type') === 'ফার্মেসি'); }, []);

  const load = () => {
    setErr('');
    if (tab === 'sale') gql(SALES_Q, { d: days }).then((d) => setSales(d.manageSales)).catch((e) => setErr(e.message));
    else gql(PURCHASES_Q, { d: days }).then((d) => setPurchases(d.managePurchases)).catch((e) => setErr(e.message));
  };
  useEffect(() => { setOpen(''); setEditing(false); load(); }, [tab, days]);

  const toggle = (id: string) => { setOpen(open === id ? '' : id); setEditing(false); setErr(''); setOk(''); };

  const startEdit = (x: any) => {
    setErr('');
    setEditing(true);
    setRows(x.items.map((i: any) => ({ ...i, qty: String(i.qty), price: String(i.price ?? ''), cost: String(i.cost ?? ''), batchNo: i.batchNo || '', expiry: i.expiry || '' })));
    if (tab === 'sale') {
      setAmount(String(x.total)); setBkash(x.bkashAmount ? String(x.bkashAmount) : ''); setDue(x.dueAmount ? String(x.dueAmount) : ''); setNote(x.note || '');
    } else {
      setAmount(String(x.total)); setPaid(String(x.paid));
    }
  };
  const upd = (i: number, patch: any) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const del = async (x: any) => {
    const what = tab === 'sale' ? 'এই বিক্রি' : 'এই মাল কেনা';
    if (!window.confirm(`${what} মুছে ফেলবেন? স্টক ও বাকির হিসাব আগের অবস্থায় ফিরে যাবে।`)) return;
    setBusy(true); setErr(''); setOk('');
    try {
      if (tab === 'sale') await gql(`mutation($id:ID!){ deleteSale(id:$id) }`, { id: x.id });
      else await gql(`mutation($id:ID!){ deletePurchase(id:$id) }`, { id: x.id });
      setOk('🗑️ মুছে ফেলা হয়েছে'); setOpen(''); load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  // ---------- সেভ (বিক্রি) ----------
  const saleTotal = rows.length ? r2(rows.reduce((a, r) => a + num(r.qty) * num(r.price), 0)) : num(amount);
  const saleCash = r2(saleTotal - num(bkash) - num(due));

  const saveSale = async (x: any) => {
    setErr('');
    if (saleCash < 0) { setErr('বিকাশ + বাকি মোটের চেয়ে বেশি হয়ে গেছে'); return; }
    const live = rows.filter((r) => num(r.qty) > 0);
    if (rows.length && !live.length) { setErr('কমপক্ষে একটি পণ্য রাখুন (পুরো বিক্রি বাদ দিতে "মুছুন" চাপুন)'); return; }
    const base: any = { cashAmount: saleCash, bkashAmount: num(bkash), dueAmount: num(due), customerId: x.customerId || null, note: note || null };
    let input: any; let m: string;
    if (pharma) {
      input = { ...base, items: live.map((r) => ({ productId: r.productId, unit: r.unit, qty: num(r.qty), price: num(r.price) })) };
      m = `mutation($id:ID!,$i:PharmaSaleInput!){ editPharmacySale(id:$id,input:$i){ id } }`;
    } else {
      input = rows.length ? { ...base, items: live.map((r) => ({ productId: r.productId, qty: num(r.qty), price: num(r.price) })) } : { ...base, amount: num(amount) };
      m = `mutation($id:ID!,$i:SaleInput!){ editSale(id:$id,input:$i){ id } }`;
    }
    if (!window.confirm(`বিক্রি ${taka(saleTotal)} হিসেবে সেভ করবেন?`)) return;
    setBusy(true);
    try { await gql(m, { id: x.id, i: input }); setOk('✅ সংশোধন হয়েছে'); setOpen(''); setEditing(false); load(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  // ---------- সেভ (মাল কেনা) ----------
  const purTotal = rows.length ? r2(rows.reduce((a, r) => a + num(r.qty) * num(r.cost), 0)) : num(amount);
  const purDue = r2(purTotal - num(paid));

  const savePurchase = async (x: any) => {
    setErr('');
    if (num(paid) > purTotal) { setErr('দেওয়া টাকা মোটের চেয়ে বেশি'); return; }
    const live = rows.filter((r) => num(r.qty) > 0);
    if (rows.length && !live.length) { setErr('কমপক্ষে একটি পণ্য রাখুন (পুরোটা বাদ দিতে "মুছুন" চাপুন)'); return; }
    let input: any; let m: string;
    if (pharma) {
      input = { supplierId: x.supplierId || null, paid: num(paid), items: live.map((r) => ({ productId: r.productId, unit: r.unit, qty: num(r.qty), cost: num(r.cost), batchNo: r.batchNo || null, expiry: r.expiry || null })) };
      m = `mutation($id:ID!,$i:PharmaPurchaseInput!){ editPharmacyPurchase(id:$id,input:$i){ id } }`;
    } else {
      input = rows.length
        ? { supplierId: x.supplierId || null, paid: num(paid), items: live.map((r) => ({ productId: r.productId, qty: num(r.qty), cost: num(r.cost) })) }
        : { supplierId: x.supplierId || null, paid: num(paid), total: num(amount) };
      m = `mutation($id:ID!,$i:PurchaseInput!){ editPurchase(id:$id,input:$i){ id } }`;
    }
    if (!window.confirm(`মাল কেনা ${taka(purTotal)} হিসেবে সেভ করবেন?`)) return;
    setBusy(true);
    try { await gql(m, { id: x.id, i: input }); setOk('✅ সংশোধন হয়েছে'); setOpen(''); setEditing(false); load(); }
    catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const list = tab === 'sale' ? sales : purchases;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-slate-800">✏️ ভুল ঠিক করুন / মুছুন</h1>

      <Seg items={[['sale', '💰 বিক্রি'], ['purchase', '📦 মাল কেনা']]} value={tab} onChange={setTab} />
      <Seg items={DAYS} value={days} onChange={setDays} />

      {ok && <div className="animate-pop rounded-2xl bg-brand-50 text-brand-700 font-semibold px-4 py-3 text-center">{ok}</div>}
      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

      <div className="space-y-2">
        {list.map((x: any) => (
          <div key={x.id} className="card !p-0 overflow-hidden">
            <button onClick={() => toggle(x.id)} className="w-full text-left p-4 flex justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{tab === 'sale' ? x.customerName || 'নগদ কাস্টমার' : x.supplierName || 'কোম্পানি ছাড়া'}</div>
                <div className="text-sm text-slate-500">{dateOf(x.createdAt)} • {timeOf(x.createdAt)}</div>
                <div className="text-sm text-slate-500 truncate">{x.items.map((i: any) => i.name).join(', ') || 'শুধু টাকার হিসাব'}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-slate-800">{taka(x.total)}</div>
                {tab === 'sale' && x.dueAmount > 0 && <div className="text-xs text-amber-600">বাকি {taka(x.dueAmount)}</div>}
                {tab === 'purchase' && x.due > 0 && <div className="text-xs text-amber-600">বাকি {taka(x.due)}</div>}
              </div>
            </button>

            {open === x.id && !editing && (
              <div className="bg-slate-50 p-4 space-y-3 animate-fade-in">
                {x.items.map((i: any) => (
                  <div key={i.id} className="flex justify-between gap-2 text-sm">
                    <span>{i.name} × {i.qty} {unitOf(i.unit)}</span>
                    <span className="shrink-0">{taka(i.qty * (tab === 'sale' ? i.price : i.cost))}</span>
                  </div>
                ))}
                {tab === 'sale' && x.hasReturn && <div className="text-sm text-rose-600">এই বিক্রিতে ফেরত আছে, তাই মুছা বা ঠিক করা যাবে না।</div>}
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-outline" disabled={busy || (tab === 'sale' && x.hasReturn)} onClick={() => startEdit(x)}>✏️ ঠিক করুন</button>
                  <button className="btn-red !py-3 !text-base" disabled={busy || (tab === 'sale' && x.hasReturn)} onClick={() => del(x)}>🗑️ মুছুন</button>
                </div>
              </div>
            )}

            {open === x.id && editing && (
              <div className="bg-slate-50 p-4 space-y-3 animate-fade-in">
                {rows.map((r, k) => (
                  <div key={r.id} className="bg-white rounded-2xl p-3 space-y-2 shadow-soft">
                    <div className="font-medium text-slate-800">{r.name} {r.unit && <span className="text-sm text-slate-500">({unitOf(r.unit)})</span>}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="label">কতটা (০ দিলে বাদ)</label><input className="input" inputMode="decimal" value={r.qty} onChange={(e) => upd(k, { qty: e.target.value })} /></div>
                      <div><label className="label">{tab === 'sale' ? 'বিক্রির দাম' : 'কেনা দাম'}</label>
                        <input className="input" inputMode="decimal" value={tab === 'sale' ? r.price : r.cost} onChange={(e) => upd(k, tab === 'sale' ? { price: e.target.value } : { cost: e.target.value })} /></div>
                    </div>
                    {tab === 'purchase' && pharma && (
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="label">ব্যাচ নং</label><input className="input" value={r.batchNo} onChange={(e) => upd(k, { batchNo: e.target.value })} /></div>
                        <div><label className="label">মেয়াদ</label><input className="input" type="date" value={r.expiry} onChange={(e) => upd(k, { expiry: e.target.value })} /></div>
                      </div>
                    )}
                  </div>
                ))}

                {rows.length === 0 && (
                  <div><label className="label">মোট টাকা</label><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                )}

                {tab === 'sale' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="label">বিকাশ</label><input className="input" inputMode="decimal" value={bkash} onChange={(e) => setBkash(e.target.value)} /></div>
                      <div><label className="label">বাকি {x.customerId ? '' : '(কাস্টমার নেই)'}</label><input className="input" inputMode="decimal" disabled={!x.customerId} value={due} onChange={(e) => setDue(e.target.value)} /></div>
                    </div>
                    <input className="input" placeholder="কিছু লিখে রাখতে চাইলে (ঐচ্ছিক)" value={note} onChange={(e) => setNote(e.target.value)} />
                    <div className="card space-y-1">
                      <div className="flex justify-between"><span>নতুন মোট</span><b>{taka(saleTotal)}</b></div>
                      <div className="flex justify-between text-slate-600"><span>নগদ (বাকিটা)</span><b>{taka(saleCash)}</b></div>
                    </div>
                    <button className="btn" disabled={busy} onClick={() => saveSale(x)}>{busy ? 'অপেক্ষা করুন...' : '✔ সেভ করুন'}</button>
                  </>
                ) : (
                  <>
                    <div><label className="label">কত টাকা দিয়েছেন</label><input className="input" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
                    <div className="card space-y-1">
                      <div className="flex justify-between"><span>নতুন মোট</span><b>{taka(purTotal)}</b></div>
                      <div className="flex justify-between text-amber-700"><span>বাকি থাকবে</span><b>{taka(Math.max(purDue, 0))}</b></div>
                    </div>
                    <button className="btn" disabled={busy} onClick={() => savePurchase(x)}>{busy ? 'অপেক্ষা করুন...' : '✔ সেভ করুন'}</button>
                  </>
                )}
                <button className="btn-outline" onClick={() => setEditing(false)}>বাতিল</button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">🗂️</div>কিছু পাওয়া যায়নি</div>}
      </div>
    </AppShell>
  );
}