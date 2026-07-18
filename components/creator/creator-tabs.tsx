'use client';

import { useState, useEffect } from 'react';
import { Creator } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { ShortsFeed } from './shorts-feed';
import { PostGrid } from './post-grid';

type Props = { creator: Creator };
type TabId = 'shorts' | 'posts' | 'about';

export function CreatorTabs({ creator }: Props) {
  const [tab, setTab] = useState<TabId>('shorts');
  const [subscribed] = useState(creator.isSubscribed);
  const [shorts, setShorts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('shorts').select('*').eq('creator_id', creator.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setShorts(data); });
    supabase.from('posts').select('*').eq('creator_id', creator.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPosts(data); });
  }, [creator.id]);

  const mappedShorts = shorts.map((s) => ({
    id: s.id, creatorId: s.creator_id, type: s.type,
    placeholderColor: s.placeholder_color, images: s.images,
    slideDuration: s.slide_duration,
    bgm: { title: s.bgm_title, artist: s.bgm_artist },
    access: s.access, freePreviewSec: s.free_preview_sec,
    caption: s.caption, hashtags: s.hashtags || [],
    durationSec: s.duration_sec,
    stats: { views: s.views, likes: s.likes, comments: s.comments, shares: s.shares },
  }));

  const mappedPosts = posts.map((p) => ({
    id: p.id, creatorId: p.creator_id, type: p.type,
    placeholderColor: p.placeholder_color,
    caption: p.caption, hashtags: p.hashtags || [],
    likes: p.likes, comments: p.comments,
    isLocked: p.is_locked, isPPV: p.is_ppv, ppvPrice: p.ppv_price,
    createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
  }));

  const tabs = [
    { id: 'shorts' as TabId, label: '短视频', count: shorts.length },
    { id: 'posts' as TabId, label: '帖子', count: posts.length },
    { id: 'about' as TabId, label: '关于' },
  ];

  return (
    <div>
      <div className="flex border-b border-white/10">
        {tabs.map(({ id, label, count }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-4 text-[15px] font-medium text-center relative ${tab === id ? 'text-white' : 'text-white/50 hover:text-white/80'}`}>
            {label}{count !== undefined && <span className="ml-1 text-white/40 text-[13px]">{count}</span>}
            {tab === id && <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#f472b6] rounded-full" />}
          </button>
        ))}
      </div>
      {tab === 'shorts' && <ShortsFeed shorts={mappedShorts} creator={creator} subscribed={subscribed} />}
      {tab === 'posts' && <PostGrid posts={mappedPosts} creator={creator} subscribed={subscribed} />}
      {tab === 'about' && (
        <div className="p-4 text-[15px] text-[hsl(var(--fg-secondary))] space-y-3">
          <p>{creator.bio}</p>
          <p>{creator.subscriberCount.toLocaleString()} 个订阅</p>
          <p>${creator.subscriptionPrice}/month</p>
        </div>
      )}
    </div>
  );
}
