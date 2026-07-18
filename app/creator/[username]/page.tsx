'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CreatorHero } from '@/components/creator/creator-hero';
import { CreatorTabs } from '@/components/creator/creator-tabs';

export default function CreatorPage() {
  const params = useParams();
  const username = params?.username as string;
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    supabase.from('creators').select('*').eq('username', username).single()
      .then(({ data, error }) => {
        if (error) console.error('Supabase error:', error);
        if (data) setCreator(data);
        setLoading(false);
      });
  }, [username]);

  if (!username) return <div className="p-8 text-red-400">无用户名</div>;
  if (loading) return <div className="p-8 text-white/50">加载中...</div>;
  if (!creator) return <div className="p-8 text-red-400">创作者不存在</div>;

  const mapped = {
    id: creator.id,
    username: creator.username,
    displayName: creator.display_name,
    avatarColor: creator.avatar_color,
    coverColor: creator.cover_color,
    bio: creator.bio,
    subscriptionPrice: creator.subscription_price,
    verified: creator.verified,
    subscriberCount: creator.subscriber_count,
    postCount: creator.post_count,
    shortCount: creator.short_count,
    isSubscribed: false,
  };

  return (
    <>
      <div className="sticky top-0 z-30 top-sticky border-b border-white/10 px-4 py-3 flex items-center gap-4">
        <Link href="/" className="p-1 -ml-1 rounded-full hover:bg-white/[0.08]"><ArrowLeft className="w-5 h-5" /></Link>
        <div><h1 className="text-lg font-bold">{mapped.displayName}</h1><p className="text-[13px] text-white/50">{mapped.postCount + mapped.shortCount} 帖子和短视频</p></div>
      </div>
      <CreatorHero creator={mapped} />
      <CreatorTabs creator={mapped} />
    </>
  );
}
