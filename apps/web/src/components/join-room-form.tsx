"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Video } from "lucide-react";
import AnimatedButton from "@/components/ui/animated-button";
import { motion } from "framer-motion";

interface JoinRoomFormProps {
  initialUserName?: string;
}

export default function JoinRoomForm({ initialUserName = "" }: JoinRoomFormProps) {
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState(initialUserName);
  const router = useRouter();

  const createRoom = () => {
    if (!userName.trim()) return;
    const newRoomId = Math.random().toString(36).substring(2, 10).toUpperCase();
    router.push(`/room/${newRoomId}?username=${encodeURIComponent(userName)}`, {
      // @ts-expect-error - viewTransition is experimental in Next.js 16
      viewTransition: true 
    });
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !userName.trim()) return;
    router.push(
      `/room/${roomId.toUpperCase()}?username=${encodeURIComponent(userName)}`,
      {
        // @ts-expect-error - viewTransition is experimental in Next.js 16
        viewTransition: true
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="flex-1 w-full max-w-lg"
    >
      <div className="w-full max-w-lg space-y-8 bg-card/60 p-10 rounded-[2.5rem] border border-border/50 backdrop-blur-3xl shadow-2xl relative z-10 vt-user-form">
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
  );
}
