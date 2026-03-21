"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MediasoupClient } from "@/lib/mediasoup";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  User,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Share,
} from "lucide-react";
import { GlassDock } from "@/components/ui/glass-dock";
import { LiquidMetalButton } from "@/components/ui/liquid-metal";
import { cn } from "@/lib/utils";

interface RoomInterfaceProps {
  roomId: string;
  initialUserName?: string;
}

export default function RoomInterface({
  roomId,
  initialUserName = "",
}: RoomInterfaceProps) {
  const [userName, setUserName] = useState<string>(initialUserName);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Map<string, { stream: MediaStream; userName: string }>
  >(new Map()); // Key: userId
  const [isJoined, setIsJoined] = useState(false);
  const [showLobby, setShowLobby] = useState(true);
  const [joiningStatus, setJoiningStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<MediasoupClient | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Initial camera preview
    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Mic/Cam access denied:", err);
        setError("Camera/Microphone access denied. Please enable permissions in your browser.");
      }
    };
    startPreview();

    return () => {
      // Cleanup if navigating away before joining
      if (clientRef.current) {
        clientRef.current.getSocket()?.close();
      }
    };
  }, []);

  const handleJoin = async () => {
    if (!userName.trim()) return setError("Please enter your name");
    setError(null);
    setJoiningStatus("Authenticating...");
    setShowLobby(false);

    if (!userIdRef.current) {
      userIdRef.current = `user-${Math.floor(Math.random() * 1000)}`;
    }
    const userId = userIdRef.current;

    try {
      const serverUrl =
        process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";
      const authRes = await fetch(`${serverUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userName, roomId }),
      });

      if (!authRes.ok)
        throw new Error("Authorization failed. Is the server running?");
      const { token } = await authRes.json();

      setJoiningStatus("Connecting to signaling server...");
      const client = new MediasoupClient(
        roomId,
        (producerId, kind, pName, pId) =>
          handleNewProducer(producerId, kind, pName, pId),
        (producerId, pId) => handleProducerClosed(producerId, pId)
      );
      clientRef.current = client;

      await client.connect(token);

      setJoiningStatus("Joining room...");
      const existingProducers = await client.joinRoom();

      setJoiningStatus("Setting up media transports...");
      await client.initTransports();

      setJoiningStatus("Publishing media...");
      if (localStream) {
        for (const track of localStream.getTracks()) {
          await client.produce(track);
        }
      }

      setJoiningStatus("Syncing remote participants...");
      for (const p of existingProducers) {
        handleNewProducer(p.producerId, p.kind, p.userName, p.userId);
      }

      setIsJoined(true);
      setJoiningStatus("");
    } catch (err: unknown) {
      console.error("Join failed:", err);
      const message = err instanceof Error ? err.message : "Failed to join room";
      setError(message || "Failed to join room. Please check your connection.");
      setShowLobby(true);
      setJoiningStatus("");
    }
  };

  const handleNewProducer = async (
    producerId: string,
    kind: string,
    producerUserName: string,
    producerUserId: string
  ) => {
    if (!clientRef.current) return;
    const currentUserId = clientRef.current.getUserId();
    if (producerUserId === currentUserId) return;

    try {
      const consumer = await clientRef.current.consume(producerId);
      if (!consumer) return;

      setRemoteStreams((prev) => {
        const next = new Map(prev);
        const existing = next.get(producerUserId);
        if (existing) {
          existing.stream.addTrack(consumer.track);
          const newStream = new MediaStream(existing.stream.getTracks());
          next.set(producerUserId, {
            stream: newStream,
            userName: producerUserName,
          });
        } else {
          const incomingStream = new MediaStream([consumer.track]);
          next.set(producerUserId, {
            stream: incomingStream,
            userName: producerUserName,
          });
        }
        return next;
      });
    } catch (err) {
      console.error("Error consuming producer:", err);
    }
  };

  const handleProducerClosed = (producerId: string, producerUserId: string) => {
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(producerUserId);
      return next;
    });
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, showLobby, isJoined]);

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = audioMuted;
        setAudioMuted(!audioMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = videoOff;
        setVideoOff(!videoOff);
      }
    }
  };

  const dockItems = [
    {
      title: audioMuted ? "Unmute" : "Mute",
      icon: audioMuted ? MicOff : Mic,
      onClick: toggleAudio,
      activeClassName: audioMuted ? "bg-destructive text-black" : "",
    },
    {
      title: videoOff ? "Start Video" : "Stop Video",
      icon: videoOff ? VideoOff : Video,
      onClick: toggleVideo,
      activeClassName: videoOff ? "bg-destructive text-black" : "",
    },
    {
      title: "Share Room",
      icon: Share,
      onClick: () => {
        const cleanUrl = window.location.origin + window.location.pathname;
        if (navigator.share) {
          navigator.share({
            url: cleanUrl,
          }).catch(console.error);
        } else {
          navigator.clipboard.writeText(cleanUrl);
          alert("Link copied to clipboard!");
        }
      },
      activeClassName: "hover:bg-foreground/10 text-foreground",
    },
    {
      title: "Leave",
      icon: PhoneOff,
      onClick: () => (window.location.href = "/"),
      activeClassName: "bg-destructive text-black",
    },
  ];

  if (showLobby) {
    return (
      <div className="w-full max-w-xl space-y-8 bg-card/50 p-8 rounded-3xl border border-border backdrop-blur-2xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500 vt-user-form">
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="flex items-center gap-3 vt-logo">
            <Image
              src="/icons/icon.svg"
              alt="Logo"
              width={40}
              height={40}
              className="dark:filter dark:invert"
            />
            <h1 className="text-4xl font-black text-foreground italic tracking-tighter uppercase whitespace-nowrap">
              LETS <span className="not-italic">TALK</span>
            </h1>
          </div>
          <p className="text-muted-foreground font-medium">
            Room ID: <span className="text-primary font-mono vt-room-id">{roomId}</span>
          </p>
        </div>

        <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted border border-border group transition-all w-full shadow-inner">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transform -scale-x-100 ${
              videoOff ? "hidden" : ""
            }`}
          />
          {(!localStream || videoOff) && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="w-24 h-24 rounded-full bg-card/50 backdrop-blur-xl border border-border flex items-center justify-center text-4xl font-bold bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-card to-muted shadow-2xl overflow-hidden">
                <User size={48} className="text-muted-foreground" />
              </div>
            </div>
          )}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
            <button
              onClick={toggleAudio}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                audioMuted
                  ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30"
                  : "bg-background/90 text-foreground hover:bg-muted hover:scale-105"
              }`}
            >
              {audioMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                videoOff
                  ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30"
                  : "bg-background/90 text-foreground hover:bg-muted hover:scale-105"
              }`}
            >
              {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30 hover:scale-105"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground ml-1 flex items-center gap-2">
              <User size={14} /> What&apos;s your name?
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter display name"
              className="w-full px-6 py-5 bg-background border border-border rounded-2xl focus:ring-2 ring-ring transition-all outline-none text-lg font-medium placeholder:text-muted-foreground"
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 text-destructive font-medium text-sm bg-destructive/10 p-4 rounded-xl border border-destructive/20 animate-in fade-in slide-in-from-top-2">
              <ShieldCheck size={18} className="rotate-180" />
              <span>{error}</span>
            </div>
          )}

          {joiningStatus ? (
            <button
              disabled
              className="w-full py-5 bg-gradient-to-r from-primary to-primary/80 disabled:from-muted disabled:to-muted disabled:text-muted-foreground text-primary-foreground rounded-2xl font-bold text-xl transition-all shadow-xl shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="opacity-80 font-medium tracking-wide">
                {joiningStatus}
              </span>
            </button>
          ) : (
            <LiquidMetalButton
              onClick={handleJoin}
              className="w-full"
              metalConfig={{ colorTint: "#3b82f6" }}
            >
              Join Meeting <ArrowRight size={20} className="inline-block ml-2" />
            </LiquidMetalButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl flex flex-col flex-1 h-full gap-6 relative z-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center py-4 px-8 bg-card/40 backdrop-blur-2xl border border-border/60 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <Image
            src="/icons/icon.svg"
            alt="Logo"
            width={32}
            height={32}
            className="dark:filter dark:invert"
          />
          <h2 className="text-2xl font-black text-foreground italic tracking-tighter uppercase">
            LETS <span className="not-italic">TALK</span>
          </h2>
          <div className="h-6 w-[1px] bg-border hidden md:block" />
          <span className="text-muted-foreground font-mono text-sm hidden md:block">
            {roomId}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {joiningStatus && (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="text-primary animate-spin" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                {joiningStatus}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-xs font-bold uppercase tracking-tight">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="opacity-80">{isJoined ? "Live" : "Connecting"}</span>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr min-h-0">
        {/* Local Video */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-card h-full w-full aspect-video border border-border shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transform ${
              !videoOff ? "-scale-x-100" : "hidden"
            }`}
          />
          {videoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="w-32 h-32 rounded-full bg-card border-2 border-border flex items-center justify-center text-5xl font-bold bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-card to-muted text-muted-foreground shadow-2xl">
                <User size={64} className="text-muted-foreground/50" />
              </div>
            </div>
          )}
          <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-background/80 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold border border-border tracking-wide text-foreground z-10">
            <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_var(--primary)] animate-pulse" />
            {userName} (You)
          </div>

          <div className="absolute bottom-6 right-6 flex items-center gap-2 z-10">
            <button
              onClick={toggleAudio}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                audioMuted ? "bg-destructive text-destructive-foreground" : "bg-background/80 text-foreground hover:bg-muted"
              }`}
            >
              {audioMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                videoOff ? "bg-destructive text-destructive-foreground" : "bg-background/80 text-foreground hover:bg-muted"
              }`}
            >
              {videoOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>
          </div>
        </div>

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(
          ([id, { stream, userName: remoteName }]) => (
            <div
              key={id}
              className="relative overflow-hidden rounded-[2.5rem] bg-card h-full w-full aspect-video border border-border animate-in fade-in zoom-in-95 duration-700 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
            >
              <RemoteVideo stream={stream} />
              <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-background/80 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold border border-border tracking-wide text-primary z-10">
                <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8_rgba(99,102,241,0.5)]" />
                {remoteName}
              </div>
            </div>
          )
        )}
      </div>

      {/* Control Bar */}
      <div className="h-28 sticky bottom-4 w-full flex items-center justify-center mt-auto">
        <GlassDock items={dockItems} dockClassName="px-6 py-4 rounded-3xl" />
      </div>
    </div>
  );
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(true);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;

      const checkTracks = () => {
        const videoTrack = stream.getVideoTracks()[0];
        setHasVideo(!!videoTrack && videoTrack.enabled);
      };

      checkTracks();
      stream.addEventListener("addtrack", checkTracks);
      stream.addEventListener("removetrack", checkTracks);

      return () => {
        stream.removeEventListener("addtrack", checkTracks);
        stream.removeEventListener("removetrack", checkTracks);
      };
    }
  }, [stream]);

  return (
    <>
      <video
        ref={ref}
        autoPlay
        playsInline
        className={cn("w-full h-full object-cover", !hasVideo && "hidden")}
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-24 h-24 rounded-full bg-card border-2 border-border flex items-center justify-center text-4xl font-bold bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-card to-muted text-muted-foreground shadow-2xl">
            <User size={48} className="text-muted-foreground/30" />
          </div>
        </div>
      )}
    </>
  );
}
