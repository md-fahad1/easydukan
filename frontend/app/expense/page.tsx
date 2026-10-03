'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka, timeOf } from '@/lib/api';

const CATS = ['দোকান ভাড়া', 'বিদ্যুৎ', 'কর্মচারী', 'পরিবহন', 'মাল কেনা', 'অন্যান্য'];
const ICON: Record<string, string> = { 'দোকান ভাড়া': '🏠', 'বিদ্যুৎ': '💡', 'কর্মচারী': '👷', 'পরিবহন': '🚚', 'মাল কেনা': '📦', 'অন্যান্য': '🧾' };

export default function Expense() {
  const [cat, setCat] = useState(CATS[0]);
  const [custom, setCustom] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => gql(`query{ expenses(period:TODAY){id category amount note createdAt} }`).then((d) => setList(d.expenses)).catch((e) => setErr(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  const submit = async () => {
    setErr(''); setMsg('');
    const a = Number(amount);
    if (!(a > 0)) return setErr('কত টাকা খরচ হয়েছে লিখুন');
    setBusy(true);
    try {
      await gql(`mutation($c:String!,$a:Float!,$n:String){ createExpense(category:$c,amount:$a,note:$n){ id } }`,
        { c: cat === 'অন্যান্য' && custom.trim() ? custom.trim() : cat, a, n: note || null });
      setMsg(`খরচ লেখা হয়েছে ✅ ${taka(a)}`);
      setAmount(''); setNote(''); setCustom('');
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const total = list.reduce((a, e) => a + (e.amount || 0), 0);

  return (
    <AppShell>
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold text-slate-800">খরচ লিখুন</h1>
        {list.length > 0 && <span className="badge bg-rose-100 text-rose-600">আজ মোট {taka(total)}</span>}
      </div>

      {msg && <div className="animate-pop rounded-2xl bg-brand-50 text-brand-700 font-semibold px-4 py-3 text-center">{msg}</div>}

      <div>
        <label className="label">কিসের খরচ?</label>
        <div className="grid grid-cols-3 gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-2xl py-3 px-1 flex flex-col items-center gap-1 text-[13px] font-semibold transition active:scale-95 ${cat === c ? 'bg-ink text-white' : 'bg-white text-slate-600 shadow-soft'}`}
            >
              <span className="text-2xl">{ICON[c]}</span>{c}
            </button>
          ))}
        </div>
      </div>
      {cat === 'অন্যান্য' && <input className="input animate-fade-up" placeholder="খরচের নাম (না লিখলেও চলবে)" value={custom} onChange={(e) => setCustom(e.target.value)} />}

      <div className="card space-y-3">
        <label className="label">কত টাকা?</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-rose-500">৳</span>
          <input className="input !pl-11 text-3xl font-bold" inputMode="decimal" placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <input className="input" placeholder="কিছু লিখে রাখতে চাইলে (ঐচ্ছিক)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}
      <button className="btn-red" disabled={busy} onClick={submit}>
        {busy ? <span className="inline-block w-6 h-6 align-middle rounded-full border-4 border-white/40 border-t-white animate-spin" /> : '✔ খরচ লিখে রাখুন'}
      </button>

      <h2 className="font-bold text-slate-700 pt-2">আজকের খরচের তালিকা</h2>
      <div className="space-y-2 stagger">
        {!loaded && [0, 1].map((i) => <div key={i} className="skeleton h-16" />)}
        {list.map((e) => (
          <div key={e.id} className="card flex items-center gap-3 !p-3">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-rose-50 flex items-center justify-center text-lg">{ICON[e.category] || '🧾'}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800">{e.category}</div>
              <div className="text-sm text-slate-500 truncate">{e.note} {timeOf(e.createdAt)}</div>
            </div>
            <b className="text-rose-600">{taka(e.amount)}</b>
          </div>
        ))}
        {loaded && list.length === 0 && <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">💸</div>আজ এখনো কোনো খরচ লেখা হয়নি</div>}
      </div>
    </AppShell>
  );
}