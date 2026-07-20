'use client';

import { Post, Creator } from '@/lib/types';
import { Heart, MessageCircle, Share2, Lock, X, ImageIcon, Video } from 'lucide-react';

type Props = {
  post: Post;
  creator: Creator;
  subscribed: boolean;
  isLiked: boolean;
  onToggleLike: () => void;
  onClose: () => void;
};

export function PostModal({ post, creator, subscribed, isLiked, onToggleLike, onClose }: Props) {
  const isLocked = !subscribed && (post.isLocked || post.isPPV);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-black border border-white/10 rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media placeholder */}
        <div
          className="w-full flex items-center justify-center text-white"
          style={{
            background: isLocked ? '#1a1a2e' : '#000',
            aspectRatio: post.type === 'video' ? '9/16' : '4/5',
          }}
        >
          {isLocked ? (
            <div className="text-center p-8">
              <Lock className="w-12 h-12 mx-auto mb-3 text-[#f472b6]" />
              <p className="text-white font-bold text-lg mb-1">
                {post.isPPV ? `Unlock for $${post.ppvPrice}` : '订阅后查看'}
              </p>
              <p className="text-white/60 text-sm">
                Subscribe @{creator.username} for ${creator.subscriptionPrice}/mo
              </p>
            </div>
          ) : (
            <div className="text-center opacity-60">
              {post.type === 'video' ? <Video className="w-16 h-16 mx-auto mb-2" /> : <ImageIcon className="w-16 h-16 mx-auto mb-2" />}
              <span className="text-sm">{post.type === 'video' ? 'Video post' : 'Photo post'}</span>
            </div>
          )}
        </div>

        {/* Close button */}
        <button onClick={onClose} className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm rounded-full p-1.5">
          <X className="w-5 h-5" />
        </button>

        {/* Info */}
        <div className="p-4">
          {/* Creator row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: creator.avatarColor }}>
              {creator.displayName[0]}
            </div>
            <div>
              <p className="text-[15px] font-bold flex items-center gap-1">
                {creator.displayName}
                {creator.verified && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#f472b6] text-[10px] font-bold text-white">✓</span>}
              </p>
              <p className="text-[13px] text-white/50">@{creator.username}</p>
            </div>
          </div>

          {/* Caption */}
          <p className="text-[15px] mb-2">{post.caption}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.hashtags.map((t) => <span key={t} className="text-[#f472b6] text-sm">{t}</span>)}
          </div>
          <p className="text-[13px] text-white/40 mb-4">{post.createdAt} ago</p>

          {/* Stats bar */}
          <div className="flex items-center gap-4 py-3 border-t border-white/10 text-[13px] text-white/50">
            <span><b className="text-white">{(post.likes + (isLiked ? 1 : 0)).toLocaleString()}</b> 点赞</span>
            <span><b className="text-white">{post.comments}</b> 评论</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-around py-2 border-t border-white/10">
            <button onClick={onToggleLike} className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/[0.08] transition-colors">
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#f472b6] text-[#f472b6]' : ''}`} />
              <span className="text-sm">{isLiked ? '已点赞' : '点赞'}</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/[0.08] transition-colors">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">Comment</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-white/[0.08] transition-colors">
              <Share2 className="w-5 h-5" />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}