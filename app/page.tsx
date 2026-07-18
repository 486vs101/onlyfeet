import { CreatorGrid } from '@/components/home/creator-grid';
import Link from 'next/link';
import { Play } from 'lucide-react';

export default function HomePage() {
  return (
    <>
      <div className="sticky top-0 z-30 top-sticky border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          only<span className="logo-gradient">feet</span>
        </h1>
        <Link href="/shorts" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white text-sm font-semibold hover:opacity-90 transition">
          <Play className="w-4 h-4 fill-white" />
          <span>刷视频</span>
        </Link>
      </div>
      <CreatorGrid />
    </>
  );
}
