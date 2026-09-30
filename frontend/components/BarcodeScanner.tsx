'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let controls: any;
    let stopped = false;
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, (result, _e, c) => {
        if (result && !stopped) {
          stopped = true;
          c.stop();
          onScan(result.getText());
        }
      })
      .then((c) => {
        controls = c;
        if (stopped) c.stop();
      })
      .catch(() => setErr('ক্যামেরা চালু করা যায়নি। ক্যামেরার পারমিশন দিন (HTTPS বা localhost লাগবে)।'));
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 gap-4">
      <div className="text-white text-lg">বারকোডের সামনে ক্যামেরা ধরুন</div>
      <video ref={video} className="w-full max-w-md rounded-2xl bg-black" muted playsInline />
      {err && <div className="text-rose-300 text-center">{err}</div>}
      <button className="btn-outline !w-auto px-8" onClick={onClose}>বন্ধ করুন</button>
    </div>
  );
}