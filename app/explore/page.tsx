'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Search, TrendingUp, Sparkles, Users } from 'lucide-react';

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
  post_count: number;
  short_count: number;
};

type Filter = 'for-you' | 'trending' | 'new' | 'cheap';

export default function ExplorePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('for-you');

  useEffect(() => {
    supabase
      .from('creators')
      .select('*')
      .order('subscriber_count', { ascending: false })
      .then(({ data }) => {
        if (data) setCreators(data);
        setLoading(false);
      });
  }, []);

  const filtered = creators.filter(c =>
    !query ||
    c.display_name.toLowerCase().includes(query.toLowerCase()) ||
    c.username.toLowerCase().includes(query.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (filter === 'trending') return b.subscriber_count - a.subscriber_count;
    if (filter === 'cheap') return a.subscription_price - b.subscription_price;
    if (filter === 'new') return (b.short_count + b.post_count) - (a.short_count + a.post_count);
    return 0;
  });

  const filters: { key: Filter; label: string; icon: any }[] = [
    { key: 'for-you', label: '为你推荐', icon: Sparkles },
    { key: 'trending', label: '热门', icon: TrendingUp },
    { key: 'new', label: '最新', icon: Users },
    { key: 'cheap', label: '折扣', icon: Search },
  ];

  return (
    <>
      {/* Header - X 风格 */}
      <div className="sticky top-0 z-30 top-sticky border-b border-white/10 backdrop-blur-md">
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-xl font-bold tracking-tight">
            only<span className="logo-gradient">feet</span>
          </h1>
          <p className="text-white/50 text-[13px]">探索创作者</p>
        </div>
        {/* 搜索框 */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索创作者"
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-[#f472b6] focus:bg-black/40"
            />
          </div>
        </div>
        {/* 横向滤镜 */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
          {filters.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-[13px] rounded-full whitespace-nowrap transition-colors ${
                filter === key ? 'bg-white text-black font-bold' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 创作者卡片 - X 风格 */}
      <div className="p-4">
        {loading ? (
          <div className="text-center text-white/40 py-20">加载中...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center text-white/40 py-20">没找到匹配的创作者</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map(c => (
              <Link
                key={c.id}
                href={`/creator/${c.username}`}
                className="x-card overflow-hidden group hover:bg-white/[0.02] transition-colors"
              >
                {/* 封面 + 头像 */}
                <div className="h-20 relative" style={{ background: c.cover_color }}>
                  <div className="absolute -bottom-5 left-3 w-12 h-12 rounded-full border-2 border-black flex items-center justify-center text-white font-bold text-base"
                    style={{ background: c.avatar_color }}>
                    {c.display_name[0]}
                  </div>
                </div>
                {/* 信息 */}
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
        )}
      </div>
    </>
  );
}
