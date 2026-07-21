'use client';

import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Comment = any;

export function CommentItem({ c, fk, targetId, userId, onRefresh }: {
  c: Comment; fk: string; targetId: string; userId?: string; onRefresh: () => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<Comment[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replyCount, setReplyCount] = useState(0);

  const loadReplies = async () => {
    const { data, count } = await supabase.from('comments')
      .select('*, profiles!comments_user_id_fkey(display_name, avatar_url, avatar_color)', { count: 'exact' })
      .eq('parent_id', c.id).order('created_at', { ascending: true });
    setReplies(data || []);
    setReplyCount(count || 0);
    setShowReplies(true);
  };

  const postReply = async () => {
    if (!replyText.trim() || !userId) return;
    await supabase.from('comments').insert({
      user_id: userId, parent_id: c.id, content: replyText.trim(),
      [fk]: targetId,
    });
    setReplyText(''); setShowReply(false);
    setReplyCount(prev => prev + 1);
    loadReplies();
    onRefresh();
  };

  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold" style={{ background: c.profiles?.avatar_color }}>
        {c.profiles?.avatar_url ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : c.profiles?.display_name?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-xs font-bold">{c.profiles?.display_name || '用户'}</span>
          <span className="text-white/30 text-[10px]">{new Date(c.created_at).toLocaleDateString()}</span>
        </div>
        <p className="text-white/80 text-xs mt-0.5">{c.content}</p>
        <div className="flex items-center gap-3 mt-1">
          <button onClick={() => setShowReply(!showReply)} className="text-white/30 text-[10px] hover:text-white/60">回复</button>
          {(replyCount > 0 || c.reply_count > 0) && !showReplies && (
            <button onClick={loadReplies} className="text-white/30 text-[10px] hover:text-white/60">
              查看 {replyCount || c.reply_count || 0} 条回复
            </button>
          )}
          {showReplies && (
            <button onClick={() => setShowReplies(false)} className="text-white/30 text-[10px] hover:text-white/60">收起回复</button>
          )}
        </div>
        {/* Reply input */}
        {showReply && (
          <div className="mt-2 flex items-center gap-1.5">
            <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && postReply()}
              placeholder={`回复 ${c.profiles?.display_name || '用户'}...`}
              className="flex-1 bg-white/5 rounded-full px-3 py-1 text-white text-[11px] outline-none placeholder:text-white/20" />
            <button onClick={postReply} disabled={!replyText.trim()} className="text-[#f472b6] text-[11px] disabled:text-white/20 font-bold">发送</button>
          </div>
        )}
        {/* Nested replies */}
        {showReplies && replies.length > 0 && (
          <div className="mt-2 pl-4 border-l border-white/10 space-y-2">
            {replies.map((r: any) => (
              <CommentItem key={r.id} c={r} fk={fk} targetId={targetId} userId={userId} onRefresh={onRefresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentSection({ targetId, fk, userId, onCountChange }: {
  targetId: string; fk: 'short_id' | 'post_id'; userId?: string; onCountChange?: (delta: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('comments')
      .select('*, profiles!comments_user_id_fkey(display_name, avatar_url, avatar_color)')
      .eq(fk, targetId).is('parent_id', null)
      .order('created_at', { ascending: false }).limit(30);
    setComments(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [targetId]);

  const post = async () => {
    if (!text.trim() || !userId) return;
    await supabase.from('comments').insert({ user_id: userId, [fk]: targetId, content: text.trim() });
    setText('');
    onCountChange?.(1);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && post()}
          placeholder="说点什么..."
          className="flex-1 bg-white/5 rounded-full px-3 py-1.5 text-white text-xs outline-none placeholder:text-white/30" />
        <button onClick={post} disabled={!text.trim()} className="text-[#f472b6] text-xs font-bold disabled:text-white/20">发送</button>
      </div>
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {loading ? <p className="text-white/30 text-xs text-center py-4">加载中...</p> :
          comments.length === 0 ? <p className="text-white/30 text-xs text-center py-4">暂无评论</p> :
            comments.map((c: any) => (
              <CommentItem key={c.id} c={c} fk={fk} targetId={targetId} userId={userId} onRefresh={load} />
            ))}
      </div>
    </div>
  );
}
