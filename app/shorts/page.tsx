'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/use-auth';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Music2, X, Send, Link2, Twitter, Facebook, Bookmark } from 'lucide-react';

type Media = { url: string; duration: number };

type Short = {
  id: string; creator_id: string; type: string; caption: string; hashtags: string[];
  placeholder_color: string; duration_sec: number; views: number; likes: number;
  comments: number; shares: number; access: string; is_locked?: boolean;
  ppv_price?: number; media_url?: string; thumbnail_url?: string;
  cover_url?: string | null; bgm_url?: string | null; images?: Media[] | null;
  slide_duration?: number | null; created_at: string; bgm_title?: string; bgm_artist?: string;
  creator?: { username: string; display_name: string; avatar_color: string;
    avatar_url?: string | null; cover_url?: string | null; verified: boolean;
    subscriber_count: number; owner_id?: string; };
};

function rankScore(s: Short, seenIds: Set<string>): number {
  const h = Math.max(1, (Date.now() - new Date(s.created_at).getTime()) / 36e5);
  return s.likes * 3 + s.comments * 2 + s.views * 0.1 + Math.max(0.5, 1.5 - h / (24 * 7)) * 10 + Math.log10((s.creator?.subscriber_count || 1000) + 1) * 0.3 - (seenIds.has(s.id) ? 50 : 0);
}

export default function ShortsPage() {
  const { user } = useAuth();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(0); // 1=下滑,-1=上滑,0=无
  const [sliding, setSliding] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStart = useRef<{ y: number; t: number; x: number } | null>(null);
  const lastTap = useRef(0);

  // Panels
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Hearts animation
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const heartId = useRef(0);

  // Progress
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  // Gallery
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Gallery auto-advance
  useEffect(() => {
    const s = shorts[index];
    if (!s || s.type !== 'gallery') return;
    const imgs = s.images || [];
    if (imgs.length <= 1) { setGalleryIndex(0); return; }
    const dur = (imgs[galleryIndex]?.duration || s.slide_duration || 3) * 1000;
    const t = setTimeout(() => setGalleryIndex((i) => (i + 1) % imgs.length), dur);
    return () => clearTimeout(t);
  }, [index, galleryIndex, shorts]);

  // Progress tracking for video
  useEffect(() => {
    const v = videoRef.current;
    const s = shorts[index];
    if (!v || !s || s.type !== 'video') return;
    v.currentTime = 0;
    const iv = setInterval(() => {
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    }, 100);
    const onEnded = () => { if (index < shorts.length - 1) setIndex(index + 1); };
    v.addEventListener('ended', onEnded);
    return () => { clearInterval(iv); v.removeEventListener('ended', onEnded); };
  }, [index, shorts]);

  // Load data
  useEffect(() => {
    const seen = JSON.parse(localStorage.getItem('seen_shorts') || '[]');
    setSeenIds(new Set(seen));
    supabase.from('shorts').select('*, creator:creators(username, display_name, avatar_color, verified, subscriber_count, owner_id)')
      .then(async ({ data }) => {
        if (!data) return;
        const ownerIds = [...new Set(data.map(s => s.creator?.owner_id).filter(Boolean))];
        const profileMap: Record<string, any> = {};
        if (ownerIds.length) {
          const { data: p } = await supabase.from('profiles').select('id, avatar_url, cover_url').in('id', ownerIds);
          (p || []).forEach(x => { profileMap[x.id] = x; });
        }
        const enriched = data.map(s => ({
          ...s,
          creator: s.creator ? { ...s.creator, avatar_url: profileMap[s.creator.owner_id]?.avatar_url || null, cover_url: profileMap[s.creator.owner_id]?.cover_url || null } : undefined,
        }));
        const ranked = [...enriched].map(s => ({ ...s, score: rankScore(s, new Set(seen)) })).sort((a, b) => b.score - a.score);
        const spaced: Short[] = [];
        const lc: Record<string, number> = {};
        for (const s of ranked) {
          if ((lc[s.creator_id] || 0) >= 2 && spaced.length > 1 && spaced[spaced.length - 2]?.creator_id === s.creator_id) { spaced.push(s); continue; }
          spaced.push(s); lc[s.creator_id] = (lc[s.creator_id] || 0) + 1;
        }
        setShorts(spaced);
        // 拉取真实评论数和点赞数
        const ids = spaced.map(s => s.id);
        if (ids.length > 0) {
          const [{ data: realComments }, { data: realLikes }, { data: realBookmarks }] = await Promise.all([
            supabase.from('comments').select('short_id').in('short_id', ids),
            supabase.from('likes').select('short_id').in('short_id', ids),
            supabase.from('bookmarks').select('short_id').in('short_id', ids),
          ]);
          const commentCounts: Record<string, number> = {};
          (realComments || []).forEach((c: any) => { commentCounts[c.short_id] = (commentCounts[c.short_id] || 0) + 1; });
          const likeCounts: Record<string, number> = {};
          (realLikes || []).forEach((l: any) => { likeCounts[l.short_id] = (likeCounts[l.short_id] || 0) + 1; });
          const bookmarkCounts: Record<string, number> = {};
          (realBookmarks || []).forEach((b: any) => { bookmarkCounts[b.short_id] = (bookmarkCounts[b.short_id] || 0) + 1; });
          setShorts(prev => prev.map(s => ({
            ...s,
            comments: commentCounts[s.id] || 0,
            likes: likeCounts[s.id] || 0,
            shares: bookmarkCounts[s.id] || 0,
          })));
        }
      });
    if (user) {
      supabase.from('likes').select('short_id').eq('user_id', user.id).then(({ data }) => {
        if (data) setLiked(new Set(data.map(l => l.short_id).filter(Boolean)));
      });
      supabase.from('bookmarks').select('short_id').eq('user_id', user.id).then(({ data }) => {
        if (data) setBookmarked(new Set(data.map(b => b.short_id).filter(Boolean)));
      });
    }
  }, [user]);

  // Track seen
  useEffect(() => {
    if (!shorts.length) return;
    const c = shorts[index]; if (!c) return;
    const next = new Set(seenIds); next.add(c.id); setSeenIds(next);
    localStorage.setItem('seen_shorts', JSON.stringify([...next]));
    const t = setTimeout(() => { supabase.from('shorts').update({ views: c.views + 1 }).eq('id', c.id).then(() => {}); }, 1000);
    return () => clearTimeout(t);
  }, [index]);

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= shorts.length || sliding) return;
    const dir = i > index ? 1 : -1;
    setPrevIndex(index);
    setSlideDir(dir);
    setSliding(true);
    setIndex(i);
    setGalleryIndex(0); setProgress(0);
    setTimeout(() => { setSliding(false); setSlideDir(0); }, 350);
  }, [shorts.length, index, sliding]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { y: e.touches[0].clientY, t: Date.now(), x: e.touches[0].clientX };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dt = Date.now() - touchStart.current.t;
    // Double tap detection: short tap with minimal movement
    if (dt < 300 && Math.abs(dx) < 30 && Math.abs(dy) < 30) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        // Double tap → like
        handleDoubleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
        // Single tap → toggle mute
        setTimeout(() => { if (lastTap.current && Date.now() - lastTap.current > 300) setMuted(m => !m); }, 300);
      }
    }
    if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx)) goTo(index + (dy < 0 ? 1 : -1));
    touchStart.current = null;
  };

  // Mouse wheel
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < 20) return;
    goTo(index + (e.deltaY > 0 ? 1 : -1));
  };

  // Double click for desktop
  const lastClick = useRef(0);
  const onClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastClick.current < 300) {
      handleDoubleTap(e.clientX, e.clientY);
      lastClick.current = 0;
    } else {
      lastClick.current = now;
    }
  };

  const handleDoubleTap = (x: number, y: number) => {
    const s = shorts[index]; if (!s) return;
    const id = ++heartId.current;
    setHearts(h => [...h, { id, x, y }]);
    setTimeout(() => setHearts(h => h.filter(hh => hh.id !== id)), 1000);
    if (!user) { window.location.href = '/login'; return; }
    if (!liked.has(s.id)) {
      setLiked(new Set([...liked, s.id]));
      supabase.from('likes').insert({ user_id: user.id, short_id: s.id });
    }
  };

  const toggleLike = async (s: Short) => {
    if (!user) { window.location.href = '/login'; return; }
    const next = new Set(liked);
    next.has(s.id) ? next.delete(s.id) : next.add(s.id);
    setLiked(next);
    if (next.has(s.id)) await supabase.from('likes').insert({ user_id: user.id, short_id: s.id });
    else await supabase.from('likes').delete().eq('user_id', user.id).eq('short_id', s.id);
  };

  const toggleBookmark = async (s: Short) => {
    if (!user) { window.location.href = '/login'; return; }
    const next = new Set(bookmarked);
    if (next.has(s.id)) {
      next.delete(s.id);
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('short_id', s.id);
    } else {
      next.add(s.id);
      await supabase.from('bookmarks').insert({ user_id: user.id, short_id: s.id });
    }
    setBookmarked(next);
  };

  // Comments
  const openComments = () => {
    if (!user) { window.location.href = '/login'; return; }
    setShowComments(true); loadComments();
  };
  const loadComments = async () => {
    setCommentLoading(true);
    const c = shorts[index]; if (!c) return setCommentLoading(false);
    const { data } = await supabase.from('comments').select('*, profiles!comments_user_id_fkey(display_name, avatar_url, avatar_color)').eq('short_id', c.id).order('created_at', { ascending: false }).limit(30);
    setComments(data || []);
    setCommentLoading(false);
  };
  const postComment = async () => {
    if (!commentText.trim() || !user) return;
    const c = shorts[index];
    await supabase.from('comments').insert({ user_id: user.id, short_id: c.id, content: commentText.trim() });
    setCommentText('');
    loadComments();
    // 更新页面上显示的评论数
    setShorts(prev => prev.map((s, i) => i === index ? { ...s, comments: s.comments + 1 } : s));
  };

  // Progress bar drag
  const onProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || !videoRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    videoRef.current.currentTime = (pct / 100) * videoRef.current.duration;
  };

  const current = shorts[index];
  if (shorts.length === 0) return <div className="h-screen flex items-center justify-center bg-black text-white/50">加载中...</div>;
  if (!current) return <div className="h-screen flex items-center justify-center bg-black text-white/50">加载中...</div>;

  const isGallery = current.type === 'gallery';
  const galleryImgs = isGallery ? (current.images || []) : [];

  return (
    <div ref={containerRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onClick={onClick} onWheel={onWheel}
      className="h-screen w-full bg-black overflow-hidden relative select-none">
      {/* Top */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
        <Link href="/shorts" className="text-white text-xl font-bold">only<span className="logo-gradient">feet</span></Link>
        <span className="text-white/70 text-sm">{index + 1} / {shorts.length}</span>
      </div>

      {/* Media with slide transition */}
      <div
        className="h-full w-full flex items-center justify-center bg-black"
        style={{
          transform: sliding ? `translateY(${-slideDir * 100}%)` : 'translateY(0)',
          transition: sliding ? 'transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
        }}
      >
        {isGallery && galleryImgs.length > 0 ? (
          <div className="relative w-full h-full">
            {galleryImgs[galleryIndex]?.url ? (
              <img src={galleryImgs[galleryIndex].url} className="w-full h-full object-contain" alt="" />
            ) : <div className="text-white/40 text-6xl text-center pt-[40vh]">🖼</div>}
            {galleryImgs.length > 1 && (
              <div className="absolute top-8 left-0 right-0 flex justify-center gap-1 z-30">
                {galleryImgs.map((_, i) => <div key={i} className={`h-0.5 rounded-full transition-all ${i === galleryIndex ? 'w-8 bg-white' : 'w-4 bg-white/30'}`} />)}
              </div>
            )}
          </div>
        ) : current.media_url && current.type === 'video' ? (
          <video ref={videoRef} src={current.media_url} className="w-full h-full object-contain" autoPlay loop muted={muted} playsInline />
        ) : current.media_url ? (
          <img src={current.media_url} className="w-full h-full object-contain" alt="" />
        ) : (
          <div className="text-center text-white/40"><div className="text-6xl mb-2">{current.type === 'video' ? '▶' : '🖼'}</div><p className="text-sm">{current.type === 'video' ? `${current.duration_sec}秒 视频` : '图集'}</p></div>
        )}
        {current.is_locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 pointer-events-none">
            <div className="text-center"><div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#f472b6]/30 flex items-center justify-center"><LockIcon /></div><p className="text-white font-bold">付费内容</p><p className="text-white/70 text-sm mt-1">解锁 ${current.ppv_price}</p></div>
          </div>
        )}
      </div>

      {/* Double-tap hearts */}
      {hearts.map(h => (
        <div key={h.id} className="absolute pointer-events-none z-50 animate-heart-pop" style={{ left: h.x - 40, top: h.y - 40 }}>
          <Heart className="w-20 h-20 fill-[#f472b6] text-[#f472b6] opacity-80" />
        </div>
      ))}

      {/* Right actions */}
      <div className="absolute right-3 bottom-20 z-30 flex flex-col gap-5 items-center">
        <button onClick={() => toggleLike(current)} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${liked.has(current.id) ? 'bg-[#f472b6]' : 'bg-white/10'}`}>
            <Heart className={`w-6 h-6 ${liked.has(current.id) ? 'fill-white text-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[11px] mt-1">{(current.likes + (liked.has(current.id) ? 1 : 0)).toLocaleString()}</span>
        </button>
        <button onClick={openComments} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"><MessageCircle className="w-6 h-6 text-white" /></div>
          <span className="text-white text-[11px] mt-1">{current.comments}</span>
        </button>
        <button onClick={() => setShowShare(true)} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"><Share2 className="w-6 h-6 text-white" /></div>
          <span className="text-white text-[11px] mt-1">{current.shares}</span>
        </button>
        <button onClick={() => toggleBookmark(current)} className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bookmarked.has(current.id) ? 'bg-[#fbbf24]/20' : 'bg-white/10'}`}>
            <Bookmark className={`w-6 h-6 ${bookmarked.has(current.id) ? 'fill-[#fbbf24] text-[#fbbf24]' : 'text-white'}`} />
          </div>
        </button>
        <button onClick={() => setMuted(!muted)} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">{muted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}</div>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-16 z-30 p-4 pb-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
        <Link href={`/creator/${current.creator?.username}`} className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-black ring-2 ring-white/20 flex-shrink-0">
            {current.creator?.avatar_url ? <img src={current.creator.avatar_url} className="w-full h-full object-cover" alt="" /> :
              <span className="w-full h-full flex items-center justify-center text-white font-bold" style={{ background: current.creator?.avatar_color }}>{current.creator?.display_name[0]}</span>}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1"><span className="text-white font-bold text-sm truncate">{current.creator?.display_name}</span>{current.creator?.verified && <span className="text-[#f472b6] text-xs flex-shrink-0">✓</span>}</div>
            <span className="text-white/60 text-xs">@{current.creator?.username}</span>
          </div>
          <button onClick={e => { e.preventDefault(); if (!user) { window.location.href = '/login'; return; } }} className="ml-auto px-4 py-1 rounded-full bg-[#f472b6] text-white text-xs font-bold flex-shrink-0">订阅</button>
        </Link>
        <p className="text-white text-sm mb-1 line-clamp-2">{current.caption}</p>
        {current.hashtags?.length > 0 && <p className="text-[#f472b6] text-xs mb-1">{current.hashtags.map(h => `#${h}`).join(' ')}</p>}
        {current.bgm_title && <div className="flex items-center gap-1 text-white/60 text-xs"><Music2 className="w-3 h-3" /><span>{current.bgm_title} · {current.bgm_artist}</span></div>}
      </div>

      {/* Progress bar */}
      {current.type === 'video' && (
        <div ref={progressRef} onClick={onProgressClick} className="absolute bottom-0 left-0 right-0 z-30 h-0.5 bg-white/20 cursor-pointer">
          <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Comment panel */}
      {showComments && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <button onClick={() => setShowComments(false)}><X className="w-5 h-5 text-white" /></button>
            <span className="text-white font-bold">{comments.length} 条评论</span>
            <div className="w-5" />
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
            {commentLoading ? <p className="text-white/40 text-center py-8">加载中...</p> :
              comments.length === 0 ? <p className="text-white/40 text-center py-8">暂无评论，来说点什么吧</p> :
                comments.map((c: any) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ background: c.profiles?.avatar_color }}>
                      {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : c.profiles?.display_name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><span className="text-white text-sm font-bold">{c.profiles?.display_name || '用户'}</span><span className="text-white/30 text-xs">{new Date(c.created_at).toLocaleDateString()}</span></div>
                      <p className="text-white/80 text-sm mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
          </div>
          <div className="p-3 border-t border-white/10 flex items-center gap-2">
            <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment()} placeholder="说点什么..." className="flex-1 bg-white/5 rounded-full px-4 py-2 text-white text-sm outline-none placeholder:text-white/30" />
            <button onClick={postComment} disabled={!commentText.trim()} className="text-[#f472b6] disabled:text-white/20"><Send className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {/* Share panel */}
      {showShare && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={() => setShowShare(false)}>
          <div className="bg-zinc-900 rounded-t-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-4">分享</h3>
            <div className="flex justify-around mb-6">
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/post/' + current.id); setShowShare(false); }} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center"><Link2 className="w-6 h-6 text-white" /></div>
                <span className="text-white/70 text-xs">复制链接</span>
              </button>
              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center"><Twitter className="w-6 h-6 text-white" /></div>
                <span className="text-white/70 text-xs">Twitter</span>
              </button>
              <button className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center"><Facebook className="w-6 h-6 text-white" /></div>
                <span className="text-white/70 text-xs">Facebook</span>
              </button>
            </div>
            <button onClick={() => setShowShare(false)} className="w-full py-3 rounded-xl bg-white/10 text-white font-bold">取消</button>
          </div>
        </div>
      )}

      {/* Scroll hint */}
      {index < shorts.length - 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/40 text-xs animate-bounce z-20">↑ 下滑看下一个</div>
      )}

      <style jsx>{`
        @keyframes heartPop {
          0% { transform: scale(0); opacity: 1; }
          30% { transform: scale(1.3); opacity: 0.9; }
          70% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(0.5); opacity: 0; }
        }
        .animate-heart-pop { animation: heartPop 1s ease-out forwards; }
      `}</style>
    </div>
  );
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8"><path d="M12 2C9.79 2 8 3.79 8 6v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-2V6c0-2.21-1.79-4-4-4zm-2 4c0-1.1.9-2 2-2s2 .9 2 2v3h-4V6z" /></svg>;
}
