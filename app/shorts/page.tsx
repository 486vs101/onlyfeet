'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/use-auth';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Music2 } from 'lucide-react';

type Short = {
  id: string;
  creator_id: string;
  type: string;
  caption: string;
  hashtags: string[];
  placeholder_color: string;
  duration_sec: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  access: string;
  created_at: string;
  bgm_title?: string;
  bgm_artist?: string;
  creator?: {
    username: string;
    display_name: string;
    avatar_color: string;
    verified: boolean;
    subscriber_count: number;
  };
};

// ===== 算法核心 =====
// 综合评分:点赞×3 + 评论×2 + 浏览×0.1 + 时效加成 + 创作者热度 - 已看过
function rankScore(s: Short, seenIds: Set<string>): number {
  const hoursAgo = Math.max(1, (Date.now() - new Date(s.created_at).getTime()) / 36e5);
  const recencyBoost = Math.max(0.5, 1.5 - hoursAgo / (24 * 7)); // 7 天线性衰减
  const creatorBoost = Math.log10((s.creator?.subscriber_count || 1000) + 1) * 0.3;
  const seen = seenIds.has(s.id) ? -50 : 0;

  return (
    s.likes * 3 +
    s.comments * 2 +
    s.views * 0.1 +
    recencyBoost * 10 +
    creatorBoost -
    seen
  );
}

// ===== 滑动逻辑 =====
export default function ShortsPage() {
  const { user } = useAuth();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ y: number; t: number } | null>(null);

  // 加载 + 排序
  useEffect(() => {
    const seen = JSON.parse(localStorage.getItem('seen_shorts') || '[]');
    setSeenIds(new Set(seen));

    supabase
      .from('shorts')
      .select(`*, creator:creators(username, display_name, avatar_color, verified, subscriber_count)`)
      .then(({ data }) => {
        if (!data) return;
        const ranked = [...data]
          .map(s => ({ ...s, score: rankScore(s, new Set(seen)) }))
          .sort((a, b) => b.score - a.score);
        // 同创作者间隔(避免连刷 3 条以上)
        const spaced: Short[] = [];
        const lastCreatorCount: Record<string, number> = {};
        for (const s of ranked) {
          const last = lastCreatorCount[s.creator_id] || 0;
          if (last >= 2 && spaced.length > 0 && spaced[spaced.length - 2]?.creator_id === s.creator_id) {
            spaced.push(s);
            continue;
          }
          spaced.push(s);
          lastCreatorCount[s.creator_id] = last + 1;
        }
        setShorts(spaced);
      });

    // 加载用户已点赞列表
    if (user) {
      supabase.from('likes').select('short_id').eq('user_id', user.id).then(({ data }) => {
        if (data) {
          const ids = new Set(data.map((l: any) => l.short_id).filter(Boolean));
          setLiked(ids);
        }
      });
    }
  }, [user]);

  // 记录看过的
  useEffect(() => {
    if (shorts.length === 0) return;
    const current = shorts[index];
    if (!current) return;
    const next = new Set(seenIds);
    next.add(current.id);
    setSeenIds(next);
    localStorage.setItem('seen_shorts', JSON.stringify([...next]));
    // 浏览 +1(去抖)
    const t = setTimeout(() => {
      // 浏览 +1
      supabase.from('shorts').update({ views: current.views + 1 }).eq('id', current.id).then(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [index]);

  // 上下滑切换
  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= shorts.length) return;
    setIndex(i);
  }, [shorts.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dy) > 50) goTo(index + (dy < 0 ? 1 : -1));
    touchStart.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 30) return;
    goTo(index + (e.deltaY > 0 ? 1 : -1));
  };

  // 点赞
  const toggleLike = async (s: Short) => {
    if (!user) {
      // 未登录 -> 引导去登录
      window.location.href = '/login';
      return;
    }
    const next = new Set(liked);
    const isLiking = !next.has(s.id);
    if (isLiking) next.add(s.id); else next.delete(s.id);
    setLiked(next);

    // 写入 likes 表
    if (isLiking) {
      await supabase.from('likes').insert({ user_id: user.id, short_id: s.id });
    } else {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('short_id', s.id);
    }
  };

  // 加载看过的(本地缓存)
  useEffect(() => {
    const seen = JSON.parse(localStorage.getItem('seen_shorts') || '[]');
    setSeenIds(new Set(seen));
  }, []);

  const current = shorts[index];

  if (shorts.length === 0) {
    return <div className="h-screen flex items-center justify-center bg-black text-white/50">加载中...</div>;
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
      className="h-screen w-full bg-black overflow-hidden relative select-none"
    >
      {/* 顶部导航 */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <Link href="/shorts" className="text-white text-xl font-bold">
          only<span className="logo-gradient">feet</span>
        </Link>
        <span className="text-white/70 text-sm">{index + 1} / {shorts.length}</span>
      </div>

      {/* 视频区 */}
      <div className="h-full w-full flex items-center justify-center" style={{ background: current.placeholder_color }}>
        <div className="text-center text-white/40">
          <div className="text-6xl mb-2">{current.type === 'video' ? '▶' : '🖼'}</div>
          <p className="text-sm">{current.type === 'video' ? `${current.duration_sec}秒 视频` : '图集'}</p>
        </div>
      </div>

      {/* 右侧操作栏 */}
      <div className="absolute right-3 bottom-24 z-30 flex flex-col gap-5 items-center">
        <button onClick={() => toggleLike(current)} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${liked.has(current.id) ? 'bg-[#f472b6]' : 'bg-white/10'}`}>
            <Heart className={`w-6 h-6 ${liked.has(current.id) ? 'fill-white text-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[11px] mt-1">{(current.likes + (liked.has(current.id) ? 1 : 0)).toLocaleString()}</span>
        </button>
        <button className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[11px] mt-1">{current.comments}</span>
        </button>
        <button className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[11px] mt-1">{current.shares}</span>
        </button>
        <button onClick={() => setMuted(!muted)} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            {muted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
          </div>
        </button>
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-16 z-30 p-4 pb-6 bg-gradient-to-t from-black/80 to-transparent">
        <Link href={`/creator/${current.creator?.username}`} className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: current.creator?.avatar_color }}>
            {current.creator?.display_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-[15px]">{current.creator?.display_name}</span>
              {current.creator?.verified && <span className="text-[#f472b6] text-xs">✓</span>}
            </div>
            <span className="text-white/60 text-xs">@{current.creator?.username}</span>
          </div>
          <button className="ml-2 px-4 py-1 rounded-full bg-[#f472b6] text-white text-sm font-bold">订阅</button>
        </Link>
        <p className="text-white text-[15px] mb-2 line-clamp-2">{current.caption}</p>
        {current.hashtags && current.hashtags.length > 0 && (
          <p className="text-[#f472b6] text-sm mb-2">{current.hashtags.map(h => `#${h}`).join(' ')}</p>
        )}
        {current.bgm_title && (
          <div className="flex items-center gap-1.5 text-white/70 text-xs">
            <Music2 className="w-3 h-3" />
            <span>{current.bgm_title} · {current.bgm_artist}</span>
          </div>
        )}
      </div>

      {/* 上下滑提示 */}
      {index < shorts.length - 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/40 text-xs animate-bounce z-20">
          ↑ 下滑看下一个
        </div>
      )}
    </div>
  );
}
