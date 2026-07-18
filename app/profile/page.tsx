'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Plus } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myShorts, setMyShorts] = useState<any[]>([]);
  const [myCreator, setMyCreator] = useState<any>(null);

  useEffect(() => {
    if (user && profile?.is_creator) {
      supabase.from('creators').select('*').eq('owner_id', user.id).single()
        .then(({ data }) => {
          if (!data) return;
          setMyCreator(data);
          supabase.from('shorts').select('*').eq('creator_id', data.id).order('created_at', { ascending: false })
            .then(({ data: s }) => setMyShorts(s || []));
        });
    }
  }, [user, profile]);

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-black">
        <div className="text-center">
          <p className="mb-4 text-white/70">请先登录</p>
          <Link href="/login" className="inline-block px-6 py-2 rounded-xl bg-white text-black font-bold">去登录</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-30 top-sticky border-b border-white/10 px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">
          only<span className="logo-gradient">feet</span>
        </h1>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl" style={{ background: profile.avatar_color }}>
            {profile.display_name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-bold">{profile.display_name}</p>
            <p className="text-white/50">@{profile.username}</p>
          </div>
        </div>
        {profile.bio && <p className="mt-3 text-white/70 text-[15px]">{profile.bio}</p>}

        <div className="mt-4 flex gap-4">
          <div><b className="text-white">{myShorts.length}</b> <span className="text-white/50">内容</span></div>
          <div><b className="text-white">{myCreator?.subscriber_count || 0}</b> <span className="text-white/50">订阅者</span></div>
        </div>

        {!profile.is_creator && (
          <Link href="/become-creator" className="mt-5 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white font-bold">
            <Sparkles className="w-4 h-4" />
            成为创作者
          </Link>
        )}
        {profile.is_creator && (
          <Link href="/create" className="mt-5 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white font-bold">
            <Plus className="w-4 h-4" />
            发布新内容
          </Link>
        )}
      </div>

      <div className="px-4 pb-4">
        <h2 className="font-bold text-lg mb-3">我的内容</h2>
        {myShorts.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">
            {profile.is_creator ? '还没有发布内容' : '成为创作者后可以发布'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {myShorts.map((s: any) => (
              <Link key={s.id} href="/shorts" className="aspect-square rounded-lg overflow-hidden relative" style={{ background: s.placeholder_color || s.placeholderColor }}>
                {s.media_url ? (
                  s.type === 'video' ? (
                    <video src={s.media_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={s.media_url} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">无媒体</div>
                )}
                {s.is_locked && <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">🔒</div>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
