'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Creator = {
  id: string; username: string; display_name: string;
  avatar_color: string; verified: boolean; subscription_price: number;
  subscriber_count: number;
};

export function RightPanel() {
  const [query, setQuery] = useState('');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [trending, setTrending] = useState<{ tag: string; posts: string }[]>([]);

  useEffect(() => {
    supabase.from('creators').select('*').order('subscriber_count', { ascending: false }).limit(4)
      .then(({ data }) => { if (data) setCreators(data); });

    // Aggregate hashtags from real posts/shorts
    supabase.from('shorts').select('hashtags')
      .then(({ data: shortsData }) => {
        if (!shortsData) return;
        const counts: Record<string, number> = {};
        shortsData.forEach((row: any) => {
          (row.hashtags || []).forEach((tag: string) => {
            counts[tag] = (counts[tag] || 0) + 1;
          });
        });
        const sorted = Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([tag, count]) => ({ tag, posts: count >= 1000 ? (count/1000).toFixed(1) + 'K' : String(count) }));
        setTrending(sorted);
      });
  }, []);

  return (
    <aside className="hidden lg:flex flex-col w-[350px] shrink-0 h-screen sticky top-0 px-6 py-2 gap-4 overflow-y-auto no-scrollbar">
      <div className="relative mt-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索创作者"
          className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:border-[#f472b6] focus:bg-black"
        />
      </div>

      <div className="x-card rounded-2xl overflow-hidden">
        <h3 className="text-xl font-bold px-4 pt-3 pb-2">推荐创作者</h3>
        {creators.map((c) => (
          <a key={c.id} href={`/creator/${c.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm" style={{ background: c.avatar_color }}>{c.display_name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold truncate flex items-center gap-1">{c.display_name}{c.verified && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#f472b6] text-[10px] font-bold text-white">✓</span>}</p>
              <p className="text-[13px] text-white/50 truncate">@{c.username}</p>
            </div>
            <button className="text-[13px] font-bold px-4 py-1.5 rounded-full bg-white text-black hover:bg-white/90 transition-colors">${c.subscription_price}</button>
          </a>
        ))}
        <a href="/explore" className="block px-4 py-3 text-[15px] text-[#f472b6] hover:bg-white/[0.03] transition-colors">查看更多</a>
      </div>

      <div className="x-card rounded-2xl overflow-hidden">
        <h3 className="text-xl font-bold px-4 pt-3 pb-2">热门标签</h3>
        {trending.map(({ tag, posts }) => (
          <div key={tag} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer">
            <div><p className="text-[15px] font-bold">{tag}</p><p className="text-[13px] text-white/50">{posts} 条</p></div>
            <MoreIcon />
          </div>
        ))}
      </div>

      <div className="text-[13px] text-white/30 px-1 flex flex-wrap gap-x-3 gap-y-1">
        <span>条款</span><span>隐私</span><span>Cookie</span><span>无障碍</span><span>© 2026 onlyfeet</span>
      </div>
    </aside>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/30">
      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
    </svg>
  );
}
