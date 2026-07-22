'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';
import { Search, Send, Image as ImageIcon, ArrowLeft, Video, FileText } from 'lucide-react';
import Link from 'next/link';

type Convo = { otherId: string; display: string; username: string; avatar_url?: string; lastMsg: string; time: string; unread: number };
type Msg = { id: string; sender_id: string; content: string; attachment_type: string; attachment_preview?: string; attachment_id?: string; is_read: boolean; created_at: string };

export default function MessagesPage() {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load conversations
  useEffect(() => {
    if (!user) { setConvos([]); setLoading(false); return; }
    loadConvos();
  }, [user]);

  const loadConvos = async () => {
    if (!user) return;
    const { data } = await supabase.from('messages').select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false }).limit(100);
    if (!data || data.length === 0) {
      const { data: c } = await supabase.from('creators').select('username,display_name,owner_id').limit(10);
      if (c && c.length > 0) {
        const oids = c.map(x => x.owner_id).filter(Boolean);
        const pMap: Record<string, any> = {};
        if (oids.length > 0) {
          const { data: p } = await supabase.from('profiles').select('id,username,avatar_url').in('id', oids);
          (p || []).forEach(x => { pMap[x.id] = x; });
        }
        setConvos(c.map(cr => ({
          otherId: cr.owner_id || cr.username,
          display: cr.display_name,
          username: pMap[cr.owner_id]?.username || cr.username,
          avatar_url: pMap[cr.owner_id]?.avatar_url || null,
          lastMsg: '发送消息', time: '', unread: 0
        })));
      }
      setLoading(false); return;
    }
    const grouped: Record<string, Msg[]> = {};
    data.forEach(m => { const other = m.sender_id === user.id ? m.receiver_id : m.sender_id; (grouped[other] ??= []).push(m); });
    const otherIds = Object.keys(grouped);
    const { data: profiles } = await supabase.from('profiles').select('id,display_name,username,avatar_url').in('id', otherIds);
    const pMap: Record<string, any> = {}; (profiles || []).forEach(p => { pMap[p.id] = p; });
    setConvos(Object.entries(grouped).map(([oid, msgs]) => {
      const last = msgs[0], p = pMap[oid] || {};
      return { otherId: oid, display: p.display_name || '用户', username: p.username || '',
        avatar_url: p.avatar_url || null,
        lastMsg: last.attachment_type !== 'none' ? `📎 ${last.attachment_type === 'image' ? '图片' : '媒体'}` : (last.content || ''),
        time: timeAgo(last.created_at), unread: msgs.filter(m => m.sender_id !== user.id && !m.is_read).length };
    }));
    setLoading(false);
  };

  // Messages for active conversation
  useEffect(() => {
    if (!user || !active) { setMessages([]); return; }
    loadMessages();
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(loadMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user, active]);

  const loadMessages = async () => {
    if (!user || !active) return;
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${active}),and(sender_id.eq.${active},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  };

  const sendMsg = async () => {
    if (!user || !active || !input.trim()) return;
    setInput('');
    await supabase.from('messages').insert({ sender_id: user.id, receiver_id: active, content: input.trim(), attachment_type: 'none' });
    loadMessages(); loadConvos();
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !active) return;
    setUploading(true);
    const path = `messages/${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('messages').insert({ sender_id: user.id, receiver_id: active, content: '', attachment_type: 'image', attachment_preview: publicUrl });
      loadMessages(); loadConvos();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const activeConvo = convos.find(c => c.otherId === active);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-black text-[15px] text-white/40">请先登录</div>;

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Left: Convo list */}
      <div className={`${active ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] border-r border-white/[0.08] flex-col shrink-0`}>
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold mb-3">消息</h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/30" />
            <input placeholder="搜索私信" className="w-full bg-white/[0.06] border border-white/[0.08] rounded-full h-11 pl-12 pr-5 text-[15px] text-white placeholder:text-white/25 outline-none focus:bg-black focus:border-[#1d9bf0]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? <p className="p-8 text-white/30 text-center text-[15px]">加载中...</p> :
           convos.length === 0 ? <div className="p-8 text-center"><p className="text-white/30 text-[15px] mb-1">欢迎来到私信</p><p className="text-white/20 text-[13px]">从发现页找到创作者，开始聊天</p></div> :
           convos.map(c => (
            <button key={c.otherId} onClick={() => setActive(c.otherId)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.03] text-left transition-colors ${active === c.otherId ? 'bg-white/[0.06] border-r-2 border-[#1d9bf0]' : ''}`}>
              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-[#1d9bf0] flex items-center justify-center">
                {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" alt="" /> :
                 <span className="text-white font-bold text-[15px]">{c.display[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[15px] truncate">{c.display}</span>
                  {c.username && <span className="text-white/40 text-[15px] truncate">@{c.username}</span>}
                  <span className="text-[13px] text-white/30 ml-auto shrink-0">{c.time}</span>
                </div>
                <p className="text-[15px] text-white/50 truncate mt-0.5">{c.lastMsg || '发送消息'}</p>
              </div>
              {c.unread > 0 && <div className="min-w-[8px] h-[8px] rounded-full bg-[#1d9bf0] mt-1.5 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Chat */}
      <div className={`${active ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-black`}>
        {active && activeConvo ? (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-3 shrink-0">
              <button onClick={() => setActive(null)} className="md:hidden p-1.5 -ml-1.5 rounded-full hover:bg-white/[0.08]"><ArrowLeft className="w-5 h-5" /></button>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1d9bf0] flex items-center justify-center shrink-0">
                {activeConvo.avatar_url ? <img src={activeConvo.avatar_url} className="w-full h-full object-cover" alt="" /> :
                 <span className="text-white font-bold text-sm">{activeConvo.display[0]}</span>}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[15px] truncate">{activeConvo.display}</p>
                {activeConvo.username && <p className="text-[13px] text-white/40 truncate">@{activeConvo.username}</p>}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
              {messages.length === 0 && (
                <div className="text-center py-20"><p className="text-white/25 text-[15px]">发送一条消息开始对话</p></div>
              )}
              {messages.map(m => {
                const isMe = m.sender_id === user.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#1d9bf0] text-white' : 'bg-[#2f3336] text-white'}`}
                      style={isMe ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }}>
                      {m.attachment_type === 'image' && m.attachment_preview ? (
                        <img src={m.attachment_preview} className="max-w-[240px] max-h-[240px] rounded-xl object-cover mb-1.5" alt="" />
                      ) : m.attachment_type !== 'none' ? (
                        <div className="flex items-center gap-2 text-[13px] py-1">
                          <Video className="w-4 h-4 opacity-70" /><span>附件</span>
                        </div>
                      ) : null}
                      {m.content && <p className="text-[15px] leading-[1.4] whitespace-pre-wrap break-words">{m.content}</p>}
                      <p className={`text-[11px] mt-1.5 ${isMe ? 'text-white/60' : 'text-white/35'}`}>{timeAgo(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-white/[0.08] flex items-center gap-3 shrink-0">
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="p-2 rounded-full hover:bg-white/[0.08] text-[#1d9bf0] transition shrink-0">
                <ImageIcon className="w-[22px] h-[22px]" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} className="hidden" />
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="开始新的消息" className="flex-1 bg-transparent h-11 text-[15px] text-white placeholder:text-white/30 outline-none" />
              <button onClick={sendMsg} disabled={!input.trim()}
                className="p-2 rounded-full text-[#1d9bf0] disabled:text-white/20 hover:bg-white/[0.08] transition shrink-0">
                <Send className="w-[22px] h-[22px]" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/15">
            <svg viewBox="0 0 24 24" className="w-16 h-16 mb-5 fill-current"><path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z"/></svg>
            <p className="text-[19px] font-bold text-white/30 mb-1">选择一个对话</p>
            <p className="text-[13px] text-white/15">从左侧选择对话开始发送私信</p>
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
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时`;
  if (diff < 7*86400) return `${Math.floor(diff / 86400)}天`;
  return new Date(date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}
