'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const empty = { name: '', unit: 'pcs', purchasePrice: '', sellingPrice: '', stock: '', minStock: '' };
const UNITS = ['pcs', 'kg', 'লিটার', 'প্যাকেট', 'ডজন'];

export default function Mal() {
  const [list, setList] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');
  const [f, setF] = useState<any>(empty);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  const load = () => gql(`query{ products{id name unit purchasePrice sellingPrice stock minStock} }`).then((d) => setList(d.products)).catch((e) => setErr(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  const add = async () => {
    setErr('');
    if (!f.name.trim()) return setErr('পণ্যের নাম লিখুন');
    try {
      await gql(`mutation($i:ProductInput!){ createProduct(input:$i){ id } }`, {
        i: { name: f.name, unit: f.unit || 'pcs', purchasePrice: Number(f.purchasePrice) || 0, sellingPrice: Number(f.sellingPrice) || 0, stock: Number(f.stock) || 0, minStock: Number(f.minStock) || 0 },
      });
      setF(empty); setShow(false); load();
    } catch (e: any) { setErr(e.message); }
  };

  const isLow = (p: any) => p.minStock > 0 && p.stock <= p.minStock;
  const low = list.filter(isLow);
  const shown = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell>
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold text-slate-800">মাল / পণ্য</h1>
        {list.length > 0 && <span className="badge bg-white text-slate-600 shadow-soft">মোট {list.length}টি</span>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/purchase" className="btn text-center">📦 মাল কিনেছি</Link>
        <button className="btn-dark" onClick={() => setShow(!show)}>{show ? '✕ বন্ধ করুন' : '+ নতুন পণ্য'}</button>
      </div>

      {show && (
        <div className="card animate-fade-up space-y-3">
          <div>
            <label className="label">পণ্যের নাম</label>
            <input className="input" placeholder="যেমন: চাল" value={f.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">কীসে মাপেন?</label>
            <div className="flex flex-wrap gap-2">
              {UNITS.map((u) => <button key={u} onClick={() => set('unit', u)} className={`chip !py-1.5 !px-3 text-sm ${f.unit === u ? 'chip-on' : '!bg-slate-100 !shadow-none'}`}>{u}</button>)}
            </div>
            <input className="input mt-2" placeholder="অন্য কিছু হলে লিখুন" value={f.unit} onChange={(e) => set('unit', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">কেনা দাম</label><input className="input" inputMode="decimal" placeholder="৳" value={f.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} /></div>
            <div><label className="label">বিক্রির দাম</label><input className="input" inputMode="decimal" placeholder="৳" value={f.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} /></div>
            <div><label className="label">এখন কতটা আছে</label><input className="input" inputMode="decimal" value={f.stock} onChange={(e) => set('stock', e.target.value)} /></div>
            <div><label className="label">কতটায় নামলে জানাবো</label><input className="input" inputMode="decimal" value={f.minStock} onChange={(e) => set('minStock', e.target.value)} /></div>
          </div>
          <button className="btn" onClick={add}>সেভ করুন</button>
        </div>
      )}
      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

      {/* কমে যাওয়া পণ্যের সতর্কতা */}
      {low.length > 0 && (
        <div className="rounded-3xl bg-amber-50 p-4">
          <div className="font-bold text-amber-800 mb-2">⚠️ শেষ হয়ে আসছে — {low.length}টি</div>
          <div className="space-y-1">
            {low.map((p) => <div key={p.id} className="text-sm text-amber-900 flex justify-between"><span>{p.name}</span><span>আছে {p.stock} {p.unit} (সীমা {p.minStock})</span></div>)}
          </div>
        </div>
      )}

      {list.length > 5 && (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          <input className="input !pl-12" placeholder="পণ্য খুঁজুন..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {/* পণ্যের তালিকা */}
      <div className="space-y-2 stagger">
        {!loaded && [0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-20" />)}
        {shown.map((p) => (
          <div key={p.id} className="card flex items-center gap-3 !p-3">
            <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-2xl ${isLow(p) ? 'bg-rose-50' : 'bg-brand-50'}`}>📦</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 truncate">{p.name}</div>
              <div className="text-sm text-slate-500">কেনা {taka(p.purchasePrice)} · বিক্রি {taka(p.sellingPrice)}</div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${isLow(p) ? 'text-rose-600' : 'text-slate-800'}`}>{p.stock} {p.unit}</div>
              {isLow(p) && <span className="badge bg-rose-100 text-rose-600">কম আছে</span>}
            </div>
          </div>
        ))}
        {loaded && list.length === 0 && (
          <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">🧺</div>এখনো কোনো পণ্য নেই। চাইলে পণ্য না দিয়ে শুধু “শুধু টাকা” দিয়েও বিক্রি লিখতে পারেন।</div>
        )}
      </div>
    </AppShell>
  );
}