'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Lock, ArrowLeft, Music2 } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';

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
  bgm_url?: string;
  bgm_title?: string;
  bgm_artist?: string;
  images?: Media[]; // 图集(多张图)
  slide_duration?: number;
  created_at: string;
};

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [post, setPost] = useState<Short | null>(null);
  const [creator, setCreator] = useState<any>(null);
  const [index, setIndex] = useState(0); // 图集当前页
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('shorts').select('*').eq('id', id).single()
      .then(({ data }) => {
        setPost(data);
        if (data) {
          supabase.from('creators').select('*').eq('id', data.creator_id).single()
            .then(({ data: c }) => setCreator(c));
        }
        setLoading(false);
      });
    // 检查是否点过赞
    if (user) {
      supabase.from('likes').select('id').eq('user_id', user.id).eq('short_id', id).maybeSingle()
        .then(({ data }) => setLiked(!!data));
    }
  }, [id, user]);

  // 图集自动轮播
  useEffect(() => {
    if (!post || post.type !== 'gallery' || !post.images || post.images.length <= 1) return;
    const dur = (post.images[index]?.duration || post.slide_duration || 3) * 1000;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % post.images!.length);
    }, dur);
    return () => clearTimeout(t);
  }, [index, post]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white/50">加载中...</div>;
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white/70">
        <div className="text-center">
          <p className="mb-4">作品不存在</p>
          <Link href="/shorts" className="text-[#f472b6] hover:underline">返回</Link>
        </div>
      </div>
    );
  }

  const toggleLike = async () => {
    if (!user) { window.location.href = '/login'; return; }
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('short_id', post.id);
      setLiked(false);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, short_id: post.id });
      setLiked(true);
    }
  };

  const isGallery = post.type === 'gallery' && post.images && post.images.length > 0;
  const currentMedia = isGallery ? post.images![index].url : post.media_url;

  return (
    <div className="min-h-screen bg-black pb-12">
      {/* 顶部返回 */}
      <div className="sticky top-0 z-30 top-sticky border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/70 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">作品</h1>
      </div>

      {/* 媒体区 */}
      <div className="relative bg-black">
        <div className="aspect-square max-h-[70vh] mx-auto" style={{ background: post.placeholder_color }}>
          {isGallery ? (
            <img src={currentMedia} className="w-full h-full object-contain" alt="" />
          ) : post.media_url ? (
            <video src={post.media_url} className="w-full h-full object-contain" controls autoPlay loop />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40">无媒体</div>
          )}
          {post.is_locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <Lock className="w-12 h-12 mx-auto mb-2 text-white" />
                <p className="text-white font-bold">付费内容</p>
                <p className="text-white/70 text-sm mt-1">解锁 ${post.ppv_price}</p>
              </div>
            </div>
          )}
        </div>

        {/* 图集指示器 */}
        {isGallery && post.images!.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {post.images!.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 创作者信息 */}
      {creator && (
        <Link href={`/creator/${creator.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: creator.avatar_color }}>
            {creator.display_name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[15px]">{creator.display_name}</span>
              {creator.verified && <span className="text-[#f472b6] text-sm">✓</span>}
            </div>
            <span className="text-white/60 text-xs">@{creator.username}</span>
          </div>
          <button className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white text-sm font-bold">
            订阅
          </button>
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
        <button className="flex items-center gap-1.5 text-white/80 hover:text-white">
          <Share2 className="w-5 h-5" />
          <span className="text-sm">{post.shares}</span>
        </button>
      </div>
    </div>
  );
}
