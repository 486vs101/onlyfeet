'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './use-auth';

export type Tier = { name: string; price: number; badge: string; perks: string[] };

export function useCreatorTiers(creatorRowId?: string, ownerId?: string) {
  const [tiers, setTiers] = useState<Tier[]>([]);

  useEffect(() => {
    if (!creatorRowId) { setTiers([]); return; }
    supabase.from('creators').select('tiers').eq('id', creatorRowId).maybeSingle()
      .then(({ data }) => {
        setTiers(Array.isArray(data?.tiers) ? data!.tiers : []);
      });
  }, [creatorRowId]);

  // Also a fallback: if ownerId given but no creator row, try ownerId path
  void ownerId;
  return tiers;
}

// 取得当前用户对某个 creator 的订阅档位(0=免费档, 1=基础, 2=高级)
export function useUserTierForCreator(creatorId?: string, ownerId?: string) {
  const { user } = useAuth();
  const [tierIndex, setTierIndex] = useState(0);

  useEffect(() => {
    if (!user) { setTierIndex(0); return; }
    const load = async () => {
      if (creatorId) {
        const { data } = await supabase.from('subscriptions').select('tier_index').eq('user_id', user.id).eq('creator_id', creatorId).eq('active', true).maybeSingle();
        if (data) { setTierIndex(data.tier_index || 0); return; }
      }
      if (ownerId) {
        // 通过 owner_id 找 creator
        const { data: c } = await supabase.from('creators').select('id').eq('owner_id', ownerId).maybeSingle();
        if (c?.id) {
          const { data } = await supabase.from('subscriptions').select('tier_index').eq('user_id', user.id).eq('creator_id', c.id).eq('active', true).maybeSingle();
          setTierIndex(data?.tier_index || 0);
          return;
        }
      }
      setTierIndex(0);
    };
    load();
  }, [user, creatorId, ownerId]);

  return tierIndex;
}
