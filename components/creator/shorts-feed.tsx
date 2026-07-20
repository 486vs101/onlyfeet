'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Play, ImageIcon } from 'lucide-react';
import { Short, Creator, MediaItem } from '@/lib/types';

type Props = { shorts: Short[]; creator: Creator; subscribed: boolean };

export function ShortsFeed({ shorts, creator, subscribed }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(shorts);
  useEffect(() => { setItems(shorts); }, [shorts]);

  if (items.length === 0) {
    return <div className="flex items-center justify-center h-64 text-white/40 text-sm">暂无短视频</div>;
  }

  return (
    <div className="p-2">
      <div className="columns-2 sm:columns-3 gap-2">
        {items.map((short) => {
          const isGallery = short.type === 'gallery';
          const galleryImgs: MediaItem[] = isGallery ? (short.images || []) : [];
          const coverUrl =
            short.coverUrl ||
            short.thumbnailUrl ||
            (galleryImgs.length > 0 ? galleryImgs[0].url : null) ||
            short.mediaUrl;

          return (
            <div
              key={short.id}
              className="mb-2 break-inside-avoid cursor-pointer group"
              onClick={() => router.push(`/post/${short.id}`)}
            >
              <div className="relative rounded-xl overflow-hidden bg-black">
                {/* 封面 */}
                {coverUrl ? (
                  <img src={coverUrl} className="w-full object-cover" style={{ aspectRatio: '3/4' }} alt="" />
                ) : (
                  <div
                    className="w-full flex items-center justify-center text-white/30"
                    style={{ aspectRatio: '3/4', background: '#000' }}
                  >
                    <ImageIcon className="w-10 h-10" />
                  </div>
                )}

                {/* 类型角标 */}
                {short.type === 'video' && (
                  <div className="absolute top-2 left-2 bg-black/60 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Play className="w-3 h-3 text-white fill-white" />
                  </div>
                )}
                {isGallery && galleryImgs.length > 1 && (
                  <div className="absolute top-2 left-2 bg-black/60 rounded-full px-2 py-0.5 text-white text-xs">
                    {galleryImgs.length} 张
                  </div>
                )}

                {/* Hover 叠加层 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <div className="flex items-center gap-3 text-xs text-white">
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3 fill-white" />
                      {short.stats.views >= 1000
                        ? (short.stats.views / 1000).toFixed(1) + 'K'
                        : short.stats.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {short.stats.likes >= 1000
                        ? (short.stats.likes / 1000).toFixed(1) + 'K'
                        : short.stats.likes}
                    </span>
                  </div>
                </div>

                {/* 锁定 */}
                {(short.isLocked || (short.access === 'partial' && !subscribed)) && (
                  <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 text-[#f472b6] text-xs">
                    🔒
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
