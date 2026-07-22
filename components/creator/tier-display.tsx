'use client';

import { useState } from 'react';
import { Check, Crown } from 'lucide-react';

type Tier = { name: string; price: number; badge: string; perks: string[] };

export function TierDisplay({ tiers, onSubscribe }: { tiers: Tier[]; onSubscribe?: (tier: Tier) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {tiers.map((t, i) => (
        <div key={i} className={`relative p-5 rounded-2xl border ${t.price === 0 ? 'border-white/10 bg-white/[0.02]' : 'border-[#f472b6]/30 bg-gradient-to-br from-[#f472b6]/10 to-zinc-900'}`}>
          {t.price > 0 && <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-[#f472b6] text-white text-[10px] font-bold">推荐</div>}
          <div className="flex items-center gap-2 mb-2">
            {t.badge ? <span className="text-2xl">{t.badge}</span> : <Crown className="w-5 h-5 text-white/30" />}
            <h3 className="text-lg font-bold">{t.name}</h3>
          </div>
          <div className="mb-3">
            {t.price === 0 ? (
              <span className="text-2xl font-bold text-white/60">免费</span>
            ) : (
              <><span className="text-3xl font-bold">${t.price}</span><span className="text-white/40 text-sm">/月</span></>
            )}
          </div>
          <ul className="space-y-2 mb-4">
            {t.perks.map((p, pi) => (
              <li key={pi} className="flex items-start gap-2 text-sm text-white/70">
                <Check className="w-4 h-4 text-[#f472b6] mt-0.5 shrink-0" /><span>{p}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => onSubscribe?.(t)} disabled={t.price === 0}
            className={`w-full py-2 rounded-xl text-sm font-bold transition ${t.price === 0 ? 'bg-white/5 text-white/40 cursor-default' : 'bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white hover:opacity-90'}`}>
            {t.price === 0 ? '当前档位' : '订阅'}
          </button>
        </div>
      ))}
    </div>
  );
}
