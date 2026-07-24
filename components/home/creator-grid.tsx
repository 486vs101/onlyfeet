'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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

type Filter = 'all' | 'popular' | 'new' | 'cheap';

export function CreatorGrid() {
  const [filter, setFilter] = useState<Filter>('all');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('creators')
      .select('*')
      .order('subscriber_count', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); }
        else { setCreators(data || []); }
        setLoading(false);
      });
  }, []);

  const filtered = [...creators].sort((a, b) => {
    if (filter === 'popular') return b.subscriber_count - a.subscriber_count;
    if (filter === 'cheap')  return a.subscription_price - b.subscription_price;
    return 0;
  });

  return (
    <div>
      <div className="sticky top-0 z-30 top-sticky border-b border-white/10">
        <div className="flex gap-1 px-4 py-2 overflow-x-auto no-scrollbar">
          {(['all','popular','new','cheap'] as Filter[]).map((key) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                filter === key ? 'bg-white text-black font-bold' : 'bg-[hsl(var(--bg-secondary))] text-[hsl(var(--fg-secondary))]'
              }`}>
              {key === 'all' ? '全部' : key === 'popular' ? '热门' : key === 'new' ? '最新' : '折扣'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading && <div className="text-center text-[hsl(var(--fg-muted))] py-20">Loading creators...</div>}
        {error && <div className="text-center text-red-400 py-20">Error: {error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((c) => (
              <Link key={c.id} href={`/creator/${c.username}`} className="x-card rounded-2xl overflow-hidden group">
                <div className="h-24 relative" style={{ background: c.cover_color }}>
                  <div className="absolute -bottom-6 left-3 w-14 h-14 rounded-full border-2 border-[hsl(var(--bg-primary))] flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: c.avatar_color }}>
                    {c.display_name[0]}
                  </div>
                </div>
                <div className="pt-8 pb-3 px-3">
                  <p className="text-[15px] font-bold truncate flex items-center gap-1">
                    {c.display_name}
                    {c.verified && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#f472b6] text-[10px] font-bold text-white">✓</span>}
                  </p>
                  <p className="text-[13px] text-[hsl(var(--fg-secondary))] truncate">@{c.username}</p>
                  <p className="text-[13px] text-[hsl(var(--fg-muted))] mt-1">{(c.subscriber_count/1000).toFixed(1)}K 个关注</p>
                  <div className="mt-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-[hsl(var(--bg-secondary))] text-[13px] text-[hsl(var(--fg-secondary))]">
                      ${c.subscription_price}<span className="text-[hsl(var(--fg-muted))]">/mo</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
