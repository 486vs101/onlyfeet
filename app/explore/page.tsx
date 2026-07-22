'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Search, Sparkles } from 'lucide-react';

type Creator = {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  cover_color: string;
  bio: string;
  subscription_price: number;
  verified: boolean;
  subscriber_count: number;
};

export default function ExplorePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase.from('creators').select('*')
      .order('subscriber_count', { ascending: false })
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        // 联查 profiles 拿真实头像/封面
        const ownerIds = data.map(c => c.owner_id).filter(Boolean);
        let profiles: Record<string, any> = {};
        if (ownerIds.length > 0) {
          const { data: p } = await supabase.from('profiles').select('id, avatar_url, cover_url').in('id', ownerIds);
          (p || []).forEach(x => { profiles[x.id] = x; });
        }
        const enriched = data.map(c => ({
          ...c,
          avatar_url: profiles[c.owner_id]?.avatar_url || null,
          cover_url: profiles[c.owner_id]?.cover_url || null,
        }));
        setCreators(enriched);
        setLoading(false);
      });
  }, []);

  const matched = query.trim()
    ? creators.filter(c =>
        c.display_name.toLowerCase().includes(query.toLowerCase()) ||
        c.username.toLowerCase().includes(query.toLowerCase())
      )
    : creators;

  return (
    <div className="sticky top-0 z-30 top-sticky border-b border-white/10 backdrop-blur-md px-4 pt-3 pb-3">
      <h1 className="text-xl font-bold tracking-tight">
        only<span className="logo-gradient">feet</span>
      </h1>
      <p className="text-white/50 text-[13px]">探索创作者</p>
      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索创作者"
          className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-[#f472b6] focus:bg-black/40" />
      </div>
      <div className="p-4">
        {loading ? <div className="text-center text-white/40 py-20">加载中...</div> :
         matched.length === 0 ? <div className="text-center text-white/40 py-20">没找到匹配的创作者</div> :
         <div className="flex items-center gap-2 mb-3">
           <Sparkles className="w-4 h-4 text-white/60" />
           <span className="text-white/60 text-sm font-medium">创作者 · {matched.length}</span>
         </div>}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {matched.map(c => (
            <Link key={c.id} href={`/creator/${c.username}`}
              className="x-card overflow-hidden group hover:bg-white/[0.02] transition-colors">
              <div className="h-20 relative bg-black">
                {c.cover_url ? <img src={c.cover_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-black" />}
                <div className="absolute -bottom-5 left-3 w-12 h-12 rounded-full border-2 border-black flex items-center justify-center text-white font-bold text-base bg-zinc-800 overflow-hidden">
                  {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" alt="" /> : c.display_name[0]}
                </div>
              </div>
              <div className="pt-7 pb-3 px-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <p className="text-[15px] font-bold truncate">{c.display_name}</p>
                  {c.verified && <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#f472b6] text-[9px] font-bold text-white shrink-0">✓</span>}
                </div>
                <p className="text-[13px] text-white/50 truncate">@{c.username}</p>
                <p className="text-[13px] text-white/60 mt-1 line-clamp-2 h-9">{c.bio}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                  <span className="text-[12px] text-white/50">{(c.subscriber_count / 1000).toFixed(1)}K 订阅</span>
                  <span className="text-[12px] font-bold text-[#f472b6]">${c.subscription_price}/月</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
