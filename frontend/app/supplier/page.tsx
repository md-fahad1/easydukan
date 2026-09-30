'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

export default function Supplier() {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pay, setPay] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');

  const load = () => gql(`query{ suppliers{id name phone balance} }`).then((d) => setList(d.suppliers)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const add = async () => {
    setErr('');
    try { await gql(`mutation($n:String!,$p:String){ createSupplier(name:$n,phone:$p){ id } }`, { n: name, p: phone || null }); setName(''); setPhone(''); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const paySup = async (id: string) => {
    setErr('');
    try { await gql(`mutation($id:ID!,$a:Float!){ paySupplier(supplierId:$id,amount:$a){ id } }`, { id, a: Number(pay[id]) }); setPay({ ...pay, [id]: '' }); load(); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">মালদাতা — যাদের টাকা দিতে হবে</h1>
      <div className="card bg-rose-50 border-rose-200"><div className="text-gray-600">মোট দিতে হবে</div><div className="text-3xl font-bold text-rose-600">{taka(list.reduce((a, s) => a + s.balance, 0))}</div></div>
      <div className="card space-y-2">
        <input className="input" placeholder="মালদাতার নাম" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" inputMode="numeric" placeholder="মোবাইল (ঐচ্ছিক)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="btn-outline" onClick={add}>+ নতুন মালদাতা</button>
      </div>
      {err && <div className="text-rose-600">{err}</div>}
      {list.map((s) => (
        <div key={s.id} className="card space-y-2">
          <div className="flex justify-between"><div className="font-semibold text-lg">{s.name}</div><b className="text-rose-600">{taka(s.balance)}</b></div>
          {s.balance > 0 && (
            <div className="flex gap-2">
              <input className="input" inputMode="decimal" placeholder="কত টাকা দিলেন?" value={pay[s.id] || ''} onChange={(e) => setPay({ ...pay, [s.id]: e.target.value })} />
              <button className="rounded-xl bg-emerald-600 text-white px-4 whitespace-nowrap" onClick={() => paySup(s.id)}>টাকা পরিশোধ</button>
            </div>
          )}
        </div>
      ))}
    </AppShell>
  );
}
