'use client';

import { useEffect, useState } from 'react';
import { Send, Search, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/use-auth';

type Convo = { id: string; username: string; display: string; avatar_color: string; avatar_url?: string; last_message: string; time: string; unread: boolean; };

export default function MessagesPage() {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<{ id: number; from: string; text: string; time: string }[]>([]);

  useEffect(() => {
    if (!user) { setConvos([]); setLoading(false); return; }
    // Try real messages table
    supabase.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const grouped: Record<string, any> = {};
          data.forEach((m: any) => {
            const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
            if (!grouped[otherId]) grouped[otherId] = { messages: [], otherId };
            grouped[otherId].messages.push(m);
          });
          // Fetch profiles for the other users
          const otherIds = Object.keys(grouped);
          supabase.from('profiles').select('id, display_name, avatar_color, avatar_url').in('id', otherIds)
            .then(({ data: profiles }) => {
              const profileMap: Record<string, any> = {};
              (profiles || []).forEach(p => { profileMap[p.id] = p; });
              const items: Convo[] = Object.values(grouped).map((g: any) => {
                const p = profileMap[g.otherId] || {};
                const last = g.messages[0];
                return {
                  id: g.otherId,
                  username: p.display_name || '用户',
                  display: p.display_name || '用户',
                  avatar_color: p.avatar_color || '#f472b6',
                  avatar_url: p.avatar_url,
                  last_message: last.content,
                  time: timeAgo(last.created_at),
                  unread: last.sender_id !== user.id && !last.is_read,
                };
              });
              setConvos(items);
              setLoading(false);
            });
        } else {
          // Fallback: show creators with real avatars
          supabase.from('creators').select('username, display_name, avatar_color, owner_id').limit(5)
            .then(async ({ data: c }) => {
              if (!c || c.length === 0) { setLoading(false); return; }
              const ownerIds = c.map(x => x.owner_id).filter(Boolean);
              const pMap: Record<string, any> = {};
              if (ownerIds.length > 0) {
                const { data: p } = await supabase.from('profiles').select('id, avatar_url').in('id', ownerIds);
                (p || []).forEach(x => { pMap[x.id] = x; });
              }
              setConvos((c || []).map((cr: any) => ({
                id: cr.username, username: cr.username, display: cr.display_name,
                avatar_color: cr.avatar_color,
                avatar_url: pMap[cr.owner_id]?.avatar_url || null,
                last_message: '点击开始聊天', time: '', unread: false,
              })));
              setLoading(false);
            });
        }
      });
  }, [user]);

  const openConvo = (id: string) => {
    setActive(id);
    if (!user) return;
    const otherId = id;
    supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMsgs((data || []).map((m: any) => ({
          id: m.id ? parseInt(m.id.substring(0, 8), 16) : Date.now(),
          from: m.sender_id === user.id ? 'me' : otherId,
          text: m.content,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        })));
      });
  };

  const send = async () => {
    if (!input.trim() || !active || !user) return;
    const text = input.trim();
    setMsgs((m) => [...m, { id: Date.now(), from: 'me', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setInput('');
    await supabase.from('messages').insert({ sender_id: user.id, receiver_id: active, content: text });
  };

  if (!user) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="text-center text-white/30">
        <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg">登录后查看消息</p>
        <a href="/login" className="mt-4 inline-block px-6 py-2 rounded-full bg-[#f472b6] text-white text-sm font-bold">去登录</a>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-0px)]">
      <div className={`${active ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-[340px] border-r border-white/10`}>
        <div className="sticky top-0 z-30 top-sticky border-b border-white/10 px-4 py-3">
          <h1 className="text-xl font-bold">消息</h1>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input placeholder="搜索私信" className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#f472b6]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? <p className="p-8 text-center text-white/30">加载中...</p> :
            convos.length === 0 ? <p className="p-8 text-center text-white/30">暂无消息</p> :
              convos.map(c => (
                <button key={c.id} onClick={() => openConvo(c.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] text-left">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg shrink-0 bg-black">
                    {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" alt="" /> :
                      <span className="w-full h-full flex items-center justify-center bg-zinc-800">{c.display[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between"><p className="font-bold text-[15px] truncate">{c.display}</p><span className="text-xs text-white/40">{c.time}</span></div>
                    <p className="text-sm text-white/50 truncate">{c.last_message}</p>
                  </div>
                  {c.unread && <div className="w-2.5 h-2.5 rounded-full bg-[#f472b6] shrink-0" />}
                </button>
              ))}
        </div>
      </div>
      <div className={`${active ? 'flex' : 'hidden sm:flex'} flex-col flex-1`}>
        {active ? (
          <>
            <div className="sticky top-0 z-30 top-sticky border-b border-white/10 px-4 py-3 flex items-center gap-3">
              <button onClick={() => setActive(null)} className="sm:hidden text-white/60">←</button>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#f472b6] flex items-center justify-center text-white font-bold">
                {active[0]?.toUpperCase()}
              </div>
              <p className="font-bold text-sm">{active}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.map(m => (
                <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${m.from === 'me' ? 'bg-[#f472b6] text-white' : 'bg-white/10 text-white'}`}>
                    <p className="text-sm">{m.text}</p>
                    <p className={`text-[11px] mt-0.5 ${m.from === 'me' ? 'text-white/60' : 'text-white/40'}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 p-3 flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="输入消息..."
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#f472b6]" />
              <button onClick={send} className="w-10 h-10 rounded-full bg-[#f472b6] flex items-center justify-center"><Send className="w-4 h-4 text-white" /></button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/20">
            <div className="text-center"><Mail className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="text-sm">选择一条私信开始聊天</p></div>
          </div>
        )}
      </div>
    </div>
  );
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚'; if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}小时前`;
  return `${Math.floor(h / 24)}天前`;
}
