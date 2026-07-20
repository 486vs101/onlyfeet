'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Music2, Volume2, VolumeX, Lock } from 'lucide-react';
import { Short, Creator, MediaItem } from '@/lib/types';

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

  useEffect(() => { setReels(shorts); }, [shorts]);

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
    return <div className="flex items-center justify-center h-64 text-white/40 text-sm">暂无短视频</div>;
  }

  return (
    <div className="relative h-[calc(100vh-100px)] w-full overflow-hidden bg-black">
      <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar" style={{ scrollSnapType: 'y mandatory' }}>
        {reels.map((short, idx) => (
          <ShortItem key={short.id} short={short} index={idx} isActive={idx === activeIndex}
            muted={muted} subscribed={subscribed} creator={creator}
            onToggleLike={() => toggleLike(short.id)} onToggleMute={() => setMuted(!muted)} />
        ))}
      </div>
      <button onClick={() => setMuted(!muted)} className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-sm rounded-full p-2">
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
      <div className="absolute top-4 left-4 z-20 text-xs text-white/70 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
        {activeIndex + 1} / {reels.length}
      </div>
    </div>
  );
}

function ShortItem({ short, index, isActive, muted, subscribed, creator, onToggleLike, onToggleMute }: {
  short: Short; index: number; isActive: boolean; muted: boolean;
  subscribed: boolean; creator: Creator;
  onToggleLike: () => void; onToggleMute: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  // Gallery auto-advance
  useEffect(() => {
    if (!isActive || short.type !== 'gallery') return;
    const imgs = short.images || [];
    if (imgs.length <= 1) { setGalleryIdx(0); return; }
    const dur = (imgs[galleryIdx]?.duration || short.slideDuration || 3) * 1000;
    const t = setTimeout(() => setGalleryIdx((i) => (i + 1) % imgs.length), dur);
    return () => clearTimeout(t);
  }, [isActive, galleryIdx, short]);

  // Progress bar
  useEffect(() => {
    if (!isActive) return;
    setShowPaywall(false); setProgress(0);
    const totalMs = short.durationSec * 1000;
    const previewMs = short.access === 'partial' && !subscribed ? (short.freePreviewSec || 8) * 1000 : 0;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / totalMs) * 100, 100));
      if (previewMs > 0 && elapsed >= previewMs && !showPaywall) setShowPaywall(true);
      if (elapsed >= totalMs) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [isActive, short.id]);

  const shouldPaywall = short.access === 'partial' && !subscribed && showPaywall;
  const isGallery = short.type === 'gallery';
  const galleryImgs: MediaItem[] = isGallery ? (short.images || []) : [];

  return (
    <div data-sindex={index} className="relative h-full w-full snap-start snap-always bg-black">
      {/* Media: video / gallery / placeholder */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {shouldPaywall ? (
          // Paywall placeholder
          <div className="text-center bg-[#1a1a2e] w-full h-full flex items-center justify-center">
            <div>
              <div className="text-5xl mb-2">{isGallery ? '🖼️' : '▶'}</div>
              <p className="text-white/60 text-sm">{isGallery ? `${galleryImgs.length} images` : `${short.durationSec}s video`}</p>
            </div>
          </div>
        ) : isGallery && galleryImgs.length > 0 ? (
          // Gallery
          <div className="relative w-full h-full">
            {galleryImgs[galleryIdx]?.url ? (
              <img src={galleryImgs[galleryIdx].url} className="w-full h-full object-contain" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-4xl">🖼️</div>
            )}
            {galleryImgs.length > 1 && (
              <div className="absolute top-4 left-0 right-0 flex justify-center gap-1 z-30">
                {galleryImgs.map((_, i) => (
                  <div key={i} className={`h-0.5 rounded-full transition-all ${i === galleryIdx ? 'w-8 bg-white' : 'w-4 bg-white/30'}`} />
                ))}
              </div>
            )}
          </div>
        ) : short.mediaUrl ? (
          // Video
          <video src={short.mediaUrl} className="w-full h-full object-contain" autoPlay loop muted={muted} playsInline onClick={onToggleMute} />
        ) : (
          // Placeholder
          <div className="text-center" style={{ background: short.placeholderColor, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>
              <div className="text-5xl mb-2">{isGallery ? '🖼️' : '▶'}</div>
              <p className="text-white/60 text-sm">{isGallery ? `${galleryImgs.length} images` : `${short.durationSec}s video`}</p>
            </div>
          </div>
        )}
      </div>

      {/* Paywall overlay */}
      {shouldPaywall && (
        <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <Lock className="w-12 h-12 mx-auto mb-3 text-[#f472b6]" />
            <p className="text-white font-bold text-lg mb-1">订阅以观看完整视频</p>
            <p className="text-white/60 text-sm mb-4">仅 ${creator.subscriptionPrice}/月 观看所有内容</p>
            <button className="px-6 py-2 rounded-full bg-[#f472b6] text-white font-bold">订阅 ${creator.subscriptionPrice}/月</button>
          </div>
        </div>
      )}

      {/* Right actions */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5 text-white">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-black">
          {creator.avatarUrl ? (
            <img src={creator.avatarUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-lg" style={{ background: creator.avatarColor }}>
              {creator.displayName[0]}
            </div>
          )}
        </div>
        <ActionBtn icon={<Heart className={`w-7 h-7 ${short.isLiked ? 'fill-[#f472b6] text-[#f472b6]' : ''}`} strokeWidth={1.5} />} count={short.stats.likes} onClick={onToggleLike} />
        <ActionBtn icon={<MessageCircle className="w-7 h-7" strokeWidth={1.5} />} count={short.stats.comments} />
        <ActionBtn icon={<Bookmark className="w-7 h-7" strokeWidth={1.5} />} count={short.stats.shares} />
        <ActionBtn icon={<Share2 className="w-7 h-7" strokeWidth={1.5} />} count={0} />
        <div className="mt-2 w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center"><Music2 className="w-4 h-4" /></div>
      </div>

      {/* Bottom info */}
      <div className="absolute left-4 right-20 bottom-24 z-20 text-white">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-base">@{creator.username}</span>
          {creator.verified && <span className="text-[10px] px-1.5 py-0.5 bg-[#f472b6] rounded">认证</span>}
          {short.access === 'free' && <span className="text-[10px] px-1.5 py-0.5 bg-green-600 rounded">免费</span>}
        </div>
        <p className="text-sm leading-snug line-clamp-2 mb-2">{short.caption}</p>
        <div className="flex flex-wrap gap-2">{short.hashtags.map((t) => <span key={t} className="text-sm font-medium">{t}</span>)}</div>
        {(short.bgm?.title) && (
          <div className="mt-2 flex items-center gap-2"><Music2 className="w-3.5 h-3.5" /><span className="text-xs text-white/80">{short.bgm.title} · {short.bgm.artist || ''}</span></div>
        )}
      </div>

      {/* Progress bar */}
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
