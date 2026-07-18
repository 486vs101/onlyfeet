'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SubscriptionsPage() {
  const [creators, setCreators] = useState<any[]>([]);

  useEffect(() => {
    // In a real app, this would query subscriptions table joined with creators
    // For now, show a few creators as "subscribed"
    supabase.from('creators').select('*').order('subscriber_count', { ascending: false }).limit(3)
      .then(({ data }) => { if (data) setCreators(data); });
  }, []);

  return (
    <div>
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <h1 className="text-xl font-bold">我的订阅</h1>
        <p className="text-[13px] text-white/50">你订阅的创作者</p>
      </div>
      <div className="p-4 space-y-3">
        {creators.map((c: any) => (
          <Link key={c.username} href={`/creator/${c.username}`} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0" style={{ background: c.avatar_color }}>{c.display_name[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-bold text-[15px]">{c.display_name}</p>
                {c.verified && <span className="text-[#f472b6] text-sm">✓</span>}
              </div>
              <p className="text-[13px] text-white/50">@{c.username}</p>
              <p className="text-[13px] text-white/50 mt-0.5">{c.subscriber_count?.toLocaleString()} 订阅 · {c.post_count + c.short_count} 条内容</p>
            </div>
            <div className="text-right">
              <p className="text-[15px] font-bold text-[#f472b6]">${c.subscription_price}/月</p>
              <button className="mt-1 text-[13px] text-white/50 hover:text-white">管理</button>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
