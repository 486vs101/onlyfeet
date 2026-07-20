'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Lock, ArrowLeft, Music2, Trash2, Pin, Bookmark } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';

type Media = { url: string; duration: number };
type Short = {
  id: string;
  creator_id: string;
  type: string;
  caption: string;
  hashtags: string[];
  duration_sec: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  access: string;
  is_locked?: boolean;
  ppv_price?: number;
  media_url?: string | null;
  thumbnail_url?: string | null;
  cover_url?: string | null;
  bgm_url?: string | null;
  bgm_title?: string | null;
  bgm_artist?: string | null;
  images?: Media[] | null;
  slide_duration?: number | null;
  is_pinned?: boolean;
  pinned_at?: string | null;
  created_at: string;
};

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Short | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase.from('shorts').select('*').eq('id', id).maybeSingle()
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return; }
        if (!data) { setError('作品不存在'); setLoading(false); return; }
        setPost(data as Short);
        // 查创作者 + 其 profile(头像/封面)
        supabase.from('creators').select('*').eq('id', data.creator_id).maybeSingle()
          .then(async ({ data: c }) => {
            if (c && c.owner_id) {
              const { data: profile } = await supabase.from('profiles').select('avatar_url, cover_url').eq('id', c.owner_id).maybeSingle();
              setCreator({ ...c, avatar_url: profile?.avatar_url || null, cover_url: profile?.cover_url || null });
            } else {
              setCreator(c);
            }
          });
        setLoading(false);
      });
    if (user) {
      supabase.from('likes').select('id').eq('user_id', user.id).eq('short_id', id).maybeSingle()
        .then(({ data }) => setLiked(!!data));
      supabase.from('bookmarks').select('id').eq('user_id', user.id).eq('short_id', id).maybeSingle()
        .then(({ data }) => setBookmarked(!!data));
    }
  }, [id, user]);

  // 图集自动轮播
  useEffect(() => {
    if (!post || post.type !== 'gallery') return;
    const images = post.images || [];
    if (images.length <= 1) return;
    const dur = (images[index]?.duration || post.slide_duration || 3) * 1000;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % images.length);
    }, dur);
    return () => clearTimeout(t);
  }, [index, post]);

  const toggleLike = useCallback(async () => {
    if (!user || !post) { window.location.href = '/login'; return; }
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('short_id', post.id);
      setLiked(false);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, short_id: post.id });
      setLiked(true);
    }
  }, [user, post, liked]);

  const toggleBookmark = useCallback(async () => {
    if (!user || !post) { window.location.href = '/login'; return; }
    if (bookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('short_id', post.id);
      setBookmarked(false);
    } else {
      await supabase.from('bookmarks').insert({ user_id: user.id, short_id: post.id });
      setBookmarked(true);
    }
  }, [user, post, bookmarked]);

  // 删除作品(只有创作者本人)
  const handleDelete = async () => {
    if (!post || !user) return;
    if (!confirm('确定删除这个作品吗?此操作不可恢复')) return;
    const { error } = await supabase.from('shorts').delete().eq('id', post.id);
    if (error) {
      alert('删除失败: ' + error.message);
      return;
    }
    // 同步 likes 清理
    await supabase.from('likes').delete().eq('short_id', post.id);
    // 同步创作者统计
    if (creator) {
      await supabase.from('creators').update({
        short_count: Math.max(0, (creator.short_count || 1) - 1)
      }).eq('id', creator.id);
    }
    router.push('/profile');
  };

  const isOwner = user && creator && creator.owner_id === user.id;

  // 切换置顶状态
  const togglePin = async () => {
    if (!post) return;
    const newPinned = !post.is_pinned;
    setPost({ ...post, is_pinned: newPinned });
    await supabase.from('shorts').update({
      is_pinned: newPinned,
      pinned_at: newPinned ? new Date().toISOString() : null,
    }).eq('id', post.id);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white/50">加载中...</div>;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white/70">
        <div className="text-center">
          <p className="mb-4">{error || '作品不存在'}</p>
          <Link href="/shorts" className="text-[#f472b6] hover:underline">返回</Link>
        </div>
      </div>
    );
  }

  // 计算媒体来源
  const isGallery = post.type === 'gallery';
  const galleryImages = isGallery ? (post.images || []) : [];
  const currentMediaUrl = isGallery
    ? galleryImages[index]?.url || ''
    : post.media_url;

  return (
    <div className="min-h-screen bg-black pb-12">
      {/* 顶部返回 */}
      <div className="sticky top-0 z-30 top-sticky border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/70 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">作品</h1>
        {isOwner && (
          <button onClick={togglePin} className={`w-9 h-9 rounded-full flex items-center justify-center ${post.is_pinned ? 'bg-[#f472b6]/20' : 'hover:bg-white/10'}`} title={post.is_pinned ? '取消置顶' : '置顶'}>
            <Pin className={`w-4 h-4 ${post.is_pinned ? 'text-[#f472b6] fill-[#f472b6]' : 'text-white/60'}`} />
          </button>
        )}
        {isOwner && (
          <button onClick={handleDelete} className="w-9 h-9 rounded-full hover:bg-red-500/20 flex items-center justify-center group">
            <Trash2 className="w-4 h-4 text-white/60 group-hover:text-red-400" />
          </button>
        )}
      </div>

      {/* 媒体区 - 黑底融入刷视频 */}
      <div className="relative bg-black">
        <div className="aspect-square max-h-[70vh] mx-auto flex items-center justify-center bg-black">
          {currentMediaUrl ? (
            isGallery ? (
              <img src={currentMediaUrl} className="w-full h-full object-contain" alt="" />
            ) : (
              <video src={currentMediaUrl} className="w-full h-full object-contain" controls autoPlay loop />
            )
          ) : (
            <div className="text-white/30 text-sm">无媒体</div>
          )}
          {post.is_locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center">
                <Lock className="w-12 h-12 mx-auto mb-2 text-white" />
                <p className="text-white font-bold">付费内容</p>
                <p className="text-white/70 text-sm mt-1">解锁 ${post.ppv_price}</p>
              </div>
            </div>
          )}
        </div>

        {/* 图集指示器 */}
        {isGallery && galleryImages.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {galleryImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 创作者信息 + 封面背景 */}
      {creator && (
        <Link href={`/creator/${creator.username}`} className="block">
          {/* 封面背景 */}
          <div className="relative h-24 overflow-hidden">
            {creator.cover_url ? (
              <img src={creator.cover_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full" style={{ background: creator.cover_color || creator.avatar_color || '#1a1a2e' }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          {/* 头像 + 名字 */}
          <div className="flex items-center gap-3 px-4 py-3 -mt-8 relative z-10">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-black ring-2 ring-white/20 flex-shrink-0">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold" style={{ background: creator.avatar_color }}>
                  {creator.display_name[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pt-3">
              <div className="flex items-center gap-1">
                <span className="font-bold text-[17px] truncate">{creator.display_name}</span>
                {creator.verified && <span className="text-[#f472b6] text-sm flex-shrink-0">✓</span>}
              </div>
              <span className="text-white/60 text-xs">@{creator.username}</span>
            </div>
            <button className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white text-sm font-bold flex-shrink-0">
              订阅
            </button>
          </div>
        </Link>
      )}

      {/* 描述 + 标签 + BGM */}
      <div className="px-4 pb-3 border-b border-white/5">
        <p className="text-white text-[15px] mb-2">{post.caption}</p>
        {post.hashtags && post.hashtags.length > 0 && (
          <p className="text-[#f472b6] text-sm mb-2">{post.hashtags.map((h) => `#${h}`).join(' ')}</p>
        )}
        {post.bgm_title && (
          <div className="flex items-center gap-1.5 text-white/70 text-xs mt-1">
            <Music2 className="w-3 h-3" />
            <span>{post.bgm_title} · {post.bgm_artist}</span>
          </div>
        )}
      </div>

      {/* 操作栏 */}
      <div className="px-4 py-3 flex items-center gap-6 border-b border-white/5">
        <button onClick={toggleLike} className="flex items-center gap-1.5 text-white/80 hover:text-white">
          <Heart className={`w-5 h-5 ${liked ? 'fill-[#f472b6] text-[#f472b6]' : ''}`} />
          <span className="text-sm">{post.likes + (liked ? 1 : 0)}</span>
        </button>
        <button className="flex items-center gap-1.5 text-white/80 hover:text-white">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">{post.comments}</span>
        </button>
        <button onClick={toggleBookmark} className="flex items-center gap-1.5 text-white/80 hover:text-white">
          <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-[#f472b6] text-[#f472b6]' : ''}`} />
        </button>
        <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="flex items-center gap-1.5 text-white/80 hover:text-white">
          <Share2 className="w-5 h-5" />
          <span className="text-sm">{post.shares}</span>
        </button>
      </div>
    </div>
  );
}
