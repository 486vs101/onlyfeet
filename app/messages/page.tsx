'use client';

import { useEffect, useState } from 'react';
import { Send, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Conversation = {
  id: string;
  username: string;
  display: string;
  avatar_color: string;
  last_message: string;
  time: string;
  unread: boolean;
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ id: number; from: string; text: string; time: string }[]>([]);

  useEffect(() => {
    supabase.from('creators').select('username, display_name, avatar_color').limit(5)
      .then(({ data }) => {
        if (!data) return;
        const convos: Conversation[] = data.map((c: any, i: number) => ({
          id: c.username,
          username: c.username,
          display: c.display_name,
          avatar_color: c.avatar_color,
          last_message: ['谢谢你的支持!', '新内容明天发布', '有什么想看的吗?', '感谢订阅!', '可以看看我的置顶'][i % 5],
          time: ['2h', '5h', '1d', '2d', '3d'][i % 5],
          unread: i === 0,
        }));
        setConversations(convos);
      });
  }, []);

  const openConvo = (username: string) => {
    setActive(username);
    setMessages([
      { id: 1, from: username, text: '嗨!欢迎来到我的频道', time: '10:00' },
      { id: 2, from: 'me', text: '你好!你的内容很棒', time: '10:01' },
      { id: 3, from: username, text: '谢谢!有什么想看的主题吗?', time: '10:02' },
    ]);
  };

  const send = () => {
    if (!input.trim() || !active) return;
    setMessages((m) => [...m, { id: Date.now(), from: 'me', text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setInput('');
  };

  return (
    <div className="flex h-screen">
      <div className={`${active ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-[320px] border-r border-white/10`}>
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3">
          <h1 className="text-xl font-bold">消息</h1>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input placeholder="搜索私信" className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:border-[#f472b6]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <button key={c.id} onClick={() => openConvo(c.username)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: c.avatar_color }}>{c.display[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between"><p className="font-bold text-[15px] truncate">{c.display}</p><span className="text-[13px] text-white/40">{c.time}</span></div>
                <p className="text-[14px] text-white/50 truncate">{c.last_message}</p>
              </div>
              {c.unread && <div className="w-2.5 h-2.5 rounded-full bg-[#f472b6] shrink-0" />}
            </button>
          ))}
        </div>
      </div>
      <div className={`${active ? 'flex' : 'hidden sm:flex'} flex-col flex-1`}>
        {active ? (
          <>
            <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center gap-3">
              <button onClick={() => setActive(null)} className="sm:hidden text-white/60">←</button>
              <div className="w-10 h-10 rounded-full bg-[#f472b6] flex items-center justify-center text-white font-bold">{active[0].toUpperCase()}</div>
              <p className="font-bold text-[15px]">{active}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${m.from === 'me' ? 'bg-[#f472b6] text-white' : 'bg-white/10 text-white'}`}>
                    <p className="text-[15px]">{m.text}</p>
                    <p className={`text-[11px] mt-0.5 ${m.from === 'me' ? 'text-white/60' : 'text-white/40'}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 p-3 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="输入消息..." className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:border-[#f472b6]" />
              <button onClick={send} className="w-10 h-10 rounded-full bg-[#f472b6] flex items-center justify-center hover:bg-[#f472b6]/90"><Send className="w-4 h-4 text-white" /></button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30">
            <div className="text-center"><p className="text-xl font-bold mb-2">选择一条私信</p><p className="text-sm">从左侧选择对话开始聊天</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
