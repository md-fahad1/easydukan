'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/lib/api';

const NAV = [
  { href: '/', icon: '🏠', label: 'হোম' },
  { href: '/sale', icon: '💰', label: 'বিক্রি' },
  { href: '/baki', icon: '📕', label: 'বাকি' },
  { href: '/mal', icon: '📦', label: 'মাল' },
];
const PHARMA_NAV = [
  { href: '/pharmacy', icon: '🏠', label: 'হোম' },
  { href: '/pharmacy/sell', icon: '💊', label: 'বিক্রি' },
  { href: '/baki', icon: '📕', label: 'বাকি' },
  { href: '/pharmacy/medicines', icon: '📦', label: 'ওষুধ' },
];

const ADD = [
  { href: '/sale', icon: '🛒', label: 'বিক্রি' },
  { href: '/expense', icon: '💸', label: 'খরচ' },
  { href: '/baki', icon: '📕', label: 'বাকি / টাকা গ্রহণ' },
  { href: '/purchase', icon: '📦', label: 'মাল কেনা' },
  { href: '/supplier', icon: '🚚', label: 'মালদাতা' },
  { href: '/manage', icon: '✏️', label: 'সংশোধন / মুছুন' },
  { href: '/returns', icon: '↩️', label: 'বিক্রি ফেরত' },
  { href: '/closing', icon: '🔒', label: 'হিসাব বন্ধ' },
  { href: '/report', icon: '📊', label: 'রিপোর্ট' },
  { href: '/team', icon: '👥', label: 'কর্মচারী' },
];
const PHARMA_ADD = [
  { href: '/pharmacy/sell', icon: '💊', label: 'ওষুধ বিক্রি' },
  { href: '/pharmacy/purchase', icon: '📦', label: 'মাল কেনা' },
  { href: '/pharmacy/medicines', icon: '➕', label: 'ওষুধ / নতুন ওষুধ' },
  { href: '/pharmacy/batches', icon: '🗂️', label: 'ব্যাচ / মেয়াদ' },
  { href: '/expense', icon: '💸', label: 'খরচ' },
  { href: '/baki', icon: '📕', label: 'বাকি / টাকা গ্রহণ' },
  { href: '/supplier', icon: '🚚', label: 'কোম্পানি' },
  { href: '/manage', icon: '✏️', label: 'সংশোধন / মুছুন' },
  { href: '/returns', icon: '↩️', label: 'বিক্রি ফেরত' },
  { href: '/closing', icon: '🔒', label: 'হিসাব বন্ধ' },
  { href: '/report', icon: '📊', label: 'রিপোর্ট' },
  { href: '/team', icon: '👥', label: 'কর্মচারী' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('OWNER');
  const [shop, setShop] = useState('');
  const [pharma, setPharma] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('ed_token')) { router.replace('/login'); return; }
    const u = JSON.parse(localStorage.getItem('ed_user') || '{}');
    const isPharma = localStorage.getItem('ed_type') === 'ফার্মেসি';
    setRole(u.role || 'OWNER');
    setShop(localStorage.getItem('ed_shop') || '');
    setPharma(isPharma);
    const home = isPharma ? '/pharmacy/sell' : '/sale';
    if (u.role === 'EMPLOYEE' && path !== home) { router.replace(home); return; }
    if (u.role !== 'EMPLOYEE' && isPharma && path === '/') { router.replace('/pharmacy'); return; }
    setReady(true);
    setOpen(false);
  }, [path]);

  if (!ready) return <div className="p-8 text-center text-gray-400">লোড হচ্ছে...</div>;
  const employee = role === 'EMPLOYEE';
  const nav = pharma ? PHARMA_NAV : NAV;
  const add = pharma ? PHARMA_ADD : ADD;
  const homeHref = pharma ? '/pharmacy/sell' : '/sale';
  const active = (h: string) => (h === '/' || h === '/pharmacy' ? path === h : path.startsWith(h));
  const left = employee ? nav.filter((n) => n.href === homeHref) : nav.slice(0, 2);
  const right = employee ? [] : nav.slice(2);

  const Item = ({ n }: { n: any }) => (
    <Link href={n.href} className={`flex flex-col items-center text-sm px-3 py-1 ${active(n.href) ? 'text-emerald-600 font-bold' : 'text-gray-500'}`}>
      <span className="text-2xl">{n.icon}</span>{n.label}
    </Link>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen pb-28 relative">
      <header className="sticky top-0 z-10 bg-emerald-600 text-white px-4 py-3 flex justify-between items-center">
        <div className="font-bold text-lg">{shop || 'ইজিদোকান'}</div>
        <button onClick={logout} className="text-sm opacity-90 underline">লগ আউট</button>
      </header>
      <main className="p-4 space-y-4">{children}</main>

      {open && (
        <div className="fixed inset-0 z-20 bg-black/40" onClick={() => setOpen(false)}>
          <div className="absolute bottom-20 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl p-5 max-h-[75vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold mb-3">কি যোগ করবেন?</div>
            <div className="grid grid-cols-2 gap-3">
              {add.filter((a) => !employee || a.href === homeHref).map((a) => (
                <Link key={a.href} href={a.href} className="card text-center py-4 text-lg">
                  <div className="text-3xl">{a.icon}</div>{a.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto bg-white border-t flex items-end justify-around px-2 pt-1 pb-2">
        {left.map((n) => <Item key={n.href} n={n} />)}
        <button onClick={() => setOpen(!open)} className="-mt-6 w-16 h-16 rounded-full bg-emerald-600 text-white text-4xl shadow-lg active:scale-95">+</button>
        {right.map((n) => <Item key={n.href} n={n} />)}
      </nav>
    </div>
  );
}