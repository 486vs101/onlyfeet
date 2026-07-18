'use client';

import { useState } from 'react';
import { Post, Creator } from '@/lib/types';
import { Lock, Heart, MessageCircle, ImageIcon, Video } from 'lucide-react';
import { PostModal } from '../shared/post-modal';

type Props = {
  posts: Post[];
  creator: Creator;
  subscribed: boolean;
};

export function PostGrid({ posts, creator, subscribed }: Props) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40 text-[15px]">
        No posts yet
      </div>
    );
  }

  return (
    <>
      <div className="p-2">
        <div className="columns-2 sm:columns-3 gap-2">
          {posts.map((post) => {
            const isLocked = !subscribed && (post.isLocked || post.isPPV);
            const isLiked = likedPosts.has(post.id);

            return (
              <div
                key={post.id}
                className="mb-2 break-inside-avoid cursor-pointer group"
                onClick={() => setSelectedPost(post)}
              >
                <div
                  className="relative rounded-xl overflow-hidden w-full flex items-center justify-center text-white font-bold"
                  style={{ background: post.placeholderColor, aspectRatio: post.type === 'video' ? '9/16' : '3/4' }}
                >
                  <div className="text-center">
                    {post.type === 'video' ? <Video className="w-8 h-8 mx-auto mb-1 opacity-60" /> : <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-60" />}
                    <span className="text-xs text-white/60">{post.type === 'video' ? 'Video' : 'Photo'}</span>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <div className="flex items-center gap-3 text-xs text-white">
                      <span className="flex items-center gap-1">
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-[#f472b6] text-[#f472b6]' : ''}`} />
                        {(post.likes + (isLiked ? 1 : 0)) >= 1000
                          ? ((post.likes + (isLiked ? 1 : 0)) / 1000).toFixed(1) + 'K'
                          : post.likes + (isLiked ? 1 : 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {post.comments}
                      </span>
                    </div>
                  </div>

                  {/* Lock badge */}
                  {isLocked && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-[#f472b6]" />
                    </div>
                  )}

                  {/* PPV price */}
                  {post.isPPV && (
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5 text-[11px] text-white">
                      ${post.ppvPrice}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Post detail modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          creator={creator}
          subscribed={subscribed}
          isLiked={likedPosts.has(selectedPost.id)}
          onToggleLike={() => {
            setLikedPosts((prev) => {
              const next = new Set(prev);
              if (next.has(selectedPost.id)) next.delete(selectedPost.id);
              else next.add(selectedPost.id);
              return next;
            });
          }}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </>
  );
}