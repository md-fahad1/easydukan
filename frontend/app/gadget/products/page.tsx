'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import BarcodeScanner from '@/components/BarcodeScanner';
import SerialBox from '@/components/SerialBox';
import { gql, taka, parseSerials, gadgetName } from '@/lib/api';

const CATS = ['মোবাইল', 'স্মার্টওয়াচ', 'ইয়ারফোন / হেডফোন', 'চার্জার', 'ক্যাবল', 'পাওয়ার ব্যাংক', 'কভার / কেস', 'স্ক্রিন গার্ড', 'স্পিকার', 'মেমোরি / পেনড্রাইভ', 'অন্যান্য'];
const COLORS = ['Black', 'White', 'Blue', 'Red', 'Green', 'Gold', 'Silver', 'Gray', 'Pink', 'Purple'];
const VARIANTS = ['4/64GB', '6/128GB', '8/128GB', '8/256GB', '12/256GB'];
const WARR = [0, 3, 6, 12, 24];
const empty = { name: '', brand: '', model: '', category: '', color: '', variant: '', warrantyMonths: '12', trackSerial: true, barcode: '', buyPrice: '', sellPrice: '', minQty: '', openQty: '', openSerials: '' };
const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];

export default function Products() {
  const [list, setList] = useState<any[]>([]);
  const [facets, setFacets] = useState<any>({ brands: [], categories: [], colors: [], variants: [] });
  const [f, setF] = useState<any>(empty);
  const [editId, setEditId] = useState('');
  const [editStock, setEditStock] = useState(0);
  const [units, setUnits] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [scan, setScan] = useState<'' | 'form' | 'search'>('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    gql(`query{ products{ id name brand model category color variant warrantyMonths trackSerial barcode purchasePrice sellingPrice stock minStock } gadgetFacets{ brands categories colors variants } }`)
      .then((d) => { setList(d.products); setFacets(d.gadgetFacets); }).catch((e) => setErr(e.message));
  };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  const cats = uniq([...CATS, ...facets.categories]);
  const colors = uniq([...COLORS, ...facets.colors]);
  const auto = gadgetName(f);
  const serials = parseSerials(f.openSerials);

  const reset = () => { setF(empty); setEditId(''); setEditStock(0); setUnits([]); setShow(false); setErr(''); };

  const startEdit = (m: any) => {
    setEditId(m.id); setEditStock(m.stock); setUnits([]); setErr(''); setOk('');
    setF({
      ...empty, name: m.name, brand: m.brand || '', model: m.model || '', category: m.category || '', color: m.color || '', variant: m.variant || '',
      warrantyMonths: String(m.warrantyMonths), trackSerial: m.trackSerial, barcode: m.barcode || '',
      buyPrice: String(m.purchasePrice || ''), sellPrice: String(m.sellingPrice || ''), minQty: m.minStock ? String(m.minStock) : '',
    });
    setShow(true);
    window.scrollTo(0, 0);
    if (m.trackSerial && m.stock > 0) gql(`query($p:ID!){ availableUnits(productId:$p){ serial } }`, { p: m.id }).then((d) => setUnits(d.availableUnits.map((u: any) => u.serial))).catch(() => {});
  };

  const save = async () => {
    setErr(''); setOk('');
    if (!auto && !f.name.trim()) return setErr('ব্র্যান্ড / মডেল অথবা পণ্যের নাম দিন');
    if (!editId && f.trackSerial && serials.length === 0 && Number(f.openQty)) return setErr('শুরুর স্টকের IMEI / সিরিয়াল দিন');
    setBusy(true);
    try {
      const input: any = {
        name: auto ? null : f.name, brand: f.brand, model: f.model, category: f.category, color: f.color, variant: f.variant,
        warrantyMonths: Number(f.warrantyMonths) || 0, trackSerial: f.trackSerial, barcode: f.barcode || null,
        buyPrice: Number(f.buyPrice) || 0, sellPrice: Number(f.sellPrice) || 0, minQty: Number(f.minQty) || 0,
      };
      if (!editId) {
        input.openQty = f.trackSerial ? serials.length : Number(f.openQty) || 0;
        input.openSerials = f.trackSerial ? serials : null;
      }
      await gql(`mutation($id:ID,$i:GadgetInput!){ saveGadget(id:$id,input:$i){ id } }`, { id: editId || null, i: input });
      setOk(editId ? '✅ সেভ হয়েছে' : '✅ নতুন পণ্য যোগ হয়েছে');
      reset(); load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const onScan = (code: string) => { if (scan === 'form') set('barcode', code); else setQ(code); setScan(''); };

  const shown = list
    .filter((m) => !cat || (m.category || 'অন্যান্য') === cat)
    .filter((m) => !onlyLow || (m.minStock > 0 && m.stock <= m.minStock))
    .filter((m) => {
      const s = q.trim().toLowerCase();
      return !s || (m.name + ' ' + (m.category || '')).toLowerCase().includes(s) || (m.barcode || '') === q.trim();
    });
  const usedCats = uniq(list.map((m) => m.category || 'অন্যান্য'));
  const stockValue = list.reduce((a, m) => a + m.stock * m.purchasePrice, 0);

  return (
    <AppShell>
      {scan && <BarcodeScanner onScan={onScan} onClose={() => setScan('')} />}
      <h1 className="text-2xl font-bold">গ্যাজেট পণ্য</h1>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/gadget/purchase" className="btn text-center">📦 মাল কেনা</Link>
        <button className="btn-outline" onClick={() => (show ? reset() : setShow(true))}>{show ? 'বন্ধ করুন' : '+ নতুন পণ্য'}</button>
      </div>
      {ok && <div className="card bg-emerald-50 border-emerald-200 text-emerald-700">{ok}</div>}

      {show && (
        <div className="card space-y-3">
          <div className="font-bold">{editId ? 'পণ্য এডিট' : 'নতুন পণ্য'}</div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">ব্র্যান্ড</label><input className="input" list="dl-brand" placeholder="Samsung" value={f.brand} onChange={(e) => set('brand', e.target.value)} /></div>
            <div><label className="label">মডেল</label><input className="input" placeholder="Galaxy A15" value={f.model} onChange={(e) => set('model', e.target.value)} /></div>
          </div>
          <datalist id="dl-brand">{facets.brands.map((b: string) => <option key={b} value={b} />)}</datalist>

          <div>
            <label className="label">ক্যাটাগরি</label>
            <input className="input mb-2" placeholder="যেমন: মোবাইল, চার্জার" value={f.category} onChange={(e) => set('category', e.target.value)} />
            <div className="flex flex-wrap gap-2">{cats.map((c) => <button key={c} type="button" onClick={() => set('category', c)} className={`chip !px-3 !py-1.5 !text-sm ${f.category === c ? 'chip-on' : ''}`}>{c}</button>)}</div>
          </div>

          <div>
            <label className="label">রং</label>
            <input className="input mb-2" placeholder="যেমন: Black" value={f.color} onChange={(e) => set('color', e.target.value)} />
            <div className="flex flex-wrap gap-2">{colors.map((c) => <button key={c} type="button" onClick={() => set('color', c)} className={`chip !px-3 !py-1.5 !text-sm ${f.color === c ? 'chip-on' : ''}`}>{c}</button>)}</div>
          </div>

          <div>
            <label className="label">ভ্যারিয়েন্ট (RAM/স্টোরেজ, সাইজ — ঐচ্ছিক)</label>
            <input className="input mb-2" placeholder="যেমন: 8/128GB" value={f.variant} onChange={(e) => set('variant', e.target.value)} />
            <div className="flex flex-wrap gap-2">{uniq([...VARIANTS, ...facets.variants]).map((c) => <button key={c} type="button" onClick={() => set('variant', c)} className={`chip !px-3 !py-1.5 !text-sm ${f.variant === c ? 'chip-on' : ''}`}>{c}</button>)}</div>
          </div>

          {!auto && <div><label className="label">পণ্যের নাম</label><input className="input" placeholder="ব্র্যান্ড/মডেল না থাকলে নাম লিখুন" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>}
          {auto && <div className="rounded-xl bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">নাম হবে: <b>{auto}</b></div>}

          <div>
            <label className="label">ওয়ারেন্টি (মাস)</label>
            <div className="flex flex-wrap gap-2">
              {WARR.map((w) => <button key={w} type="button" onClick={() => set('warrantyMonths', String(w))} className={`chip !px-3 !py-1.5 ${Number(f.warrantyMonths) === w ? 'chip-on' : ''}`}>{w === 0 ? 'নেই' : `${w} মাস`}</button>)}
              <input className="input !w-24 !py-1.5" inputMode="numeric" value={f.warrantyMonths} onChange={(e) => set('warrantyMonths', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">স্টক কীভাবে রাখবেন?</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={!!editId && editStock > 0} onClick={() => set('trackSerial', true)} className={`chip ${f.trackSerial ? 'chip-on' : ''}`}>🔢 IMEI / সিরিয়াল</button>
              <button type="button" disabled={!!editId && editStock > 0} onClick={() => set('trackSerial', false)} className={`chip ${!f.trackSerial ? 'chip-on' : ''}`}>🔢 শুধু সংখ্যা</button>
            </div>
            <div className="text-xs text-gray-500 mt-1">মোবাইল, স্মার্টওয়াচ — IMEI/সিরিয়াল। কেবল, কভার, চার্জার — শুধু সংখ্যা। {editId && editStock > 0 && 'স্টক থাকলে এটি বদলানো যায় না।'}</div>
          </div>

          <div>
            <label className="label">বারকোড (ঐচ্ছিক)</label>
            <div className="flex gap-2">
              <input className="input" value={f.barcode} onChange={(e) => set('barcode', e.target.value)} />
              <button type="button" className="rounded-xl bg-emerald-600 text-white px-4" onClick={() => setScan('form')}>📷</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">কেনা দাম</label><input className="input" inputMode="decimal" value={f.buyPrice} onChange={(e) => set('buyPrice', e.target.value)} /></div>
            <div><label className="label">বিক্রির দাম</label><input className="input" inputMode="decimal" value={f.sellPrice} onChange={(e) => set('sellPrice', e.target.value)} /></div>
          </div>
          <div><label className="label">কমপক্ষে স্টক (এর নিচে গেলে সতর্ক করবে)</label><input className="input" inputMode="numeric" value={f.minQty} onChange={(e) => set('minQty', e.target.value)} /></div>

          {!editId && (
            <div className="space-y-2 border-t pt-3">
              <div className="font-medium">এখন দোকানে কত স্টক আছে? (ঐচ্ছিক)</div>
              {f.trackSerial
                ? <SerialBox label="স্টকে থাকা প্রতিটির IMEI / সিরিয়াল" value={f.openSerials} onChange={(v) => set('openSerials', v)} />
                : <input className="input" inputMode="numeric" placeholder="কয়টি আছে?" value={f.openQty} onChange={(e) => set('openQty', e.target.value)} />}
            </div>
          )}

          {editId && f.trackSerial && units.length > 0 && (
            <div className="border-t pt-3">
              <div className="font-medium mb-1">স্টকে থাকা IMEI / সিরিয়াল ({units.length}টি)</div>
              <div className="flex flex-wrap gap-1.5">{units.map((u) => <span key={u} className="badge bg-slate-100 text-slate-700 font-mono">{u}</span>)}</div>
            </div>
          )}

          {err && <div className="text-rose-600">{err}</div>}
          <button className="btn" disabled={busy} onClick={save}>{busy ? '...' : 'সেভ করুন'}</button>
        </div>
      )}

      <div className="flex gap-2">
        <input className="input" placeholder="নাম / ব্র্যান্ড / রং / বারকোড" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="rounded-xl bg-emerald-600 text-white px-4" onClick={() => setScan('search')}>📷</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCat('')} className={`chip !px-3 !py-1.5 !text-sm ${!cat ? 'chip-on' : ''}`}>সব</button>
        {usedCats.map((c) => <button key={c} onClick={() => setCat(cat === c ? '' : c)} className={`chip !px-3 !py-1.5 !text-sm ${cat === c ? 'chip-on' : ''}`}>{c}</button>)}
        <button onClick={() => setOnlyLow(!onlyLow)} className={`chip !px-3 !py-1.5 !text-sm ${onlyLow ? 'chip-on' : ''}`}>⚠️ কম স্টক</button>
      </div>
      {list.length > 0 && <div className="text-sm text-gray-500">মোট {list.length}টি পণ্য • স্টকের দাম (কেনা দামে) {taka(stockValue)}</div>}
      {!show && err && <div className="text-rose-600">{err}</div>}

      <div className="space-y-2">
        {shown.map((m) => {
          const low = m.minStock > 0 && m.stock <= m.minStock;
          return (
            <button key={m.id} onClick={() => startEdit(m)} className="card w-full text-left">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-gray-500">{[m.category, m.warrantyMonths ? `${m.warrantyMonths} মাস ওয়ারেন্টি` : '', m.trackSerial ? 'IMEI' : ''].filter(Boolean).join(' · ')}</div>
                </div>
                <div className={`text-right shrink-0 font-bold ${m.stock === 0 ? 'text-gray-400' : low ? 'text-rose-600' : ''}`}>
                  {m.stock}টি{low && <div className="text-xs font-normal">⚠️ কম স্টক</div>}
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-1">বিক্রি {taka(m.sellingPrice)} · কেনা {taka(m.purchasePrice)}</div>
            </button>
          );
        })}
        {shown.length === 0 && <div className="text-gray-400 text-center">কোনো পণ্য পাওয়া যায়নি</div>}
      </div>
    </AppShell>
  );
}