'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';
import { Search, Send, Share2, Image as ImageIcon, Video, FileText } from 'lucide-react';
import Link from 'next/link';

type Convo = { otherId: string; display: string; avatar_url?: string; lastMsg: string; time: string; unread: number };
type Msg = { id: string; sender_id: string; content: string; attachment_type: string; attachment_preview?: string; attachment_id?: string; is_read: boolean; created_at: string };

export default function MessagesPage() {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) { setConvos([]); setLoading(false); return; }
    supabase.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(50)
      .then(async ({ data }) => {
        if (!data || data.length === 0) {
          // Fallback: show creators
          supabase.from('creators').select('username,display_name,owner_id').limit(5)
            .then(async ({ data: c }) => {
              if (!c || c.length === 0) { setLoading(false); return; }
              const oids = c.map(x => x.owner_id).filter(Boolean);
              const pMap: Record<string, any> = {};
              if (oids.length > 0) {
                const { data: p } = await supabase.from('profiles').select('id,avatar_url').in('id', oids);
                (p || []).forEach(x => { pMap[x.id] = x; });
              }
              setConvos(c.map(cr => ({
                otherId: cr.username, display: cr.display_name,
                avatar_url: pMap[cr.owner_id]?.avatar_url || null,
                lastMsg: '点击开始聊天', time: '', unread: 0
              })));
              setLoading(false);
            });
          return;
        }
        // Group by conversation partner
        const grouped: Record<string, Msg[]> = {};
        data.forEach(m => {
          const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;
          if (!grouped[other]) grouped[other] = [];
          grouped[other].push(m);
        });
        // Get profile info for others
        const otherIds = Object.keys(grouped);
        const { data: profiles } = await supabase.from('profiles').select('id,display_name,avatar_url').in('id', otherIds);
        const pMap: Record<string, any> = {}; (profiles || []).forEach(p => { pMap[p.id] = p; });
        const items: Convo[] = Object.entries(grouped).map(([oid, msgs]) => {
          const last = msgs[0];
          const p = pMap[oid] || {};
          return {
            otherId: oid,
            display: p.display_name || '用户',
            avatar_url: p.avatar_url || null,
            lastMsg: last.attachment_type !== 'none' ? `[${last.attachment_type === 'image' ? '图片' : last.attachment_type === 'short' ? '作品' : '帖子'}]` : last.content,
            time: timeAgo(last.created_at),
            unread: msgs.filter(m => m.sender_id !== user.id && !m.is_read).length
          };
        });
        setConvos(items);
        setLoading(false);
      });
  }, [user]);

  // Load messages for active conversation
  useEffect(() => {
    if (!user || !active) { setMessages([]); return; }
    supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},receiver_id.eq.${active}),and(sender_id.eq.${active},receiver_id.eq.${user.id})`).order('created_at', { ascending: true })
      .then(({ data }) => { setMessages(data || []); scrollBottom(); });
  }, [user, active]);

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const sendMsg = async (attachment?: { type: string; id?: string; preview?: string }) => {
    if (!user || !active) return;
    const content = attachment ? '' : input.trim();
    if (!content && !attachment) return;
    await supabase.from('messages').insert({
      sender_id: user.id, receiver_id: active,
      content: content || '',
      attachment_type: attachment?.type || 'none',
      attachment_id: attachment?.id || null,
      attachment_preview: attachment?.preview || null,
    });
    setInput('');
    // Refresh messages
    supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},receiver_id.eq.${active}),and(sender_id.eq.${active},receiver_id.eq.${user.id})`).order('created_at', { ascending: true })
      .then(({ data }) => { setMessages(data || []); scrollBottom(); });
  };

  const activeConvo = convos.find(c => c.otherId === active);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-black text-white/40">请先登录</div>;

  return (
    <div className="flex h-screen-minus-header">
      {/* Conversations list */}
      <div className="w-80 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-xl font-bold mb-2">消息</h1>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input placeholder="搜索私信" className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#f472b6]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <p className="p-4 text-white/40 text-center">加载中...</p> :
           convos.length === 0 ? <p className="p-4 text-white/40 text-center">暂无消息</p> :
           convos.map(c => (
            <button key={c.otherId} onClick={() => setActive(c.otherId)} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] text-left ${active === c.otherId ? 'bg-white/[0.05]' : ''}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold shrink-0 bg-black">
                {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" alt="" /> :
                 <span className="w-full h-full flex items-center justify-center bg-zinc-800">{c.display[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between"><span className="font-bold text-sm truncate">{c.display}</span><span className="text-xs text-white/40">{c.time}</span></div>
                <p className="text-xs text-white/50 truncate">{c.lastMsg}</p>
              </div>
              {c.unread > 0 && <div className="w-5 h-5 rounded-full bg-[#f472b6] text-white text-xs flex items-center justify-center">{c.unread}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {active && activeConvo ? (
          <>
            <div className="p-3 border-b border-white/10 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-black flex items-center justify-center text-white font-bold">
                {activeConvo.avatar_url ? <img src={activeConvo.avatar_url} className="w-full h-full object-cover" alt="" /> :
                 <span className="w-full h-full flex items-center justify-center bg-zinc-800 text-sm">{activeConvo.display[0]}</span>}
              </div>
              <span className="font-bold">{activeConvo.display}</span>
              <Link href={`/creator/${activeConvo.display}`} className="ml-auto text-xs text-[#f472b6]">查看主页</Link>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && <p className="text-white/40 text-center py-10">发条消息开始聊天</p>}
              {messages.map(m => {
                const isMe = m.sender_id === user.id;
                const isAttachment = m.attachment_type !== 'none';
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#f472b6] text-white' : 'bg-white/10 text-white'}`}>
                      {isAttachment ? (
                        <div className="text-sm">
                          {m.attachment_preview ? (
                            <div className="mb-1 rounded-lg overflow-hidden bg-black/30 max-w-[200px]">
                              {m.attachment_type === 'image' ? <img src={m.attachment_preview} className="w-full h-32 object-cover" alt="" /> :
                               m.attachment_type === 'short' || m.attachment_type === 'post' ? (
                                <Link href={`/post/${m.attachment_id}`} className="block p-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    {m.attachment_type === 'short' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                    <span className="text-white/80">{m.content || '查看内容'}</span>
                                  </div>
                                </Link>
                              ) : null}
                            </div>
                          ) : (
                            <span>{m.content}</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      )}
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-white/30'}`}>{timeAgo(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-white/10 flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-white/10 text-white/50" title="分享内容"><Share2 className="w-5 h-5" /></button>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="输入消息..." className="flex-1 bg-white/5 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none" />
              <button onClick={() => sendMsg()} disabled={!input.trim()} className="p-2 rounded-full bg-[#f472b6] text-white disabled:opacity-30"><Send className="w-5 h-5" /></button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            {convos.length > 0 ? '选择一个对话' : '还没有消息'}
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(date: string) {
  if (!date) return '';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}
