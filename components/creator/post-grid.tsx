'use client';

import { useState } from 'react';
import { Post, Creator } from '@/lib/types';
import { Lock, Heart, MessageCircle, ImageIcon, Video, Music2 } from 'lucide-react';

type Props = { posts: Post[]; creator: Creator; subscribed: boolean };

export function PostGrid({ posts, creator, subscribed }: Props) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  if (posts.length === 0) {
    return <div className="flex items-center justify-center h-64 text-white/40 text-sm">暂无帖子</div>;
  }

  return (
    <div className="divide-y divide-white/5">
      {posts.map((post) => {
        const isLocked = !subscribed && (post.isLocked || post.isPPV);
        const isLiked = likedPosts.has(post.id);
        const isOpen = expanded === post.id;
        const isGallery = post.type === 'gallery';
        const galleryImgs = isGallery ? (post.images || []) : [];

        return (
          <div key={post.id} className="p-4">
            {/* Header: avatar + name + date */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-black flex-shrink-0">
                {creator.avatarUrl ? (
                  <img src={creator.avatarUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold" style={{ background: creator.avatarColor }}>
                    {creator.displayName[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm">{creator.displayName}</span>
                  {creator.verified && <span className="text-[#f472b6] text-xs">✓</span>}
                </div>
                <span className="text-white/40 text-xs">@{creator.username} · {post.createdAt}</span>
              </div>
            </div>

            {/* Caption */}
            {post.caption && <p className="text-sm mb-3 whitespace-pre-wrap">{post.caption}</p>}

            {/* Media */}
            {!isLocked && (
              (post.mediaUrl || post.coverUrl || galleryImgs.length > 0) ? (
                <div className="mb-3 rounded-xl overflow-hidden bg-black">
                  {isGallery && galleryImgs.length > 0 ? (
                    // Gallery: show first image + count
                    <div className="relative cursor-pointer" onClick={() => setExpanded(isOpen ? null : post.id)}>
                      <img src={galleryImgs[0].url} className="w-full max-h-96 object-contain" alt="" />
                      <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 text-xs text-white">
                        {galleryImgs.length} 张
                      </div>
                      {isOpen && (
                        <div className="mt-1 grid grid-cols-2 gap-1">
                          {galleryImgs.slice(1).map((img, i) => (
                            <img key={i} src={img.url} className="w-full max-h-48 object-contain" alt="" />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : post.mediaUrl && post.type === 'video' ? (
                    <video src={post.mediaUrl} className="w-full max-h-96 object-contain" controls preload="metadata" />
                  ) : post.mediaUrl ? (
                    <img src={post.mediaUrl} className="w-full max-h-96 object-contain" alt="" />
                  ) : post.coverUrl ? (
                    <img src={post.coverUrl} className="w-full max-h-96 object-contain" alt="" />
                  ) : null}
                </div>
              ) : (
                <div className="mb-3 rounded-xl overflow-hidden bg-black flex items-center justify-center h-48 text-white/20">
                  <div className="text-center">
                    {post.type === 'video' ? <Video className="w-10 h-10 mx-auto opacity-30" /> : <ImageIcon className="w-10 h-10 mx-auto opacity-30" />}
                  </div>
                </div>
              )
            )}

            {/* Locked overlay */}
            {isLocked && (
              <div className="mb-3 rounded-xl bg-[#1a1a2e] flex items-center justify-center h-48">
                <div className="text-center">
                  <Lock className="w-8 h-8 mx-auto mb-2 text-[#f472b6]" />
                  <p className="text-white/60 text-sm">付费内容</p>
                  {post.ppvPrice && <p className="text-[#f472b6] text-xs mt-1">${post.ppvPrice}</p>}
                </div>
              </div>
            )}

            {/* BGM */}
            {post.bgmTitle && (
              <div className="flex items-center gap-1.5 text-white/50 text-xs mb-3">
                <Music2 className="w-3 h-3" />
                <span>{post.bgmTitle} · {post.bgmArtist}</span>
              </div>
            )}

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <p className="text-[#f472b6] text-sm mb-3">{post.hashtags.map((h) => `#${h}`).join(' ')}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-5 text-white/60 text-sm">
              <button onClick={() => setLikedPosts((prev) => {
                const next = new Set(prev);
                isLiked ? next.delete(post.id) : next.add(post.id);
                return next;
              })} className="flex items-center gap-1.5 hover:text-white">
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#f472b6] text-[#f472b6]' : ''}`} />
                <span>{post.likes + (isLiked ? 1 : 0)}</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-white">
                <MessageCircle className="w-4 h-4" />
                <span>{post.comments}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
