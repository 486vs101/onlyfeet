'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Play, ImageIcon, MessageCircle } from 'lucide-react';
import { Short, Creator, MediaItem } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/use-auth';

type Props = { shorts: Short[]; creator: Creator; subscribed: boolean };

export function ShortsFeed({ shorts, creator, subscribed }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState(shorts);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => { setItems(shorts); }, [shorts]);

  // 加载真实计数
  useEffect(() => {
    if (shorts.length === 0) return;
    const ids = shorts.map(s => s.id);
    Promise.all([
      supabase.from('likes').select('short_id').in('short_id', ids),
      supabase.from('comments').select('short_id').in('short_id', ids),
    ]).then(([l, c]) => {
      const lc: Record<string, number> = {}; (l.data || []).forEach(x => { lc[x.short_id] = (lc[x.short_id]||0)+1; });
      const cc: Record<string, number> = {}; (c.data || []).forEach(x => { cc[x.short_id] = (cc[x.short_id]||0)+1; });
      setLikeCounts(lc); setCommentCounts(cc);
    });
    if (user) {
      supabase.from('likes').select('short_id').eq('user_id', user.id).in('short_id', ids)
        .then(({ data }) => { if (data) setLikedIds(new Set(data.map(l => l.short_id))); });
    }
  }, [shorts, user]);

  const toggleLike = async (shortId: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (!user) { router.push('/login'); return; }
    const isLiking = !likedIds.has(shortId);
    const next = new Set(likedIds);
    isLiking ? next.add(shortId) : next.delete(shortId);
    setLikedIds(next);
    setLikeCounts(prev => ({ ...prev, [shortId]: (prev[shortId]||0) + (isLiking ? 1 : -1) }));
    if (isLiking) await supabase.from('likes').insert({ user_id: user.id, short_id: shortId });
    else await supabase.from('likes').delete().eq('user_id', user.id).eq('short_id', shortId);
  };

  if (items.length === 0) {
    return <div className="flex items-center justify-center h-64 text-white/40 text-sm">暂无短视频</div>;
  }

  return (
    <div className="p-2">
      <div className="columns-2 sm:columns-3 gap-2">
        {items.map((short) => {
          const isGallery = short.type === 'gallery';
          const galleryImgs: MediaItem[] = isGallery ? (short.images || []) : [];
          const coverUrl = short.coverUrl || short.thumbnailUrl || (galleryImgs.length > 0 ? galleryImgs[0].url : null) || short.mediaUrl;

          return (
            <div key={short.id} className="mb-2 break-inside-avoid cursor-pointer group" onClick={() => router.push(`/post/${short.id}`)}>
              <div className="relative rounded-xl overflow-hidden bg-black">
                {coverUrl ? (
                  <img src={coverUrl} className="w-full object-cover" style={{ aspectRatio: '3/4' }} alt="" />
                ) : (
                  <div className="w-full flex items-center justify-center text-white/30" style={{ aspectRatio: '3/4', background: short.placeholderColor }}>
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}
                {short.type === 'video' && (
                  <div className="absolute top-2 left-2 bg-black/60 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Play className="w-3 h-3 text-white fill-white" />
                  </div>
                )}
                {isGallery && galleryImgs.length > 1 && (
                  <div className="absolute top-2 left-2 bg-black/60 rounded-full px-2 py-0.5 text-white text-xs">{galleryImgs.length} 张</div>
                )}
                {/* Hover 叠加层 + 互动按钮 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <div className="flex items-center justify-between text-xs text-white">
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => toggleLike(short.id, e)} className="flex items-center gap-1 hover:text-[#f472b6]">
                        <Heart className={`w-3.5 h-3.5 ${likedIds.has(short.id) ? 'fill-[#f472b6] text-[#f472b6]' : ''}`} />
                        <span>{likeCounts[short.id] || 0}</span>
                      </button>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{commentCounts[short.id] || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
                {(short.isLocked || (short.access === 'partial' && !subscribed)) && (
                  <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 text-[#f472b6] text-xs">🔒</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
