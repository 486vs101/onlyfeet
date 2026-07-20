'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/use-auth';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Music2 } from 'lucide-react';

type Media = { url: string; duration: number };

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
  is_locked?: boolean;
  ppv_price?: number;
  media_url?: string;
  thumbnail_url?: string;
  cover_url?: string | null;
  bgm_url?: string | null;
  images?: Media[] | null;
  slide_duration?: number | null;
  created_at: string;
  bgm_title?: string;
  bgm_artist?: string;
  creator?: {
    username: string;
    display_name: string;
    avatar_color: string;
    avatar_url?: string | null;
    cover_url?: string | null;
    verified: boolean;
    subscriber_count: number;
    owner_id?: string;
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

  // 图集自动轮播(当前视频)
  const [galleryIndex, setGalleryIndex] = useState(0);
  useEffect(() => {
    const s = shorts[index];
    if (!s || s.type !== 'gallery') return;
    const images = s.images || [];
    if (images.length <= 1) { setGalleryIndex(0); return; }
    const dur = (images[galleryIndex]?.duration || s.slide_duration || 3) * 1000;
    const t = setTimeout(() => {
      setGalleryIndex((i) => (i + 1) % images.length);
    }, dur);
    return () => clearTimeout(t);
  }, [index, galleryIndex, shorts]);

  // 加载 + 排序
  useEffect(() => {
    const seen = JSON.parse(localStorage.getItem('seen_shorts') || '[]');
    setSeenIds(new Set(seen));

    supabase
      .from('shorts')
      .select(`*, creator:creators(username, display_name, avatar_color, verified, subscriber_count, owner_id)`)
      .then(async ({ data }) => {
        if (!data) return;
        // 获取所有创作者的 profile(头像/封面)
        const ownerIds = [...new Set(data.map(s => s.creator?.owner_id).filter(Boolean))];
        const profileMap: Record<string, any> = {};
        if (ownerIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, avatar_url, cover_url').in('id', ownerIds);
          (profiles || []).forEach(p => { profileMap[p.id] = p; });
        }
        // 合并 profile 数据到 creator
        const enriched = data.map(s => ({
          ...s,
          creator: s.creator ? {
            ...s.creator,
            avatar_url: profileMap[s.creator.owner_id]?.avatar_url || null,
            cover_url: profileMap[s.creator.owner_id]?.cover_url || null,
          } : undefined,
        }));
        const ranked = [...enriched]
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

      {/* 视频/图集区 */}
      <div className="h-full w-full flex items-center justify-center bg-black">
        {(() => {
          const isGallery = current.type === 'gallery';
          const galleryImgs = isGallery ? (current.images || []) : [];
          
          // 图集:多图轮播
          if (isGallery && galleryImgs.length > 0) {
            const imgUrl = galleryImgs[galleryIndex]?.url || '';
            return (
              <div className="relative w-full h-full">
                {imgUrl ? (
                  <img src={imgUrl} className="w-full h-full object-contain" alt="" />
                ) : (
                  <div className="text-center text-white/40"><div className="text-6xl mb-2">🖼</div><p className="text-sm">图集</p></div>
                )}
                {/* 图集进度条 */}
                {galleryImgs.length > 1 && (
                  <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 z-30">
                    {galleryImgs.map((_, i) => (
                      <div key={i} className={`h-0.5 rounded-full transition-all ${i === galleryIndex ? 'w-8 bg-white' : 'w-4 bg-white/30'}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          
          // 视频
          if (current.media_url && current.type === 'video') {
            return (
              <video
                key={current.id}
                src={current.media_url}
                className="w-full h-full object-contain"
                autoPlay loop muted={muted} playsInline
                onClick={() => setMuted(!muted)}
              />
            );
          }
          
          // 单图(旧数据兼容)
          if (current.media_url && current.type !== 'video') {
            return <img src={current.media_url} className="w-full h-full object-contain" alt="" />;
          }
          
          // 无媒体
          return (
            <div className="text-center text-white/40">
              <div className="text-6xl mb-2">{current.type === 'video' ? '▶' : '🖼'}</div>
              <p className="text-sm">{current.type === 'video' ? `${current.duration_sec}秒 视频` : '图集'}</p>
            </div>
          );
        })()}
        {current.is_locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#f472b6]/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
                  <path d="M12 2C9.79 2 8 3.79 8 6v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-2V6c0-2.21-1.79-4-4-4zm-2 4c0-1.1.9-2 2-2s2 .9 2 2v3h-4V6z" />
                </svg>
              </div>
              <p className="text-white font-bold">付费内容</p>
              <p className="text-white/70 text-sm mt-1">解锁 ${current.ppv_price}</p>
            </div>
          </div>
        )}
      </div>

      {/* 右侧操作栏 */}
      <div className="absolute right-3 bottom-24 z-30 flex flex-col gap-5 items-center">
        <button onClick={() => toggleLike(current)} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${liked.has(current.id) ? 'bg-[#f472b6]' : 'bg-white/10'}`}>
            <Heart className={`w-6 h-6 ${liked.has(current.id) ? 'fill-white text-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[11px] mt-1">{(current.likes + (liked.has(current.id) ? 1 : 0)).toLocaleString()}</span>
        </button>
        <button onClick={() => user ? null : (window.location.href = '/login')} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[11px] mt-1">{current.comments}</span>
        </button>
        <button onClick={() => user ? navigator.clipboard.writeText(window.location.href) : (window.location.href = '/login')} className="flex flex-col items-center">
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
      <div className="absolute bottom-0 left-0 right-16 z-30 p-4 pb-6">
        <Link href={`/creator/${current.creator?.username}`} className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold bg-black ring-2 ring-white/20">
            {current.creator?.avatar_url ? (
              <img src={current.creator.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <span style={{ background: current.creator?.avatar_color, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {current.creator?.display_name[0]}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-[15px]">{current.creator?.display_name}</span>
              {current.creator?.verified && <span className="text-[#f472b6] text-xs">✓</span>}
            </div>
            <span className="text-white/60 text-xs">@{current.creator?.username}</span>
          </div>
          <button onClick={() => user ? null : (window.location.href = '/login')} className="ml-2 px-4 py-1 rounded-full bg-[#f472b6] text-white text-sm font-bold">订阅</button>
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
