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
    if (!name.trim()) return setErr('কোম্পানির নাম লিখুন');
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
      <div className={`relative overflow-hidden rounded-[32px] text-white p-5 shadow-lg bg-gradient-to-br ${owe ? 'from-rose-500 to-rose-600' : 'from-brand-400 to-brand-600'}`}>
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/15" />
        <div className="relative">
          <div className="text-white/80 text-sm">{owe ? 'আপনাকে মোট দিতে হবে' : 'আপনি মোট পাবেন'}</div>
          <div className="text-4xl font-bold mt-1">{taka(Math.abs(net))}</div>
        </div>
      </div>

      <button className="btn-dark" onClick={() => setShow(!show)}>{show ? '✕ বন্ধ করুন' : '+ নতুন কোম্পানি যোগ করুন'}</button>
      {show && (
        <div className="card animate-fade-up space-y-3">
          <input className="input" placeholder="কোম্পানির নাম" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" inputMode="numeric" placeholder="মোবাইল নম্বর (না দিলেও চলবে)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn" onClick={add}>সেভ করুন</button>
        </div>
      )}
      {err && <div className="animate-pop rounded-2xl bg-rose-50 text-rose-700 px-4 py-3 text-center">⚠️ {err}</div>}

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
                <div className={`font-bold text-lg ${s.balance > 0 ? 'text-rose-600' : s.balance < 0 ? 'text-brand-700' : 'text-slate-400'}`}>{taka(Math.abs(s.balance))}</div>
                <div className="text-xs text-slate-500">{s.balance > 0 ? 'আপনি দেবেন' : s.balance < 0 ? 'আপনি পাবেন' : 'হিসাব শেষ'}</div>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-brand-600">৳</span>
              <input className="input !pl-10" inputMode="decimal" placeholder="কত টাকা?" value={amt[s.id] || ''} onChange={(e) => setAmt({ ...amt, [s.id]: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold py-3 shadow-glow transition active:scale-95 disabled:opacity-50" disabled={!amt[s.id]} onClick={() => pay(s.id)}>টাকা দিলাম</button>
              <button className="rounded-full border-2 border-brand-500 text-brand-700 font-semibold py-3 bg-white transition active:scale-95 disabled:opacity-50" disabled={!amt[s.id]} onClick={() => lend(s.id)}>ধার দিলাম</button>
            </div>
          </div>
        ))}
        {loaded && list.length === 0 && <div className="text-slate-400 text-center py-6"><div className="text-4xl mb-1">🏭</div>এখনো কোনো কোম্পানি নেই। উপরের বোতামে চাপ দিয়ে যোগ করুন।</div>}
      </div>
    </AppShell>
  );
}