'use client';

import { Creator } from '@/lib/types';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';

type Props = { creator: Creator };

export function SubscribeButton({ creator }: Props) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', creator.id).maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [user, creator.id]);

  const toggleFollow = async () => {
    if (!user) { window.location.href = '/login'; return; }
    setLoading(true);
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', creator.id);
      setFollowing(false);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: creator.id });
      setFollowing(true);
    }
    setLoading(false);
  };

  if (!user) return (
    <button onClick={() => window.location.href = '/login'} className="px-5 py-2 rounded-full font-bold text-sm text-white bg-[#f472b6] hover:opacity-90">关注</button>
  );

  return (
    <button onClick={toggleFollow} disabled={loading}
      className={`px-5 py-2 rounded-full font-bold text-sm transition ${following ? 'border border-white/20 text-white hover:border-red-400 hover:text-red-400' : 'bg-[#f472b6] text-white hover:opacity-90'}`}>
      {loading ? '...' : following ? '已关注' : '关注'}
    </button>
  );
}
