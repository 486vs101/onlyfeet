import { CreatorGrid } from '@/components/home/creator-grid';

export default function HomePage() {
  return (
    <>
      <div className="sticky top-0 z-30 top-sticky border-b border-white/10 px-4 py-3">
        <h1 className="text-xl font-bold tracking-tight">
          only<span className="logo-gradient">feet</span>
        </h1>
      </div>
      <CreatorGrid />
    </>
  );
}
