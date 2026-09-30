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

// নিচের + মেনুর টাইলগুলোর রং (একটার পর একটা ঘুরে ঘুরে)
const TONES = [
  'bg-emerald-50 text-emerald-700',
  'bg-rose-50 text-rose-700',
  'bg-amber-50 text-amber-700',
  'bg-sky-50 text-sky-700',
  'bg-violet-50 text-violet-700',
  'bg-teal-50 text-teal-700',
];

// নিচের নেভিগেশনের একটা আইটেম (বাইরে রাখা হয়েছে যাতে বারবার রিসেট না হয়)
function NavItem({ n, on }: { n: any; on: boolean }) {
  return (
    <Link
      href={n.href}
      className={`flex flex-col items-center gap-0.5 min-w-[64px] px-3 py-1.5 rounded-2xl text-xs transition-all duration-200 ${
        on ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <span className={`text-2xl transition-all duration-200 ${on ? 'scale-110' : 'grayscale opacity-60'}`}>{n.icon}</span>
      {n.label}
    </Link>
  );
}

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

  // লোডিং স্ক্রিন
  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-6xl animate-float">🏪</div>
        <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        <div className="text-slate-400 text-sm">লোড হচ্ছে...</div>
      </div>
    );
  }

  const employee = role === 'EMPLOYEE';
  const nav = pharma ? PHARMA_NAV : NAV;
  const add = pharma ? PHARMA_ADD : ADD;
  const homeHref = pharma ? '/pharmacy/sell' : '/sale';
  const active = (h: string) => (h === '/' || h === '/pharmacy' ? path === h : path.startsWith(h));
  const left = employee ? nav.filter((n) => n.href === homeHref) : nav.slice(0, 2);
  const right = employee ? [] : nav.slice(2);
  const menuItems = add.filter((a) => !employee || a.href === homeHref);
  const initial = (shop || 'ই').trim().charAt(0);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-32 relative">
      {/* উপরের হেডার */}
      <header className="sticky top-0 z-10 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-600 text-white px-4 pt-3 pb-4 rounded-b-3xl shadow-glow">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-emerald-100">{pharma ? 'ফার্মেসি ম্যানেজার' : 'ইজিদোকান'}</div>
              <div className="font-bold text-lg leading-tight truncate">{shop || 'ইজিদোকান'}</div>
            </div>
          </div>
          <button onClick={logout} className="shrink-0 bg-white/15 hover:bg-white/25 active:scale-95 transition rounded-full px-4 py-2 text-sm font-medium">
            লগ আউট
          </button>
        </div>
      </header>

      {/* পেজের কন্টেন্ট (stagger = একটার পর একটা ভেসে ওঠে) */}
      <main className="px-4 pt-5 pb-4 space-y-4 stagger">{children}</main>

      {/* + মেনু */}
      {open && (
        <div className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div className="absolute bottom-24 inset-x-0 px-3">
            <div
              className="max-w-md mx-auto bg-white rounded-3xl p-5 shadow-2xl max-h-[70vh] overflow-y-auto animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-200 mx-auto mb-4" />
              <div className="font-bold text-lg mb-3">কি যোগ করবেন?</div>
              <div className="grid grid-cols-3 gap-3">
                {menuItems.map((a, i) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    onClick={() => setOpen(false)}
                    style={{ animationDelay: `${i * 35}ms` }}
                    className={`animate-pop flex flex-col items-center justify-center text-center gap-1.5 rounded-2xl p-3 min-h-[92px] text-[13px] font-semibold leading-tight transition-all active:scale-95 hover:shadow-md ${TONES[i % TONES.length]}`}
                  >
                    <span className="text-3xl">{a.icon}</span>
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* নিচের নেভিগেশন */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-slate-100 rounded-t-3xl shadow-[0_-8px_30px_-12px_rgba(15,23,42,.18)] flex items-end justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {left.map((n) => <NavItem key={n.href} n={n} on={active(n.href)} />)}
        <button
          onClick={() => setOpen(!open)}
          aria-label="যোগ করুন"
          className={`-mt-8 w-16 h-16 rounded-full text-white text-4xl leading-none flex items-center justify-center transition-all duration-300 active:scale-90 ${
            open
              ? 'rotate-45 bg-gradient-to-br from-rose-500 to-rose-600 shadow-glow-red'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-glow animate-ring'
          }`}
        >
          +
        </button>
        {right.map((n) => <NavItem key={n.href} n={n} on={active(n.href)} />)}
      </nav>
    </div>
  );
}