'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/use-auth';

type Tier = { name: string; price: number; badge: string; perks: string[] };

const DEFAULT_TIERS: Tier[] = [
  { name: '免费', price: 0, badge: '', perks: ['看动态', '看免费作品'] },
  { name: '基础', price: 9.99, badge: '💎', perks: ['解锁基础视频', '专属动态'] },
  { name: '高级', price: 19.99, badge: '✨', perks: ['解锁付费内容', '私信', '专属徽章'] },
];

export function TierEditor({ creatorId, onSaved }: { creatorId: string; onSaved?: () => void }) {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from('creators').select('tiers').eq('id', creatorId).maybeSingle()
      .then(({ data }) => {
        if (data?.tiers && Array.isArray(data.tiers) && data.tiers.length > 0) {
          setTiers(data.tiers.map((t: any) => ({ name: t.name || '档', price: Number(t.price) || 0, badge: t.badge || '', perks: Array.isArray(t.perks) ? t.perks : [] })));
        }
        setLoaded(true);
      });
  }, [creatorId]);

  const update = (idx: number, field: keyof Tier, val: any) => {
    const next = [...tiers]; next[idx] = { ...next[idx], [field]: val }; setTiers(next);
  };
  const updatePerk = (idx: number, pIdx: number, val: string) => {
    const next = [...tiers]; const perks = [...next[idx].perks]; perks[pIdx] = val;
    next[idx] = { ...next[idx], perks }; setTiers(next);
  };
  const addPerk = (idx: number) => update(idx, 'perks', [...tiers[idx].perks, '']);
  const removePerk = (idx: number, pIdx: number) => {
    const next = [...tiers]; const perks = next[idx].perks.filter((_, i) => i !== pIdx);
    next[idx] = { ...next[idx], perks }; setTiers(next);
  };
  const addTier = () => setTiers([...tiers, { name: `档${tiers.length + 1}`, price: 0, badge: '🎁', perks: [''] }]);
  const removeTier = (idx: number) => setTiers(tiers.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    await supabase.from('creators').update({ tiers }).eq('id', creatorId);
    setSaving(false);
    onSaved?.();
  };

  if (!loaded) return <div className="text-white/40 text-sm">加载中...</div>;

  return (
    <div className="space-y-3">
      {tiers.map((t, i) => (
        <div key={i} className="p-4 rounded-xl bg-white/[0.03] space-y-2">
          <div className="flex items-center gap-2">
            <input value={t.badge} onChange={e => update(i, 'badge', e.target.value)} maxLength={2} placeholder="🎁"
              className="w-12 bg-white/5 rounded-lg px-2 py-1 text-center text-xl" />
            <input value={t.name} onChange={e => update(i, 'name', e.target.value)} placeholder="档位名"
              className="flex-1 bg-white/5 rounded-lg px-3 py-1 text-white text-sm" />
            <div className="flex items-center bg-white/5 rounded-lg px-3 py-1">
              <span className="text-white/40 text-xs mr-1">$</span>
              <input type="number" value={t.price} onChange={e => update(i, 'price', parseFloat(e.target.value) || 0)} step="0.01" min="0"
                className="w-16 bg-transparent text-white text-sm outline-none" />
              <span className="text-white/40 text-xs ml-1">/月</span>
            </div>
            {tiers.length > 1 && <button onClick={() => removeTier(i)} className="text-white/40 hover:text-red-400"><X className="w-4 h-4" /></button>}
          </div>
          <div className="pl-2 space-y-1">
            {t.perks.map((p, pI) => (
              <div key={pI} className="flex items-center gap-2">
                <span className="text-white/40 text-xs">•</span>
                <input value={p} onChange={e => updatePerk(i, pI, e.target.value)} placeholder="权益说明" className="flex-1 bg-transparent text-white/80 text-xs outline-none" />
                <button onClick={() => removePerk(i, pI)} className="text-white/30 hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
            <button onClick={() => addPerk(i)} className="text-[#f472b6] text-xs flex items-center gap-1"><Plus className="w-3 h-3" /> 添加权益</button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={addTier} className="flex-1 py-2 rounded-xl border border-dashed border-white/20 text-white/50 text-sm hover:border-[#f472b6] hover:text-white">+ 添加档位</button>
        <button onClick={save} disabled={saving} className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white text-sm font-bold disabled:opacity-50 flex items-center gap-1">
          <Save className="w-4 h-4" /> {saving ? '保存中' : '保存'}
        </button>
      </div>
    </div>
  );
}
