'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';
import { Search, Send, Image as ImageIcon, Video, FileText, ArrowLeft } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) { setConvos([]); setLoading(false); return; }
    loadConvos();
  }, [user]);

  const loadConvos = async () => {
    if (!user) return;
    const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(100);
    if (!data || data.length === 0) {
      const { data: c } = await supabase.from('creators').select('username,display_name,owner_id').limit(10);
      if (c && c.length > 0) {
        const oids = c.map(x => x.owner_id).filter(Boolean);
        const pMap: Record<string, any> = {};
        if (oids.length > 0) {
          const { data: p } = await supabase.from('profiles').select('id,avatar_url').in('id', oids);
          (p || []).forEach(x => { pMap[x.id] = x; });
        }
        setConvos(c.map(cr => ({
          otherId: cr.owner_id || cr.username, display: cr.display_name,
          avatar_url: pMap[cr.owner_id]?.avatar_url || null,
          lastMsg: '点击开始聊天', time: '', unread: 0
        })));
      }
      setLoading(false);
      return;
    }
    const grouped: Record<string, Msg[]> = {};
    data.forEach(m => {
      const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      (grouped[other] ??= []).push(m);
    });
    const otherIds = Object.keys(grouped);
    const { data: profiles } = await supabase.from('profiles').select('id,display_name,avatar_url').in('id', otherIds);
    const pMap: Record<string, any> = {}; (profiles || []).forEach(p => { pMap[p.id] = p; });
    setConvos(Object.entries(grouped).map(([oid, msgs]) => {
      const last = msgs[0], p = pMap[oid] || {};
      return { otherId: oid, display: p.display_name || '用户', avatar_url: p.avatar_url || null,
        lastMsg: last.attachment_type !== 'none' ? `[${last.attachment_type === 'image' ? '图片' : last.attachment_type === 'short' ? '作品' : '帖子'}]` : last.content,
        time: timeAgo(last.created_at), unread: msgs.filter(m => m.sender_id !== user.id && !m.is_read).length };
    }));
    setLoading(false);
  };

  useEffect(() => {
    if (!user || !active) { setMessages([]); return; }
    loadMessages();
    if (msgPollRef.current) clearInterval(msgPollRef.current);
    msgPollRef.current = setInterval(loadMessages, 3000);
    return () => { if (msgPollRef.current) clearInterval(msgPollRef.current); };
  }, [user, active]);

  const loadMessages = async () => {
    if (!user || !active) return;
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${active}),and(sender_id.eq.${active},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
    scrollBottom();
  };

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50);

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
      await supabase.from('messages').insert({ sender_id: user.id, receiver_id: active, content: '', attachment_type: 'image', attachment_preview: publicUrl, is_read: false });
      loadMessages(); loadConvos();
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const activeConvo = convos.find(c => c.otherId === active);

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-black text-white/40">请先登录</div>;

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Sidebar - conversations */}
      <div className={`${active ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-white/10 flex-col shrink-0`}>
        <div className="p-4 border-b border-white/10">
          <h1 className="text-xl font-bold mb-3">消息</h1>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input placeholder="搜索私信" className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#f472b6]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <p className="p-6 text-white/40 text-center text-sm">加载中...</p> :
           convos.length === 0 ? <p className="p-6 text-white/40 text-center text-sm">暂无消息</p> :
           convos.map(c => (
            <button key={c.otherId} onClick={() => setActive(c.otherId)} className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] text-left border-b border-white/[0.04] ${active === c.otherId ? 'bg-white/[0.06]' : ''}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-zinc-800">
                {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" alt="" /> :
                 <span className="text-white/80 font-bold text-sm">{c.display[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline"><span className="font-semibold text-sm truncate">{c.display}</span><span className="text-[10px] text-white/30 shrink-0 ml-2">{c.time}</span></div>
                <p className="text-xs text-white/40 truncate mt-0.5">{c.lastMsg}</p>
              </div>
              {c.unread > 0 && <div className="min-w-[18px] h-[18px] rounded-full bg-[#f472b6] text-white text-[10px] flex items-center justify-center font-bold">{c.unread}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className={`${active ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-black`}>
        {active && activeConvo ? (
          <>
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 shrink-0">
              <button onClick={() => setActive(null)} className="md:hidden p-1 -ml-1"><ArrowLeft className="w-5 h-5" /></button>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0">
                {activeConvo.avatar_url ? <img src={activeConvo.avatar_url} className="w-full h-full object-cover" alt="" /> :
                 <span className="text-white/80 font-bold text-sm">{activeConvo.display[0]}</span>}
              </div>
              <span className="font-bold text-sm">{activeConvo.display}</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && <p className="text-white/30 text-sm text-center py-16">发条消息吧 👋</p>}
              {messages.map(m => {
                const isMe = m.sender_id === user.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#f472b6] text-white rounded-br-md' : 'bg-white/[0.08] text-white rounded-bl-md'}`}>
                      {m.attachment_type === 'image' && m.attachment_preview ? (
                        <img src={m.attachment_preview} className="max-w-[220px] max-h-[200px] rounded-lg object-cover mb-1" alt="" />
                      ) : m.attachment_type === 'short' || m.attachment_type === 'post' ? (
                        <Link href={`/post/${m.attachment_id}`} className="flex items-center gap-2 text-xs bg-black/30 rounded-lg p-2 mb-1">
                          {m.attachment_type === 'short' ? <Video className="w-4 h-4 text-[#f472b6]" /> : <FileText className="w-4 h-4 text-[#f472b6]" />}
                          <span className="text-white/80">{m.content || '查看内容'}</span>
                        </Link>
                      ) : null}
                      {m.content && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>}
                      <p className={`text-[10px] mt-1.5 ${isMe ? 'text-white/50' : 'text-white/25'}`}>{timeAgo(m.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="px-3 py-3 border-t border-white/10 flex items-center gap-2 shrink-0">
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="p-2.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition shrink-0">
                {uploading ? <span className="text-xs">⏳</span> : <ImageIcon className="w-5 h-5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadImage} className="hidden" />
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
                placeholder="输入消息..." className="flex-1 bg-white/5 rounded-full px-5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/[0.08]" />
              <button onClick={sendMsg} disabled={!input.trim()} className="p-2.5 rounded-full bg-[#f472b6] text-white disabled:opacity-30 hover:opacity-90 transition shrink-0"><Send className="w-5 h-5" /></button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20">
            <Send className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-sm">选择对话开始聊天</p>
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
  return new Date(date).toLocaleDateString();
}
