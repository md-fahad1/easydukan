'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

export default function Supplier() {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amt, setAmt] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');

  const load = () => gql(`query{ suppliers{id name phone balance} }`).then((d) => setList(d.suppliers)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const add = async () => {
    setErr('');
    try { await gql(`mutation($n:String!,$p:String){ createSupplier(name:$n,phone:$p){ id } }`, { n: name, p: phone || null }); setName(''); setPhone(''); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const pay = async (id: string) => {
    setErr('');
    try { await gql(`mutation($id:ID!,$a:Float!){ paySupplier(supplierId:$id,amount:$a){ id } }`, { id, a: Number(amt[id]) }); setAmt({ ...amt, [id]: '' }); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const lend = async (id: string) => {
    setErr('');
    try { await gql(`mutation($id:ID!,$a:Float!){ lendToSupplier(supplierId:$id,amount:$a){ id } }`, { id, a: Number(amt[id]) }); setAmt({ ...amt, [id]: '' }); load(); }
    catch (e: any) { setErr(e.message); }
  };

  const net = list.reduce((a, s) => a + s.balance, 0);

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">কোম্পানি / মালদাতা</h1>
      <div className={`card ${net >= 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
        <div className="text-gray-600">{net >= 0 ? 'মোট দিতে হবে' : 'মোট আপনি পাবেন'}</div>
        <div className={`text-3xl font-bold ${net >= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{taka(Math.abs(net))}</div>
      </div>
      <div className="card space-y-2">
        <input className="input" placeholder="কোম্পানির নাম" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" inputMode="numeric" placeholder="মোবাইল (ঐচ্ছিক)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="btn-outline" onClick={add}>+ নতুন কোম্পানি</button>
      </div>
      {err && <div className="text-rose-600">{err}</div>}
      {list.map((s) => (
        <div key={s.id} className="card space-y-2">
          <div className="flex justify-between">
            <div className="font-semibold text-lg">{s.name}</div>
            <div className="text-right">
              <div className={`font-bold ${s.balance > 0 ? 'text-rose-600' : s.balance < 0 ? 'text-emerald-700' : 'text-gray-400'}`}>{taka(Math.abs(s.balance))}</div>
              <div className="text-xs text-gray-500">{s.balance > 0 ? 'আপনি দেবেন' : s.balance < 0 ? 'আপনি পাবেন' : 'হিসাব শেষ'}</div>
            </div>
          </div>
          <input className="input" inputMode="decimal" placeholder="টাকার পরিমাণ" value={amt[s.id] || ''} onChange={(e) => setAmt({ ...amt, [s.id]: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <button className="rounded-xl bg-emerald-600 text-white py-3" onClick={() => pay(s.id)}>টাকা পরিশোধ</button>
            <button className="rounded-xl border-2 border-emerald-600 text-emerald-700 py-3" onClick={() => lend(s.id)}>ধার দিন</button>
          </div>
        </div>
      ))}
    </AppShell>
  );
}