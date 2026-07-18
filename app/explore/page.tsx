'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Search, Sparkles, TrendingUp, Users, UserCheck, BadgeCheck } from 'lucide-react';

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

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_url?: string | null;
  bio: string;
  is_creator: boolean;
};

type SearchType = 'all' | 'creator' | 'user';

export default function ExplorePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');

  useEffect(() => {
    supabase
      .from('creators')
      .select('*')
      .order('subscriber_count', { ascending: false })
      .then(({ data }) => {
        if (data) setCreators(data);
        setLoading(false);
      });
    // 加载普通用户(非创作者)
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_color, avatar_url, bio, is_creator')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setUsers(data.filter((u: any) => !u.is_creator) as UserRow[]);
      });
  }, []);

  // 过滤
  const matchedCreators = query.trim()
    ? creators.filter(c =>
        c.display_name.toLowerCase().includes(query.toLowerCase()) ||
        c.username.toLowerCase().includes(query.toLowerCase())
      )
    : creators;

  const matchedUsers = query.trim()
    ? users.filter(u =>
        (u.username && u.username.toLowerCase().includes(query.toLowerCase())) ||
        (u.display_name && u.display_name.toLowerCase().includes(query.toLowerCase()))
      )
    : users;

  const filters: { key: SearchType; label: string; icon: any }[] = [
    { key: 'all', label: '全部', icon: Sparkles },
    { key: 'creator', label: '创作者', icon: BadgeCheck },
    { key: 'user', label: '用户', icon: Users },
  ];

  const showCreators = searchType !== 'user';
  const showUsers = searchType !== 'creator';

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 z-30 top-sticky border-b border-white/10 backdrop-blur-md">
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-xl font-bold tracking-tight">
            only<span className="logo-gradient">feet</span>
          </h1>
          <p className="text-white/50 text-[13px]">探索创作者和用户</p>
        </div>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索创作者或用户"
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-[#f472b6] focus:bg-black/40"
            />
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
          {filters.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSearchType(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-[13px] rounded-full whitespace-nowrap transition-colors ${
                searchType === key ? 'bg-white text-black font-bold' : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center text-white/40 py-20">加载中...</div>
        ) : (
          <>
            {/* 创作者 */}
            {showCreators && matchedCreators.length > 0 && (
              <section className="mb-8">
                <h2 className="text-white/60 text-sm font-medium mb-3 px-1">
                  创作者 · {matchedCreators.length}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {matchedCreators.map((c) => (
                    <Link
                      key={c.id}
                      href={`/creator/${c.username}`}
                      className="x-card overflow-hidden group hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="h-20 relative" style={{ background: c.cover_color }}>
                        <div className="absolute -bottom-5 left-3 w-12 h-12 rounded-full border-2 border-black flex items-center justify-center text-white font-bold text-base" style={{ background: c.avatar_color }}>
                          {c.display_name[0]}
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
              </section>
            )}

            {/* 普通用户 */}
            {showUsers && matchedUsers.length > 0 && (
              <section className="mb-8">
                <h2 className="text-white/60 text-sm font-medium mb-3 px-1">
                  用户 · {matchedUsers.length}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchedUsers.map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile`}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ background: u.avatar_color || '#f472b6' }}>
                          {u.display_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[15px] truncate">{u.display_name}</p>
                        <p className="text-[13px] text-white/50 truncate">@{u.username}</p>
                        {u.bio && <p className="text-[12px] text-white/60 mt-0.5 line-clamp-1">{u.bio}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {showCreators && matchedCreators.length === 0 && showUsers && matchedUsers.length === 0 && (
              <div className="text-center text-white/40 py-20">没找到匹配的用户或创作者</div>
            )}
          </>
        )}
      </div>
    </>
  );
}
