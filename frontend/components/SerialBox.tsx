'use client';
import { useState } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';
import { parseSerials } from '@/lib/api';

// IMEI / সিরিয়াল নম্বর লেখার ঘর: প্রতি লাইনে একটি। 📷 চাপলে ক্যামেরায় বারকোড স্ক্যান করে যোগ হবে।
export default function SerialBox({ value, onChange, label = 'IMEI / সিরিয়াল (প্রতি লাইনে একটি)' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [scan, setScan] = useState(false);
  const n = parseSerials(value).length;
  const raw = value.split(/[\n,;]+/).map((s) => s.replace(/\s+/g, '')).filter(Boolean).length;
  return (
    <div className="space-y-1">
      {scan && <BarcodeScanner onScan={(c) => { setScan(false); onChange((value.trim() ? value.trim() + '\n' : '') + c); }} onClose={() => setScan(false)} />}
      <div className="flex justify-between items-end">
        <label className="label !mb-0">{label}</label>
        <span className="text-sm font-semibold text-emerald-700">{n}টি</span>
      </div>
      <div className="flex gap-2 items-start">
        <textarea className="input font-mono !text-base" rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={'356000111111\n356000112222'} />
        <button type="button" className="rounded-xl bg-emerald-600 text-white px-4 py-3 text-xl" onClick={() => setScan(true)}>📷</button>
      </div>
      {raw > n && <div className="text-amber-600 text-sm">⚠️ {raw - n}টি নম্বর দুইবার আছে</div>}
    </div>
  );
}