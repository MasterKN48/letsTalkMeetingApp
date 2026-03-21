"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SpotlightNavbar } from "@/components/ui/spotlight-navbar";
import { PerspectiveGrid } from "@/components/ui/perspective-grid";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";
import { ThemeToggleButton } from "@/components/ui/theme-toggle";
import AnimatedButton from "@/components/ui/animated-button";
import { User, Video, Globe, Cpu, Github } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export interface LandingClientProps {
  initialUserName?: string;
}

export default function LandingClient({
  initialUserName = "",
}: LandingClientProps) {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState(initialUserName);
  const router = useRouter();
  const { theme } = useTheme();

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Features", href: "#features" },
  ];

  const createRoom = () => {
    if (!userName.trim()) return;
    const newRoomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    router.push(`/room/${newRoomId}?username=${encodeURIComponent(userName)}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !userName.trim()) return;
    router.push(
      `/room/${roomId.toUpperCase()}?username=${encodeURIComponent(userName)}`,
    );
  };

  return (
    <main className="min-h-screen bg-background font-mono selection:bg-primary/30 flex flex-col items-center overflow-x-hidden">
      {/* Dynamic Background with Theme Awareness */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-100">
        <PerspectiveGrid
          gridColor={theme === "dark" ? "#334155" : "#cbd5e1"}
          className="w-full h-full"
        />
      </div>

      {/* Spotlight Navigation Bar */}
      <div className="w-full relative z-50 px-4">
        <SpotlightNavbar items={navItems} />
      </div>

      {/* Main Hero Section */}
      <div className="w-full max-w-7xl px-6 relative z-10 pt-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          {/* Left Side: Info & Vision */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 space-y-10"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
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
              <h2 className="text-6xl font-black tracking-tighter text-foreground sm:text-7xl leading-[0.85] italic uppercase">
                LETS <br />
                <span className="text-foreground not-italic">TALK</span>
              </h2>
              <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-sm">
                Next-gen SFU meetings with real-time translation and voice
                cloning.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <LiquidMetalButton
                icon={<Github size={18} />}
                onClick={() =>
                  window.open(
                    "https://github.com/MasterKN48/letsTalk",
                    "_blank",
                  )
                }
                metalConfig={{
                  colorBack: "#444444",
                  colorTint: "#ffffff",
                  distortion: 0.05,
                  speed: 0.3,
                }}
              >
                GitHub
              </LiquidMetalButton>
            </div>
          </motion.div>

          {/* Right Side: Join/Create Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex-1 w-full max-w-lg"
          >
            <div className="bg-card/40 backdrop-blur-3xl border-2 border-border/50 p-10 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-primary/10 transition-colors" />

              <div className="space-y-8 relative z-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-foreground uppercase tracking-[0.3em] ml-2">
                    Identity
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                      size={20}
                    />
                    <input
                      type="text"
                      placeholder="Display Name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-background/50 border-2 border-input rounded-2xl pl-16 pr-8 py-5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all text-base font-black uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <AnimatedButton
                    onClick={createRoom}
                    disabled={!userName.trim()}
                    className="w-full h-16 rounded-[2rem] text-lg font-black shadow-2xl shadow-primary/10 uppercase tracking-[0.2em]"
                  >
                    Host Meeting
                  </AnimatedButton>

                  <div className="relative flex items-center gap-6 py-2">
                    <div className="h-[1px] flex-1 bg-border/50" />
                    <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-30 italic">
                      secure
                    </span>
                    <div className="h-[1px] flex-1 bg-border/50" />
                  </div>

                  <form onSubmit={joinRoom} className="space-y-6">
                    <div className="relative">
                      <Video
                        className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                        size={20}
                      />
                      <input
                        type="text"
                        placeholder="Room Code"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="w-full bg-background/50 border-2 border-input rounded-2xl pl-16 pr-8 py-5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all font-mono text-lg font-black uppercase"
                      />
                    </div>
                    <AnimatedButton
                      type="submit"
                      disabled={!roomId.trim() || !userName.trim()}
                      className="w-full h-16 rounded-[2rem] text-lg font-black uppercase tracking-[0.2em] opacity-90 hover:opacity-100"
                    >
                      Join Room
                    </AnimatedButton>
                  </form>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-border/30 flex justify-between items-center text-[9px] font-black tracking-[0.3em] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  ONLINE
                </div>
                <span>E2EE SECURE</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <section
        id="features"
        className="w-full max-w-7xl px-6 py-32 relative z-10"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            whileHover={{ y: -10 }}
            className="p-8 rounded-[2.5rem] bg-card/10 backdrop-blur-md border border-border/50 space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Globe size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              Real-time Translation
            </h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Break language barriers with instant AI-powered voice and text
              translation during your calls.
            </p>
          </motion.div>
          <motion.div
            whileHover={{ y: -10 }}
            className="p-8 rounded-[2.5rem] bg-card/10 backdrop-blur-md border border-border/50 space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Cpu size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              Voice Cloning
            </h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Communicate in any language while maintaining your natural voice
              tone and expression.
            </p>
          </motion.div>
          <motion.div
            whileHover={{ y: -10 }}
            className="p-8 rounded-[2.5rem] bg-card/10 backdrop-blur-md border border-border/50 space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Video size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              SFU Engine
            </h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Ultra-low latency Selective Forwarding Unit architecture powered
              by Mediasoup and Bun.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-20 px-6 border-t border-border/10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground opacity-50">
          Built with Excellence &bull; 2026 Let&apos;sTalk
        </p>
      </footer>

      {/* Fixed Theme Toggle — clean button only, no background wrapper */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <ThemeToggleButton />
      </div>
    </main>
  );
}
