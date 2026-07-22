'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/use-auth';
import { Star } from 'lucide-react';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setSubs([]); setLoading(false); return; }
    supabase.from('subscriptions').select('*, creator:creators!subscriptions_creator_id_fkey(*)').eq('user_id', user.id).eq('active', true)
      .then(({ data, error }) => {
        if (data && data.length > 0) {
          setSubs(data);
        } else {
          // Fallback: show top creators as recommendation
          supabase.from('creators').select('*').order('subscriber_count', { ascending: false }).limit(3)
            .then(({ data: c }) => { setSubs((c || []).map(x => ({ creator: x }))); });
        }
        setLoading(false);
      });
  }, [user]);

  return (
    <div>
      <div className="sticky top-0 z-30 top-sticky border-b border-white/10 px-4 py-3">
        <h1 className="text-xl font-bold">我的订阅</h1>
      </div>
      {loading ? (
        <div className="p-8 text-center text-white/40">加载中...</div>
      ) : subs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <Star className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">{user ? '还没有订阅任何创作者' : '登录后查看订阅'}</p>
          {!user && <a href="/login" className="mt-4 px-6 py-2 rounded-full bg-[#f472b6] text-white text-sm font-bold">去登录</a>}
          {user && <Link href="/explore" className="mt-3 text-[#f472b6] text-sm hover:underline">去发现创作者</Link>}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {subs.map((s: any) => {
            const c = s.creator;
            return (
              <Link key={c.username} href={`/creator/${c.username}`} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xl shrink-0 bg-black">
                  {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" alt="" /> :
                    <span className="w-full h-full flex items-center justify-center bg-zinc-800">{c.display_name[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1"><p className="font-bold text-[15px]">{c.display_name}</p>{c.verified && <span className="text-[#f472b6] text-sm">✓</span>}</div>
                  <p className="text-[13px] text-white/50">@{c.username} · {c.subscriber_count?.toLocaleString()} 订阅</p>
                </div>
                <div className="text-right"><p className="text-[15px] font-bold text-[#f472b6]">${c.subscription_price}/月</p></div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
