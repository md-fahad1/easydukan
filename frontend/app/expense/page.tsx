'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka, timeOf } from '@/lib/api';

const CATS = ['দোকান ভাড়া', 'বিদ্যুৎ', 'কর্মচারী', 'পরিবহন', 'মাল কেনা', 'অন্যান্য'];

export default function Expense() {
  const [cat, setCat] = useState(CATS[0]);
  const [custom, setCustom] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => gql(`query{ expenses(period:TODAY){id category amount note createdAt} }`).then((d) => setList(d.expenses)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    setErr('');
    const a = Number(amount);
    if (!(a > 0)) return setErr('টাকার পরিমাণ দিন');
    setBusy(true);
    try {
      await gql(`mutation($c:String!,$a:Float!,$n:String){ createExpense(category:$c,amount:$a,note:$n){ id } }`,
        { c: cat === 'অন্যান্য' && custom.trim() ? custom.trim() : cat, a, n: note || null });
      setAmount(''); setNote(''); setCustom('');
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">আজকের খরচ</h1>
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={`chip ${cat === c ? 'chip-on' : ''}`}>{c}</button>)}
      </div>
      {cat === 'অন্যান্য' && <input className="input" placeholder="খরচের নাম (ঐচ্ছিক)" value={custom} onChange={(e) => setCustom(e.target.value)} />}
      <div><label className="label">টাকা</label><input className="input text-3xl font-bold" inputMode="decimal" placeholder="500" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <input className="input" placeholder="নোট (ঐচ্ছিক)" value={note} onChange={(e) => setNote(e.target.value)} />
      {err && <div className="text-rose-600">{err}</div>}
      <button className="btn-red" disabled={busy} onClick={submit}>খরচ যোগ করুন</button>
      <div className="space-y-2 pt-2">
        {list.map((e) => (
          <div key={e.id} className="card flex justify-between"><div><div className="font-medium">{e.category}</div><div className="text-sm text-gray-500">{e.note} {timeOf(e.createdAt)}</div></div><b className="text-rose-600">{taka(e.amount)}</b></div>
        ))}
        {list.length === 0 && <div className="text-gray-400 text-center">আজ এখনো কোনো খরচ নেই</div>}
      </div>
    </AppShell>
  );
}
