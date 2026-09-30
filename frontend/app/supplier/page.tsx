'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { gql, taka } from '@/lib/api';

export default function Supplier() {
  const [list, setList] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [show, setShow] = useState(false);
  const [amt, setAmt] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');

  const load = () => gql(`query{ suppliers{id name phone balance} }`).then((d) => setList(d.suppliers)).catch((e) => setErr(e.message)).finally(() => setLoaded(true));
  useEffect(() => { load(); }, []);

  const add = async () => {
    setErr('');
    try { await gql(`mutation($n:String!,$p:String){ createSupplier(name:$n,phone:$p){ id } }`, { n: name, p: phone || null }); setName(''); setPhone(''); setShow(false); load(); }
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
  const owe = net >= 0;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold text-slate-800">🚚 কোম্পানি / মালদাতা</h1>

      {/* মোট দেনা / পাওনা */}
      <div className={`relative overflow-hidden rounded-3xl text-white p-5 shadow-lg bg-gradient-to-br ${owe ? 'from-rose-500 to-rose-600' : 'from-emerald-500 to-teal-600'}`}>
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/15" />
        <div className="relative">
          <div className="text-white/80 text-sm">{owe ? 'মোট দিতে হবে' : 'মোট আপনি পাবেন'}</div>
          <div className="text-4xl font-bold mt-1">{taka(Math.abs(net))}</div>
        </div>
      </div>

      <button className="btn-outline" onClick={() => setShow(!show)}>{show ? '✕ বন্ধ করুন' : '+ নতুন কোম্পানি'}</button>
      {show && (
        <div className="card animate-fade-up space-y-3">
          <input className="input" placeholder="কোম্পানির নাম" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" inputMode="numeric" placeholder="মোবাইল (ঐচ্ছিক)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn" onClick={add}>সেভ করুন</button>
        </div>
      )}
      {err && <div className="animate-pop rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

      <div className="space-y-3 stagger">
        {!loaded && [0, 1, 2].map((i) => <div key={i} className="skeleton h-40" />)}
        {list.map((s) => (
          <div key={s.id} className="card space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-sky-50 flex items-center justify-center text-2xl">🏭</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg text-slate-800 truncate">{s.name}</div>
                {s.phone && <div className="text-sm text-slate-500">{s.phone}</div>}
              </div>
              <div className="text-right">
                <div className={`font-bold text-lg ${s.balance > 0 ? 'text-rose-600' : s.balance < 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{taka(Math.abs(s.balance))}</div>
                <div className="text-xs text-slate-500">{s.balance > 0 ? 'আপনি দেবেন' : s.balance < 0 ? 'আপনি পাবেন' : 'হিসাব শেষ'}</div>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-emerald-600">৳</span>
              <input className="input !pl-10" inputMode="decimal" placeholder="টাকার পরিমাণ" value={amt[s.id] || ''} onChange={(e) => setAmt({ ...amt, [s.id]: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold py-3 shadow-glow transition active:scale-95 disabled:opacity-50" disabled={!amt[s.id]} onClick={() => pay(s.id)}>টাকা পরিশোধ</button>
              <button className="rounded-2xl border-2 border-emerald-500 text-emerald-700 font-semibold py-3 bg-white transition active:scale-95 disabled:opacity-50" disabled={!amt[s.id]} onClick={() => lend(s.id)}>ধার দিন</button>
            </div>
          </div>
        ))}
        {loaded && list.length === 0 && <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">🏭</div>এখনো কোনো কোম্পানি নেই</div>}
      </div>
    </AppShell>
  );
}