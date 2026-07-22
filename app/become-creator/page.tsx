'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BecomeCreatorPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/profile'); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white/40 text-sm">
      跳转中...
    </div>
  );
}
