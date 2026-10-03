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
  const [loaded, setLoaded] = useState(false);
  const [f, setF] = useState<any>(empty);
  const [editId, setEditId] = useState('');
  const [show, setShow] = useState(false);
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [scan, setScan] = useState<'' | 'form' | 'search'>('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sugg, setSugg] = useState<any[]>([]);
  const [picked, setPicked] = useState('');

  const load = () =>
    gql(`query{ products{ id name genericName company barcode form piecesPerStrip stripsPerBox purchasePrice sellingPrice stock minStock } }`)
      .then((d) => setList(d.products)).catch((e) => setErr(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const s = f.name.trim();
    if (editId || s.length < 2 || s === picked) { setSugg([]); return; }
    let dead = false;
    const t = setTimeout(() => {
      gql(`query($q:String!){ searchCatalog(q:$q){ id brand genericName strength dosage form company } }`, { q: s })
        .then((d) => { if (!dead) setSugg(d.searchCatalog); })
        .catch(() => { if (!dead) setSugg([]); });
    }, 250);
    return () => { dead = true; clearTimeout(t); };
  }, [f.name, editId, picked]);

  const pick = (c: any) => {
    const plain = c.form === 'TABLET' || c.form === 'CAPSULE';
    const name = (plain ? `${c.brand} ${c.strength || ''}` : `${c.brand} ${c.dosage} ${c.strength || ''}`).replace(/\s+/g, ' ').trim();
    setPicked(name);
    setSugg([]);
    setF((p: any) => ({ ...p, name, genericName: c.genericName, company: c.company, form: c.form, piecesPerStrip: plain ? p.piecesPerStrip : '1' }));
  };
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
    if (!f.name.trim()) return setErr('ওষুধের নাম লিখুন');
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
      <h1 className="text-2xl font-bold text-slate-800">ওষুধের তালিকা</h1>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/pharmacy/purchase" className="btn text-center">📦 মাল কিনেছি</Link>
        <button className="btn-dark" onClick={() => (show ? reset() : setShow(true))}>{show ? '✕ বন্ধ করুন' : '+ নতুন ওষুধ'}</button>
      </div>

      {show && (
        <div className="card animate-fade-up space-y-3">
          <div className="font-bold text-slate-800">{editId ? '✏️ ওষুধ ঠিক করুন' : '➕ নতুন ওষুধ'}</div>
          <div className="relative">
            <input className="input" placeholder="ওষুধের নাম লিখুন (যেমন: napa, seclo, ace)" value={f.name} onChange={(e) => { set('name', e.target.value); setPicked(''); }} />
            {sugg.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl max-h-72 overflow-y-auto">
                {sugg.map((c) => (
                  <button key={c.id} type="button" onClick={() => pick(c)} className="w-full text-left px-4 py-2.5 border-b border-slate-100 last:border-b-0 active:bg-slate-100">
                    <div className="font-medium text-slate-800">{c.brand} <span className="text-sm text-slate-500">{c.strength}</span></div>
                    <div className="text-xs text-slate-500">{c.dosage} • {c.genericName} • {c.company}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input className="input" placeholder="জেনেরিক নাম (না দিলেও চলবে)" value={f.genericName} onChange={(e) => set('genericName', e.target.value)} />
          <input className="input" placeholder="কোম্পানি (না দিলেও চলবে)" value={f.company} onChange={(e) => set('company', e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {FORMS.map(([k, v]) => (
              <button key={k} onClick={() => set('form', k)} className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${f.form === k ? 'bg-ink text-white' : 'bg-slate-100 text-slate-600'}`}>{v}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {f.form !== 'SYRUP' && (
              <div><label className="label">১ পাতায় কত পিস?</label><input className="input" inputMode="numeric" value={f.piecesPerStrip} onChange={(e) => set('piecesPerStrip', e.target.value)} /></div>
            )}
            <div><label className="label">{f.form === 'SYRUP' ? '১ বক্সে কত বোতল?' : '১ বক্সে কত পাতা?'}</label><input className="input" inputMode="numeric" value={f.stripsPerBox} onChange={(e) => set('stripsPerBox', e.target.value)} /></div>
          </div>
          <div className="text-sm text-slate-500">১ বক্স = {boxPieces} {f.form === 'SYRUP' ? 'বোতল' : 'পিস'}</div>

          <div>
            <label className="label">বারকোড (না দিলেও চলবে)</label>
            <div className="flex gap-2">
              <input className="input" value={f.barcode} onChange={(e) => set('barcode', e.target.value)} />
              <button className="rounded-2xl bg-ink text-white px-5 text-xl active:scale-95 transition" onClick={() => setScan('form')}>📷</button>
            </div>
          </div>

          <div>
            <label className="label">নিচের দাম ও সীমা কিসের হিসাবে?</label>
            <div className="flex gap-2 flex-wrap">
              {units.map(([k, v]) => (
                <button key={k} onClick={() => set('unit', k)} className={`rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${unit === k ? 'bg-ink text-white' : 'bg-slate-100 text-slate-600'}`}>প্রতি {v}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">বিক্রির দাম</label><input className="input" inputMode="decimal" value={f.sellPrice} onChange={(e) => set('sellPrice', e.target.value)} /></div>
            <div><label className="label">কেনা দাম</label><input className="input" inputMode="decimal" value={f.buyPrice} onChange={(e) => set('buyPrice', e.target.value)} /></div>
          </div>
          <div><label className="label">কতটায় নামলে জানাবো?</label><input className="input" inputMode="decimal" value={f.minQty} onChange={(e) => set('minQty', e.target.value)} /></div>

          {!editId && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="font-medium text-slate-800">এখন দোকানে কতটা আছে? (না জানলে ফাঁকা রাখুন)</div>
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
          {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}
          <button className="btn" disabled={busy} onClick={save}>
            {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : '✔ সেভ করুন'}
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
          <input className="input !pl-12" placeholder="নাম / জেনেরিক / কোম্পানি / বারকোড" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="rounded-2xl bg-ink text-white px-5 text-xl active:scale-95 transition" onClick={() => setScan('search')}>📷</button>
      </div>
      <button onClick={() => setOnlyLow(!onlyLow)} className={`chip ${onlyLow ? 'chip-on' : ''}`}>⚠️ শুধু কম আছে যেগুলো</button>
      {!show && err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

      <div className="space-y-2 stagger">
        {!loaded && [0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}
        {shown.map((m) => {
          const low = m.minStock > 0 && m.stock <= m.minStock;
          return (
            <button key={m.id} onClick={() => startEdit(m)} className="card w-full text-left">
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-800">{m.name}</div>
                  <div className="text-xs text-slate-500">{[m.genericName, m.company].filter(Boolean).join(' · ')}</div>
                </div>
                <div className={`text-right font-bold ${low ? 'text-rose-600' : 'text-slate-800'}`}>{fmtStock(m.stock, m)}{low && <div className="text-xs font-normal">⚠️ কম আছে</div>}</div>
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {unitsFor(m).map(([k, l]) => `${l} ${taka(r2(m.sellingPrice * unitFactor(m, k)))}`).join(' · ')}
              </div>
            </button>
          );
        })}
        {loaded && shown.length === 0 && <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">💊</div>কোনো ওষুধ পাওয়া যায়নি</div>}
      </div>
    </AppShell>
  );
}