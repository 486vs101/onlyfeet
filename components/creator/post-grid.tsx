'use client';

import { useState, useEffect } from 'react';
import { Post, Creator } from '@/lib/types';
import { Lock, Heart, MessageCircle, ImageIcon, Video, Music2, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/use-auth';

type Props = { posts: Post[]; creator: Creator; subscribed: boolean };

export function PostGrid({ posts, creator, subscribed }: Props) {
  const { user } = useAuth();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (posts.length === 0) return;
    const ids = posts.map(p => p.id);
    Promise.all([
      supabase.from('likes').select('post_id').in('post_id', ids),
      supabase.from('comments').select('post_id').in('post_id', ids),
    ]).then(([l, c]) => {
      const lc: Record<string, number> = {}; (l.data || []).forEach(x => { lc[x.post_id] = (lc[x.post_id]||0)+1; });
      const cc: Record<string, number> = {}; (c.data || []).forEach(x => { cc[x.post_id] = (cc[x.post_id]||0)+1; });
      setLikeCounts(lc); setCommentCounts(cc);
    });
    if (user) {
      supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', ids)
        .then(({ data }) => { if (data) setLikedPosts(new Set(data.map(l => l.post_id))); });
    }
  }, [posts, user]);

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const isLiking = !likedPosts.has(postId);
    const next = new Set(likedPosts);
    isLiking ? next.add(postId) : next.delete(postId);
    setLikedPosts(next);
    setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId]||0) + (isLiking ? 1 : -1) }));
    if (isLiking) await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
    else await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
  };

  const loadComments = async (postId: string) => {
    const { data } = await supabase.from('comments').select('*, profiles!comments_user_id_fkey(display_name, avatar_url, avatar_color)').eq('post_id', postId).order('created_at', { ascending: false }).limit(30);
    setComments(data || []);
  };

  const postComment = async (postId: string) => {
    if (!commentText.trim() || !user) return;
    await supabase.from('comments').insert({ user_id: user.id, post_id: postId, content: commentText.trim() });
    setCommentText('');
    setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId]||0) + 1 }));
    loadComments(postId);
  };

  const toggleComments = (postId: string) => {
    if (!user) return;
    if (openComments === postId) { setOpenComments(null); return; }
    setOpenComments(postId);
    loadComments(postId);
  };

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
        const showComments = openComments === post.id;

        return (
          <div key={post.id} className="p-4">
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

            {post.caption && <p className="text-sm mb-3 whitespace-pre-wrap">{post.caption}</p>}

            {!isLocked && (
              (post.mediaUrl || post.coverUrl || galleryImgs.length > 0) ? (
                <div className="mb-3 rounded-xl overflow-hidden bg-black">
                  {isGallery && galleryImgs.length > 0 ? (
                    <div className="relative cursor-pointer" onClick={() => setExpanded(isOpen ? null : post.id)}>
                      <img src={galleryImgs[0].url} className="w-full max-h-96 object-contain" alt="" />
                      <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-0.5 text-xs text-white">{galleryImgs.length} 张</div>
                      {isOpen && (<div className="mt-1 grid grid-cols-2 gap-1">{galleryImgs.slice(1).map((img, i) => (<img key={i} src={img.url} className="w-full max-h-48 object-contain" alt="" />))}</div>)}
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
                <div className="mb-3 rounded-xl bg-black flex items-center justify-center h-48 text-white/20">
                  <div className="text-center">{post.type === 'video' ? <Video className="w-10 h-10 mx-auto opacity-30" /> : <ImageIcon className="w-10 h-10 mx-auto opacity-30" />}</div>
                </div>
              )
            )}

            {isLocked && (
              <div className="mb-3 rounded-xl bg-[#1a1a2e] flex items-center justify-center h-48">
                <div className="text-center"><Lock className="w-8 h-8 mx-auto mb-2 text-[#f472b6]" /><p className="text-white/60 text-sm">付费内容</p>{post.ppvPrice && <p className="text-[#f472b6] text-xs mt-1">${post.ppvPrice}</p>}</div>
              </div>
            )}

            {post.bgmTitle && (<div className="flex items-center gap-1.5 text-white/50 text-xs mb-3"><Music2 className="w-3 h-3" /><span>{post.bgmTitle} · {post.bgmArtist}</span></div>)}
            {post.hashtags.length > 0 && (<p className="text-[#f472b6] text-sm mb-3">{post.hashtags.map((h) => `#${h}`).join(' ')}</p>)}

            <div className="flex items-center gap-5 text-white/60 text-sm">
              <button onClick={() => toggleLike(post.id)} className="flex items-center gap-1.5 hover:text-white">
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-[#f472b6] text-[#f472b6]' : ''}`} />
                <span>{likeCounts[post.id] || 0}</span>
              </button>
              <button onClick={() => toggleComments(post.id)} className="flex items-center gap-1.5 hover:text-white">
                <MessageCircle className={`w-4 h-4 ${showComments ? 'text-[#f472b6]' : ''}`} />
                <span>{commentCounts[post.id] || 0}</span>
              </button>
            </div>

            {/* 评论区 */}
            {showComments && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment(post.id)} placeholder="说点什么..."
                    className="flex-1 bg-white/5 rounded-full px-3 py-1.5 text-white text-xs outline-none placeholder:text-white/30" />
                  <button onClick={() => postComment(post.id)} disabled={!commentText.trim()} className="text-[#f472b6] disabled:text-white/20"><Send className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {comments.length === 0 ? <p className="text-white/30 text-xs text-center py-2">暂无评论</p> :
                    comments.map((c: any) => (
                      <div key={c.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: c.profiles?.avatar_color }}>
                          {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : c.profiles?.display_name?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1"><span className="text-white text-[11px] font-bold">{c.profiles?.display_name || '用户'}</span><span className="text-white/30 text-[9px]">{new Date(c.created_at).toLocaleDateString()}</span></div>
                          <p className="text-white/70 text-[11px] mt-0.5">{c.content}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
