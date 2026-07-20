'use client';

import { Creator } from '@/lib/types';
import { SubscribeButton } from './subscribe-button';

type Props = { creator: Creator };

export function CreatorHero({ creator }: Props) {
  return (
    <div>
      {/* Cover - 真实图片或色块 */}
      <div className="h-48 relative">
        {creator.coverUrl ? (
          <img src={creator.coverUrl} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full" style={{ background: creator.coverColor || '#1a1a2e' }} />
        )}
        {/* Avatar - 真实图片或色块 */}
        <div className="absolute -bottom-10 left-4 w-[84px] h-[84px] rounded-full border-4 border-black overflow-hidden bg-black">
          {creator.avatarUrl ? (
            <img src={creator.avatarUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white font-bold text-3xl"
              style={{ background: creator.avatarColor }}
            >
              {creator.displayName[0]}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="pt-12 pb-4 px-4 border-b border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-1.5">
              {creator.displayName}
              {creator.verified && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f472b6] text-[11px] font-bold text-white">✓</span>
              )}
            </h1>
            <p className="text-[15px] text-white/50">@{creator.username}</p>
            <p className="text-[15px] mt-2">{creator.bio}</p>
            <div className="flex gap-4 mt-2 text-[15px] text-white/50">
              <span><b className="text-white">{creator.subscriberCount.toLocaleString()}</b> 个订阅</span>
              <span><b className="text-white">{creator.postCount + creator.shortCount}</b> posts & shorts</span>
            </div>
          </div>
          <div className="shrink-0 ml-4">
            <SubscribeButton creator={creator} />
          </div>
        </div>
      </div>
    </div>
  );
}
