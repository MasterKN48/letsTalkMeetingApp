import { Suspense } from 'react';
import { Metadata } from 'next';
import { PerspectiveGrid } from '@/components/ui/perspective-grid';
import { ThemeToggleButton } from '@/components/ui/theme-toggle';
import RoomInterface from '@/components/room-interface';
import { Loader2 } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ roomId: string }> }): Promise<Metadata> {
  const { roomId } = await params;
  return {
    title: `Room: ${roomId} | Let'sTalk`,
    description: `Join the conversation in room ${roomId}. High-performance AI meetings.`,
  };
}

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { roomId } = await params;
  const sParams = await searchParams;
  const userName = sParams.username as string | undefined;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center selection:bg-primary/30 relative overflow-hidden">
      {/* 1. Static Layout Components (SSR-first) */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-100">
        <PerspectiveGrid className="w-full h-full" />
      </div>

      {/* 2. Dynamic Room Logic (PPR Strategy) */}
      <Suspense fallback={
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.4em] text-primary">
            Initializing Secure Transport...
          </p>
        </div>
      }>
        <RoomInterface roomId={roomId} initialUserName={userName} />
      </Suspense>

      <div className="fixed bottom-8 right-8 z-[100]">
        <ThemeToggleButton />
      </div>
    </div>
  );
}
