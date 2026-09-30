'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

const empty = { name: '', unit: 'pcs', purchasePrice: '', sellingPrice: '', stock: '', minStock: '' };

export default function Mal() {
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState<any>(empty);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  const load = () => gql(`query{ products{id name unit purchasePrice sellingPrice stock minStock} }`).then((d) => setList(d.products)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  const add = async () => {
    setErr('');
    try {
      await gql(`mutation($i:ProductInput!){ createProduct(input:$i){ id } }`, {
        i: { name: f.name, unit: f.unit || 'pcs', purchasePrice: Number(f.purchasePrice) || 0, sellingPrice: Number(f.sellingPrice) || 0, stock: Number(f.stock) || 0, minStock: Number(f.minStock) || 0 },
      });
      setF(empty); setShow(false); load();
    } catch (e: any) { setErr(e.message); }
  };

  const low = list.filter((p) => p.minStock > 0 && p.stock <= p.minStock);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">মাল / পণ্য</h1>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/purchase" className="btn text-center">📦 মাল কেনা</Link>
        <button className="btn-outline" onClick={() => setShow(!show)}>+ নতুন পণ্য</button>
      </div>
      {show && (
        <div className="card space-y-2">
          <input className="input" placeholder="পণ্যের নাম (যেমন: চাল)" value={f.name} onChange={(e) => set('name', e.target.value)} />
          <input className="input" placeholder="একক (kg, pcs, লিটার)" value={f.unit} onChange={(e) => set('unit', e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" inputMode="decimal" placeholder="ক্রয় মূল্য" value={f.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} />
            <input className="input" inputMode="decimal" placeholder="বিক্রয় মূল্য" value={f.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} />
            <input className="input" inputMode="decimal" placeholder="বর্তমান স্টক" value={f.stock} onChange={(e) => set('stock', e.target.value)} />
            <input className="input" inputMode="decimal" placeholder="কমপক্ষে স্টক" value={f.minStock} onChange={(e) => set('minStock', e.target.value)} />
          </div>
          <button className="btn" onClick={add}>সেভ করুন</button>
        </div>
      )}
      {err && <div className="text-rose-600">{err}</div>}
      {low.length > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="font-bold">⚠️ কমে যাওয়া পণ্য — {low.length}টি</div>
          {low.map((p) => <div key={p.id} className="text-sm">{p.name}: {p.stock} {p.unit} (কমপক্ষে {p.minStock})</div>)}
        </div>
      )}
      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.id} className="card flex justify-between">
            <div><div className="font-semibold">{p.name}</div><div className="text-sm text-gray-500">কেনা {taka(p.purchasePrice)} · বিক্রি {taka(p.sellingPrice)}</div></div>
            <div className={`font-bold ${p.minStock > 0 && p.stock <= p.minStock ? 'text-rose-600' : ''}`}>{p.stock} {p.unit}</div>
          </div>
        ))}
        {list.length === 0 && <div className="text-gray-400 text-center">এখনো কোনো পণ্য নেই — চাইলে শুধু “দ্রুত বিক্রি” দিয়েও হিসাব রাখতে পারেন</div>}
      </div>
    </AppShell>
  );
}
