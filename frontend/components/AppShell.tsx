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
  { href: '/sale', icon: '🛒', label: 'বিক্রি করুন' },
  { href: '/expense', icon: '💸', label: 'খরচ লিখুন' },
  { href: '/baki', icon: '📕', label: 'বাকি / টাকা নিন' },
  { href: '/purchase', icon: '📦', label: 'মাল কিনেছি' },
  { href: '/supplier', icon: '🚚', label: 'মালদাতা' },
  { href: '/manage', icon: '✏️', label: 'ভুল ঠিক করুন' },
  { href: '/returns', icon: '↩️', label: 'ফেরত নিন' },
  { href: '/closing', icon: '🔒', label: 'দিনের হিসাব শেষ' },
  { href: '/report', icon: '📊', label: 'রিপোর্ট' },
  { href: '/team', icon: '👥', label: 'কর্মচারী' },
];
const PHARMA_ADD = [
  { href: '/pharmacy/sell', icon: '💊', label: 'ওষুধ বিক্রি' },
  { href: '/pharmacy/purchase', icon: '📦', label: 'মাল কিনেছি' },
  { href: '/pharmacy/medicines', icon: '➕', label: 'নতুন ওষুধ' },
  { href: '/pharmacy/batches', icon: '🗂️', label: 'মেয়াদ দেখুন' },
  { href: '/expense', icon: '💸', label: 'খরচ লিখুন' },
  { href: '/baki', icon: '📕', label: 'বাকি / টাকা নিন' },
  { href: '/supplier', icon: '🚚', label: 'কোম্পানি' },
  { href: '/manage', icon: '✏️', label: 'ভুল ঠিক করুন' },
  { href: '/returns', icon: '↩️', label: 'ফেরত নিন' },
  { href: '/closing', icon: '🔒', label: 'দিনের হিসাব শেষ' },
  { href: '/report', icon: '📊', label: 'রিপোর্ট' },
  { href: '/team', icon: '👥', label: 'কর্মচারী' },
];

const TONES = [
  'bg-brand-50 text-brand-700',
  'bg-rose-50 text-rose-700',
  'bg-amber-50 text-amber-700',
  'bg-sky-50 text-sky-700',
  'bg-violet-50 text-violet-700',
  'bg-emerald-50 text-emerald-700',
];

function NavItem({ n, on }: { n: any; on: boolean }) {
  return (
    <Link
      href={n.href}
      className={`flex flex-col items-center gap-0.5 min-w-[58px] px-2 py-1.5 rounded-full text-[11px] transition-all duration-200 ${
        on ? 'bg-white/15 text-white font-bold' : 'text-slate-400'
      }`}
    >
      <span className={`text-xl transition-all duration-200 ${on ? 'scale-110' : 'opacity-70'}`}>{n.icon}</span>
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

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-canvas">
        <div className="text-6xl animate-float">🏪</div>
        <div className="w-8 h-8 rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" />
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
    <div className="max-w-md mx-auto min-h-screen pb-36 relative">
      {/* উপরের হেডার */}
      <header className="sticky top-0 z-10 bg-canvas/90 backdrop-blur px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow flex items-center justify-center text-lg font-bold">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500">{pharma ? 'ফার্মেসি ম্যানেজার' : 'ইজিদোকান'}</div>
              <div className="font-bold text-lg leading-tight truncate text-slate-800">{shop || 'ইজিদোকান'}</div>
            </div>
          </div>
          <button onClick={logout} className="shrink-0 bg-white shadow-soft active:scale-95 transition rounded-full px-4 py-2 text-sm font-medium text-slate-600">
            বের হন
          </button>
        </div>
      </header>

      <main className="px-4 pt-2 pb-4 space-y-4 stagger">{children}</main>

      {/* + মেনু */}
      {open && (
        <div className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div className="absolute bottom-28 inset-x-0 px-3">
            <div
              className="max-w-md mx-auto bg-white rounded-[32px] p-5 shadow-2xl max-h-[70vh] overflow-y-auto animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-200 mx-auto mb-4" />
              <div className="font-bold text-lg mb-3">কী করতে চান?</div>
              <div className="grid grid-cols-3 gap-3">
                {menuItems.map((a, i) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    onClick={() => setOpen(false)}
                    style={{ animationDelay: `${i * 35}ms` }}
                    className={`animate-pop flex flex-col items-center justify-center text-center gap-1.5 rounded-3xl p-3 min-h-[96px] text-[13px] font-semibold leading-tight transition-all active:scale-95 ${TONES[i % TONES.length]}`}
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

      {/* ভাসমান নেভিগেশন */}
      <div className="fixed bottom-4 left-0 right-0 z-30 px-4 pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <nav className="pointer-events-auto max-w-md mx-auto bg-ink rounded-full shadow-2xl flex items-center justify-around px-2 py-2">
          {left.map((n) => <NavItem key={n.href} n={n} on={active(n.href)} />)}
          <button
            onClick={() => setOpen(!open)}
            aria-label="যোগ করুন"
            className={`-mt-9 w-16 h-16 rounded-full text-white text-4xl leading-none flex items-center justify-center border-4 border-canvas transition-all duration-300 active:scale-90 ${
              open ? 'rotate-45 bg-rose-500 shadow-glow-red' : 'bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow animate-ring'
            }`}
          >
            +
          </button>
          {right.map((n) => <NavItem key={n.href} n={n} on={active(n.href)} />)}
        </nav>
      </div>
    </div>
  );
}