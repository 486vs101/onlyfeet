'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myShorts, setMyShorts] = useState<any[]>([]);

  useEffect(() => {
    // In real app, filter by current user's id
    supabase.from('shorts').select('*').limit(6).then(({ data }) => { if (data) setMyShorts(data); });
    supabase.from('posts').select('*').limit(6).then(({ data }) => { if (data) setMyPosts(data); });
  }, []);

  return (
    <div>
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <h1 className="text-xl font-bold">个人主页</h1>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#f472b6] flex items-center justify-center text-white font-bold text-2xl">我</div>
          <div>
            <p className="text-xl font-bold">我</p>
            <p className="text-white/50">@myaccount</p>
          </div>
        </div>
        <div className="mt-4 flex gap-4">
          <div><b className="text-white">{myShorts.length + myPosts.length}</b> <span className="text-white/50">内容</span></div>
          <div><b className="text-white">0</b> <span className="text-white/50">订阅者</span></div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <h2 className="font-bold text-lg mb-3">我的内容</h2>
        <div className="grid grid-cols-3 gap-1">
          {myShorts.map((s: any) => (
            <div key={s.id} className="aspect-square rounded-lg overflow-hidden" style={{ background: s.placeholder_color }}>
              <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">视频</div>
            </div>
          ))}
          {myPosts.map((p: any) => (
            <div key={p.id} className="aspect-square rounded-lg overflow-hidden" style={{ background: p.placeholder_color }}>
              <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">{p.type === 'video' ? '视频' : '图片'}</div>
            </div>
          ))}
        </div>
        <p className="text-white/30 text-sm mt-4 text-center">上传内容后显示在这里</p>
      </div>
    </div>
  );
}
