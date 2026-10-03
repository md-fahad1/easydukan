export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';

export function logout() {
  ['ed_token', 'ed_user', 'ed_shop'].forEach((k) => localStorage.removeItem(k));
  window.location.href = '/login';
}

export async function gql<T = any>(query: string, variables?: any): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ed_token') : null;
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors[0].message;
    if (msg === 'Unauthorized' && token) logout();
    throw new Error(msg);
  }
  return json.data;
}

export const taka = (n: number) => '৳' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const timeOf = (d: string) => new Date(d).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
export const dateOf = (d: string) => new Date(d).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });

// ---------- ফার্মেসি helpers ----------
export const r2 = (n: number) => Math.round(n * 100) / 100;
export const boxSize = (p: any) => (p.piecesPerStrip || 1) * (p.stripsPerBox || 1);
export const unitFactor = (p: any, u: string) => (u === 'BOX' ? boxSize(p) : u === 'STRIP' ? p.piecesPerStrip || 1 : 1);
export const pieceLabel = (p: any) => (p.form === 'SYRUP' ? 'বোতল' : 'পিস');

// বড় unit আগে: [['BOX','বক্স'],['STRIP','পাতা'],['PIECE','পিস']]
export const unitsFor = (p: any): [string, string][] => {
  const u: [string, string][] = [];
  if ((p.stripsPerBox || 1) > 1) u.push(['BOX', 'বক্স']);
  if ((p.piecesPerStrip || 1) > 1) u.push(['STRIP', 'পাতা']);
  u.push(['PIECE', pieceLabel(p)]);
  return u;
};

// পিস থেকে "5 বক্স 3 পাতা 2 পিস"
export function fmtStock(pieces: number, p: any) {
  let rest = Math.round(pieces || 0);
  const parts: string[] = [];
  const bs = boxSize(p);
  if ((p.stripsPerBox || 1) > 1) {
    const b = Math.floor(rest / bs);
    if (b) parts.push(`${b} বক্স`);
    rest -= b * bs;
  }
  if ((p.piecesPerStrip || 1) > 1) {
    const s = Math.floor(rest / p.piecesPerStrip);
    if (s) parts.push(`${s} পাতা`);
    rest -= s * p.piecesPerStrip;
  }
  if (rest > 0 || parts.length === 0) parts.push(`${rest} ${pieceLabel(p)}`);
  return parts.join(' ');
}


// ---------- গ্যাজেট helpers ----------
export const GADGET = 'গ্যাজেট';
export type Kind = 'shop' | 'pharma' | 'gadget';
export const shopKind = (): Kind => {
  if (typeof window === 'undefined') return 'shop';
  const t = localStorage.getItem('ed_type');
  return t === 'ফার্মেসি' ? 'pharma' : t === GADGET ? 'gadget' : 'shop';
};
// লেখা থেকে IMEI/সিরিয়াল আলাদা করা: প্রতি লাইনে (বা কমা দিয়ে) একটি। ফাঁকা জায়গা বাদ, বড় হাতের অক্ষর, একই নম্বর একবারই।
export const parseSerials = (t: string) => [...new Set(t.split(/[\n,;]+/).map((s) => s.replace(/\s+/g, '').toUpperCase()).filter(Boolean))];
export const fullDate = (d: string) => new Date(d).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
// নাম না দিলে ব্র্যান্ড + মডেল (রং, ভ্যারিয়েন্ট) থেকে নাম — ব্যাকএন্ডের মতোই
export const gadgetName = (f: any) => {
  const base = [f.brand, f.model].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
  const extra = [f.color, f.variant].map((s) => String(s || '').trim()).filter(Boolean).join(', ');
  return [base, extra ? `(${extra})` : ''].filter(Boolean).join(' ');
};