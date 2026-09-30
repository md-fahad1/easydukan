'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import BarcodeScanner from '@/components/BarcodeScanner';
import { gql, taka, fmtStock, unitsFor, unitFactor, r2 } from '@/lib/api';

const FORMS: [string, string][] = [['TABLET', 'ট্যাবলেট'], ['CAPSULE', 'ক্যাপসুল'], ['SYRUP', 'সিরাপ'], ['INJECTION', 'ইনজেকশন'], ['OTHER', 'অন্যান্য']];
const empty = {
  name: '', genericName: '', company: '', form: 'TABLET', barcode: '', piecesPerStrip: '10', stripsPerBox: '10',
  unit: 'BOX', sellPrice: '', buyPrice: '', minQty: '', openBoxes: '', openStrips: '', openPieces: '', openExpiry: '', openBatchNo: '',
};

export default function Medicines() {
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState<any>(empty);
  const [editId, setEditId] = useState('');
  const [show, setShow] = useState(false);
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [scan, setScan] = useState<'' | 'form' | 'search'>('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    gql(`query{ products{ id name genericName company barcode form piecesPerStrip stripsPerBox purchasePrice sellingPrice stock minStock } }`)
      .then((d) => setList(d.products)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  const pack = { form: f.form, piecesPerStrip: f.form === 'SYRUP' ? 1 : Number(f.piecesPerStrip) || 1, stripsPerBox: Number(f.stripsPerBox) || 1 };
  const units = unitsFor(pack);
  const unit = units.some((u) => u[0] === f.unit) ? f.unit : 'PIECE';
  const boxPieces = pack.piecesPerStrip * pack.stripsPerBox;

  const startEdit = (m: any) => {
    const u = unitsFor(m)[0][0];
    const fc = unitFactor(m, u);
    setEditId(m.id);
    setF({
      ...empty, name: m.name, genericName: m.genericName || '', company: m.company || '', form: m.form === 'GENERAL' ? 'OTHER' : m.form,
      barcode: m.barcode || '', piecesPerStrip: String(m.piecesPerStrip), stripsPerBox: String(m.stripsPerBox), unit: u,
      sellPrice: String(r2(m.sellingPrice * fc)), buyPrice: String(r2(m.purchasePrice * fc)), minQty: m.minStock ? String(r2(m.minStock / fc)) : '',
    });
    setShow(true);
    window.scrollTo(0, 0);
  };

  const reset = () => { setF(empty); setEditId(''); setShow(false); };

  const exp = (m: string) => {
    if (!m) return null;
    const [y, mo] = m.split('-').map(Number);
    return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  };

  const save = async () => {
    setErr('');
    if (!f.name.trim()) return setErr('ওষুধের নাম দিন');
    setBusy(true);
    try {
      const input: any = {
        name: f.name, genericName: f.genericName || null, company: f.company || null, form: f.form, barcode: f.barcode || null,
        piecesPerStrip: pack.piecesPerStrip, stripsPerBox: pack.stripsPerBox, priceUnit: unit,
        sellPrice: Number(f.sellPrice) || 0, buyPrice: Number(f.buyPrice) || 0, minQty: Number(f.minQty) || 0,
      };
      if (!editId) {
        Object.assign(input, {
          openBoxes: Number(f.openBoxes) || 0, openStrips: Number(f.openStrips) || 0, openPieces: Number(f.openPieces) || 0,
          openExpiry: exp(f.openExpiry), openBatchNo: f.openBatchNo || null,
        });
      }
      await gql(`mutation($id:ID,$i:MedicineInput!){ saveMedicine(id:$id,input:$i){ id } }`, { id: editId || null, i: input });
      reset();
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const onScan = (code: string) => {
    if (scan === 'form') set('barcode', code);
    else setQ(code);
    setScan('');
  };

  const shown = list
    .filter((m) => !onlyLow || (m.minStock > 0 && m.stock <= m.minStock))
    .filter((m) => {
      const s = q.toLowerCase();
      return !s || m.name.toLowerCase().includes(s) || (m.genericName || '').toLowerCase().includes(s) || (m.company || '').toLowerCase().includes(s) || (m.barcode || '') === q;
    });

  return (
    <AppShell>
      {scan && <BarcodeScanner onScan={onScan} onClose={() => setScan('')} />}
      <h1 className="text-2xl font-bold">ওষুধের তালিকা</h1>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/pharmacy/purchase" className="btn text-center">📦 মাল কেনা</Link>
        <button className="btn-outline" onClick={() => (show ? reset() : setShow(true))}>{show ? 'বন্ধ করুন' : '+ নতুন ওষুধ'}</button>
      </div>

      {show && (
        <div className="card space-y-3">
          <div className="font-bold">{editId ? 'ওষুধ এডিট' : 'নতুন ওষুধ'}</div>
          <input className="input" placeholder="ওষুধের নাম (যেমন: Napa 500mg)" value={f.name} onChange={(e) => set('name', e.target.value)} />
          <input className="input" placeholder="জেনেরিক নাম (ঐচ্ছিক, যেমন: Paracetamol)" value={f.genericName} onChange={(e) => set('genericName', e.target.value)} />
          <input className="input" placeholder="কোম্পানি (ঐচ্ছিক)" value={f.company} onChange={(e) => set('company', e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {FORMS.map(([k, v]) => <button key={k} onClick={() => set('form', k)} className={`chip ${f.form === k ? 'chip-on' : ''}`}>{v}</button>)}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {f.form !== 'SYRUP' && (
              <div><label className="label">১ পাতায় কত পিস?</label><input className="input" inputMode="numeric" value={f.piecesPerStrip} onChange={(e) => set('piecesPerStrip', e.target.value)} /></div>
            )}
            <div><label className="label">{f.form === 'SYRUP' ? '১ বক্সে কত বোতল?' : '১ বক্সে কত পাতা?'}</label><input className="input" inputMode="numeric" value={f.stripsPerBox} onChange={(e) => set('stripsPerBox', e.target.value)} /></div>
          </div>
          <div className="text-sm text-gray-500">১ বক্স = {boxPieces} {f.form === 'SYRUP' ? 'বোতল' : 'পিস'}</div>

          <div>
            <label className="label">বারকোড (ঐচ্ছিক)</label>
            <div className="flex gap-2">
              <input className="input" value={f.barcode} onChange={(e) => set('barcode', e.target.value)} />
              <button className="rounded-xl bg-emerald-600 text-white px-4" onClick={() => setScan('form')}>📷</button>
            </div>
          </div>

          <div>
            <label className="label">নিচের দাম ও কমপক্ষে স্টক কিসের হিসাবে?</label>
            <div className="flex gap-2">{units.map(([k, v]) => <button key={k} onClick={() => set('unit', k)} className={`chip ${unit === k ? 'chip-on' : ''}`}>প্রতি {v}</button>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">বিক্রয় মূল্য</label><input className="input" inputMode="decimal" value={f.sellPrice} onChange={(e) => set('sellPrice', e.target.value)} /></div>
            <div><label className="label">ক্রয় মূল্য</label><input className="input" inputMode="decimal" value={f.buyPrice} onChange={(e) => set('buyPrice', e.target.value)} /></div>
          </div>
          <div><label className="label">কমপক্ষে স্টক (এর নিচে গেলে সতর্ক করবে)</label><input className="input" inputMode="decimal" value={f.minQty} onChange={(e) => set('minQty', e.target.value)} /></div>

          {!editId && (
            <div className="space-y-2 border-t pt-3">
              <div className="font-medium">এখন দোকানে কত স্টক আছে? (ঐচ্ছিক)</div>
              <div className="grid grid-cols-3 gap-2">
                <input className="input" inputMode="decimal" placeholder="বক্স" value={f.openBoxes} onChange={(e) => set('openBoxes', e.target.value)} />
                <input className="input" inputMode="decimal" placeholder="পাতা" value={f.openStrips} onChange={(e) => set('openStrips', e.target.value)} />
                <input className="input" inputMode="decimal" placeholder="পিস" value={f.openPieces} onChange={(e) => set('openPieces', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="label">মেয়াদ</label><input className="input" type="month" value={f.openExpiry} onChange={(e) => set('openExpiry', e.target.value)} /></div>
                <div><label className="label">ব্যাচ নং</label><input className="input" value={f.openBatchNo} onChange={(e) => set('openBatchNo', e.target.value)} /></div>
              </div>
            </div>
          )}
          {err && <div className="text-rose-600">{err}</div>}
          <button className="btn" disabled={busy} onClick={save}>{busy ? '...' : 'সেভ করুন'}</button>
        </div>
      )}

      <div className="flex gap-2">
        <input className="input" placeholder="নাম / জেনেরিক / কোম্পানি / বারকোড" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="rounded-xl bg-emerald-600 text-white px-4" onClick={() => setScan('search')}>📷</button>
      </div>
      <button onClick={() => setOnlyLow(!onlyLow)} className={`chip ${onlyLow ? 'chip-on' : ''}`}>⚠️ শুধু কম স্টক</button>
      {!show && err && <div className="text-rose-600">{err}</div>}

      <div className="space-y-2">
        {shown.map((m) => {
          const low = m.minStock > 0 && m.stock <= m.minStock;
          return (
            <button key={m.id} onClick={() => startEdit(m)} className="card w-full text-left">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-gray-500">{[m.genericName, m.company].filter(Boolean).join(' · ')}</div>
                </div>
                <div className={`text-right font-bold ${low ? 'text-rose-600' : ''}`}>{fmtStock(m.stock, m)}{low && <div className="text-xs font-normal">⚠️ কম স্টক</div>}</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {unitsFor(m).map(([k, l]) => `${l} ${taka(r2(m.sellingPrice * unitFactor(m, k)))}`).join(' · ')}
              </div>
            </button>
          );
        })}
        {shown.length === 0 && <div className="text-gray-400 text-center">কোনো ওষুধ পাওয়া যায়নি</div>}
      </div>
    </AppShell>
  );
}