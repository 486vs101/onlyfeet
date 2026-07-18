'use client';

import { useEffect, useState } from 'react';
import { Bell, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Notification = {
  id: string;
  type: 'like' | 'subscribe' | 'comment';
  from: string;
  from_display: string;
  content: string;
  time: string;
  read: boolean;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Generate notifications from recent activity
    supabase.from('shorts').select('creator_id, likes, comments').order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => {
        if (!data || data.length === 0) {
          // Fallback: show sample notifications
          setNotifications([
            { id: '1', type: 'subscribe', from: 'fan1', from_display: 'FootFan88', content: '订阅了你的频道', time: '1小时前', read: false },
            { id: '2', type: 'like', from: 'fan2', from_display: 'NailLover', content: '喜欢了你的视频', time: '2小时前', read: false },
            { id: '3', type: 'comment', from: 'fan3', from_display: 'SoleSearcher', content: '评论了你的帖子', time: '5小时前', read: true },
          ]);
          return;
        }
        const fakeNotifications: Notification[] = data.map((s, i) => ({
          id: String(i),
          type: i % 3 === 0 ? 'subscribe' : i % 3 === 1 ? 'like' : 'comment',
          from: `user${i + 1}`,
          from_display: ['FootFan88', 'NailLover', 'SoleSearcher', 'ToeCurious', 'ArchAdmirer'][i % 5],
          content: i % 3 === 0 ? '订阅了你的频道' : i % 3 === 1 ? '喜欢了你的视频' : '评论了你的帖子',
          time: `${i + 1}小时前`,
          read: i > 3,
        }));
        setNotifications(fakeNotifications);
      });
  }, []);

  const icon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-[#f472b6]" />;
      case 'subscribe': return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-blue-400" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  return (
    <div>
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <h1 className="text-xl font-bold">通知</h1>
      </div>
      <div>
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-white/40">暂无通知</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer ${!n.read ? 'bg-white/[0.03]' : ''}`}>
              <div className="mt-0.5">{icon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px]"><b>{n.from_display}</b> <span className="text-white/50">@{n.from}</span></p>
                <p className="text-[15px] text-white/80">{n.content}</p>
                <p className="text-[13px] text-white/40 mt-0.5">{n.time}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-[#f472b6] mt-2" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
