'use client';

import { useEffect, useState } from 'react';
import { Bell, Heart, UserPlus, MessageCircle, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/use-auth';

type Notif = { id: string; type: string; actor_name: string; actor_avatar: string; message: string; is_read: boolean; created_at: string; };

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Not logged in - show empty state
      setNotifs([]); setLoading(false);
      return;
    }
    // Try real notifications table first
    supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      .then(({ data, error }) => {
        if (data && data.length > 0) {
          setNotifs(data);
          setLoading(false);
          return;
        }
        // Fallback: aggregate from likes + follows
        Promise.all([
          supabase.from('likes').select('id, short_id, created_at').eq('short_id', 'any').order('created_at', { ascending: false }).limit(5),
          supabase.from('follows').select('id, created_at').eq('following_id', user.id).order('created_at', { ascending: false }).limit(5),
        ]).then(([likesRes, followsRes]) => {
          const items: Notif[] = [];
          (likesRes.data || []).forEach((l: any) => {
            items.push({ id: `like_${l.id}`, type: 'like', actor_name: '粉丝', actor_avatar: '', message: '赞了你的作品', is_read: false, created_at: l.created_at });
          });
          (followsRes.data || []).forEach((f: any) => {
            items.push({ id: `follow_${f.id}`, type: 'follow', actor_name: '新粉丝', actor_avatar: '', message: '关注了你', is_read: false, created_at: f.created_at });
          });
          setNotifs(items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
          setLoading(false);
        });
      });
  }, [user]);

  const icon = (type: string) => {
    switch (type) {
      case 'like': return <div className="w-10 h-10 rounded-full bg-[#f472b6]/20 flex items-center justify-center"><Heart className="w-5 h-5 text-[#f472b6]" /></div>;
      case 'follow': return <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"><UserPlus className="w-5 h-5 text-green-400" /></div>;
      case 'comment': return <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-blue-400" /></div>;
      default: return <div className="w-10 h-10 rounded-full bg-[#f472b6]/20 flex items-center justify-center"><Star className="w-5 h-5 text-[#f472b6]" /></div>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold px-4 py-4 border-b border-white/10">通知</h1>
      {loading ? (
        <div className="p-8 text-center text-white/40">加载中...</div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <Bell className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg">{user ? '暂无通知' : '登录后查看通知'}</p>
          {!user && <a href="/login" className="mt-4 px-6 py-2 rounded-full bg-[#f472b6] text-white text-sm font-bold">去登录</a>}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {notifs.map(n => (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] ${n.is_read ? 'opacity-60' : ''}`}>
              {icon(n.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm"><span className="text-white font-bold">{n.actor_name}</span> <span className="text-white/70">{n.message}</span></p>
                <p className="text-white/30 text-xs mt-0.5">{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#f472b6] mt-2 flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}天前`;
  return new Date(ts).toLocaleDateString();
}
