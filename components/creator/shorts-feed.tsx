'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Music2, Volume2, VolumeX, Lock } from 'lucide-react';
import { Short, Creator } from '@/lib/types';

type Props = {
  shorts: Short[];
  creator: Creator;
  subscribed: boolean;
};

export function ShortsFeed({ shorts, creator, subscribed }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [reels, setReels] = useState(shorts);

  useEffect(() => {
    setReels(shorts);
  }, [shorts]);

  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.6) {
            setActiveIndex(Number((e.target as HTMLElement).dataset.index));
          }
        });
      },
      { root: c, threshold: [0.6] }
    );
    c.querySelectorAll('[data-sindex]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [reels]);

  const toggleLike = useCallback((id: string) => {
    setReels((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, isLiked: !r.isLiked, stats: { ...r.stats, likes: r.stats.likes + (r.isLiked ? -1 : 1) } }
          : r
      )
    );
  }, []);

  if (reels.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[hsl(var(--fg-muted))] text-[15px]">
        No shorts yet
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-100px)] w-full overflow-hidden bg-black">
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {reels.map((short, idx) => (
          <ShortItem
            key={short.id}
            short={short}
            index={idx}
            isActive={idx === activeIndex}
            muted={muted}
            subscribed={subscribed}
            creator={creator}
            onToggleLike={() => toggleLike(short.id)}
            onToggleMute={() => setMuted(!muted)}
          />
        ))}
      </div>

      <button
        onClick={() => setMuted(!muted)}
        className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-sm rounded-full p-2"
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      <div className="absolute top-4 left-4 z-20 text-xs text-white/70 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
        {activeIndex + 1} / {reels.length}
      </div>
    </div>
  );
}

function ShortItem({
  short, index, isActive, muted, subscribed, creator, onToggleLike, onToggleMute,
}: {
  short: Short; index: number; isActive: boolean; muted: boolean;
  subscribed: boolean; creator: Creator;
  onToggleLike: () => void; onToggleMute: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    setShowPaywall(false);
    setProgress(0);
    const totalMs = short.durationSec * 1000;
    const previewMs = short.access === 'partial' && !subscribed ? (short.freePreviewSec || 8) * 1000 : 0;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / totalMs) * 100, 100);
      setProgress(pct);
      if (previewMs > 0 && elapsed >= previewMs && !showPaywall) setShowPaywall(true);
      if (elapsed >= totalMs) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [isActive, short.id]);

  const shouldPaywall = short.access === 'partial' && !subscribed && showPaywall;

  return (
    <div data-sindex={index} className="relative h-full w-full snap-start snap-always bg-black">
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: shouldPaywall ? '#1a1a2e' : short.placeholderColor }}>
        <div className="text-center">
          {short.type === 'video' ? (
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
              <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10"><path d="M8 5v14l11-7z" /></svg>
            </div>
          ) : (
            <div className="text-5xl mb-2">🖼️</div>
          )}
          <p className="text-white/60 text-sm">{short.type === 'video' ? `${short.durationSec}s video` : `${short.images?.length || 4} images`}</p>
          {short.bgm && <p className="text-white/30 text-xs mt-1">🎵 {short.bgm.title}</p>}
          {short.access === 'partial' && !subscribed && (
            <span className="inline-block mt-2 text-[11px] bg-[#f472b6]/20 text-[#f472b6] px-2 py-0.5 rounded-full">{short.freePreviewSec}s free preview</span>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

      {shouldPaywall && (
        <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <Lock className="w-12 h-12 mx-auto mb-3 text-[#f472b6]" />
            <p className="text-white font-bold text-lg mb-1">Subscribe to watch full video</p>
            <p className="text-white/60 text-sm mb-4">Only ${creator.subscriptionPrice}/mo for all content</p>
            <button className="x-btn-accent">Subscribe ${creator.subscriptionPrice}/mo</button>
          </div>
        </div>
      )}

      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5 text-white">
        <div className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-lg" style={{ background: creator.avatarColor }}>{creator.displayName[0]}</div>
        <ActionBtn icon={<Heart className={`w-7 h-7 ${short.isLiked ? 'fill-[#f472b6] text-[#f472b6]' : ''}`} strokeWidth={1.5} />} count={short.stats.likes} onClick={onToggleLike} />
        <ActionBtn icon={<MessageCircle className="w-7 h-7" strokeWidth={1.5} />} count={short.stats.comments} />
        <ActionBtn icon={<Bookmark className="w-7 h-7" strokeWidth={1.5} />} count={short.stats.shares} />
        <ActionBtn icon={<Share2 className="w-7 h-7" strokeWidth={1.5} />} count={0} />
        <div className="mt-2 w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center"><Music2 className="w-4 h-4" /></div>
      </div>

      <div className="absolute left-4 right-20 bottom-24 z-20 text-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-base">@{creator.username}</span>
          {creator.verified && <span className="text-[10px] px-1.5 py-0.5 bg-[#f472b6] rounded">认证</span>}
          {short.access === 'free' && <span className="text-[10px] px-1.5 py-0.5 bg-green-600 rounded">免费</span>}
        </div>
        <p className="text-sm leading-snug line-clamp-2 mb-2">{short.caption}</p>
        <div className="flex flex-wrap gap-2">{short.hashtags.map((t) => <span key={t} className="text-sm font-medium">{t}</span>)}</div>
        <div className="mt-2 flex items-center gap-2"><Music2 className="w-3.5 h-3.5" /><span className="text-xs text-white/80">{short.bgm.title} · {short.bgm.artist}</span></div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/20">
        <div className="h-full bg-white transition-[width] duration-100 ease-linear" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function ActionBtn({ icon, count, onClick }: { icon: React.ReactNode; count: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
      {icon}
      <span className="text-xs font-semibold">{count >= 1000 ? (count/1000).toFixed(1)+'K' : count}</span>
    </button>
  );
}
