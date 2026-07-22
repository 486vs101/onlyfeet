import type { Metadata } from 'next';
import './globals.css';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightPanel } from '@/components/layout/right-panel';
import { MobileNav } from '@/components/layout/mobile-nav';

export const metadata: Metadata = {
  title: 'onlyfeet',
  description: '订阅你喜欢的脚部内容创作者',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex justify-center min-h-screen">
          <div className="flex justify-end">
            <LeftSidebar />
          </div>
          <main className="flex-1 max-w-[600px] border-x border-white/10 min-h-screen pb-14 lg:pb-0">
            {children}
          </main>
          <div className="flex justify-start">
            <RightPanel />
          </div>
        </div>
        <MobileNav />
      </body>
    </html>
  );
