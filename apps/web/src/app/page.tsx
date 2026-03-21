import { Metadata } from 'next';
import { Suspense } from 'react';
import Image from "next/image";
import { SpotlightNavbar } from "@/components/ui/spotlight-navbar";
import { PerspectiveGrid } from "@/components/ui/perspective-grid";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import { Globe, Cpu, Video } from "lucide-react";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";
import JoinRoomForm from '@/components/join-room-form';

export const metadata: Metadata = {
  title: "Let'sTalk: AI-Powered SFU Meetings",
  description: "Next-generation video meetings with real-time translation and voice cloning. Experience the future of global communication.",
  openGraph: {
    title: "Let'sTalk — AI-Powered SFU Meetings",
    description: "Real-time AI translation, voice cloning, and ultra-low latency video calls.",
    images: [{ url: '/icons/og-image.png', width: 630, height: 630 }],
    type: "website",
  },
};

export default function Page() {
  const navItems = [
    { label: "Home", href: "/" },
    { label: "Features", href: "#features" },
  ];

  return (
    <main className="min-h-screen bg-background font-mono selection:bg-primary/30 flex flex-col items-center overflow-x-hidden">
      {/* 1. Static Layout Components (SSR-first) */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-100">
        <PerspectiveGrid className="w-full h-full" />
      </div>

      <div className="w-full relative z-50 px-4">
        <SpotlightNavbar items={navItems} />
      </div>

      {/* Hero Section */}
      <div className="w-full max-w-7xl px-6 relative z-10 pt-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          
          {/* Static Hero Side */}
          <div className="flex-1 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-4 vt-logo">
                <div className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity">
                  <Image
                    src="/icons/icon.svg"
                    alt="Let'sTalk Logo"
                    width={40}
                    height={40}
                    className="drop-shadow-[0_2px_10px_rgba(0,255,255,0.2)] dark:filter dark:invert"
                    priority
                  />
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                  AI POWERED TRANSLATION
                </div>
              </div>
              <h1 className="text-6xl font-black tracking-tighter text-foreground sm:text-7xl leading-[0.85] italic uppercase">
                LETS <br />
                <span className="text-foreground not-italic">TALK</span>
              </h1>
              <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-sm">
                Next-gen SFU meetings with real-time translation and voice
                cloning.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <LiquidMetalButton
                metalConfig={{
                  colorBack: "#444444",
                  colorTint: "#ffffff",
                  distortion: 0.05,
                  speed: 0.3,
                }}
              >
                GitHub Source
              </LiquidMetalButton>
            </div>
          </div>

          {/* 2. Dynamic Hole (PPR Strategy) */}
          <Suspense fallback={
            <div className="flex-1 w-full max-w-lg bg-card/60 animate-pulse rounded-[3rem] h-[500px]" />
          }>
            <JoinRoomForm />
          </Suspense>

        </div>
      </div>

      {/* Static Features (Zero Client-Side JS needed for rendering) */}
      <section id="features" className="w-full max-w-7xl px-6 py-32 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Globe size={24} />} 
            title="Real-time Translation"
            desc="Break language barriers with instant AI-powered voice and text translation during your calls."
          />
          <FeatureCard 
            icon={<Cpu size={24} />} 
            title="Voice Cloning"
            desc="Communicate in any language while maintaining your natural voice tone and expression."
          />
          <FeatureCard 
            icon={<Video size={24} />} 
            title="SFU Engine"
            desc="Ultra-low latency Selective Forwarding Unit architecture powered by Mediasoup and Bun."
          />
        </div>
      </section>

      <footer className="w-full py-20 px-6 border-t border-border/10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-50">
          Built with Excellence &bull; 2026 Let&apos;sTalk
        </p>
      </footer>

      <div className="fixed bottom-8 right-8 z-[100]">
        <ThemeToggleButton />
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-[2.5rem] bg-card/10 backdrop-blur-md border border-border/50 space-y-4 hover:translate-y-[-10px] transition-transform duration-300">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <h3 className="text-xl font-black uppercase tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground font-medium leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
