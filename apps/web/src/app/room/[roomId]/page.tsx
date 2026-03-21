'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { MediasoupClient } from '@/lib/mediasoup';

export default function RoomPage() {
  const { roomId } = useParams() as { roomId: string };
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isJoined, setIsJoined] = useState(false);
  
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<MediasoupClient | null>(null);

  const hasInit = useRef(false);

  useEffect(() => {
    if (!roomId || hasInit.current) return;
    hasInit.current = true;

    const init = async () => {
      // 1. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // 2. Auth & Init Mediasoup Client
      try {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
        const authRes = await fetch(`${serverUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: `user-${Math.floor(Math.random() * 1000)}`, roomId })
        });
        
        if (!authRes.ok) throw new Error('Auth failed');
        const { token } = await authRes.json();

        const client = new MediasoupClient(roomId, (producerId, kind) => {
          handleNewProducer(producerId, kind);
        });
        clientRef.current = client;

        await client.connect(token);
        await client.joinRoom();
        await client.initTransports();

        // 3. Produce Local Tracks
        for (const track of stream.getTracks()) {
          await client.produce(track);
        }

        setIsJoined(true);
      } catch (err) {
        console.error('Initialization failed:', err);
        hasInit.current = false; // Allow retry on failure if needed
      }
    };

    const handleNewProducer = async (producerId: string, kind: string) => {
      if (!clientRef.current) return;
      console.log('Handling new producer:', producerId, kind);
      const consumer = await clientRef.current.consume(producerId);
      const { track } = consumer;
      const incomingStream = new MediaStream([track]);
      
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.set(producerId, incomingStream);
        return next;
      });
    };

    init();

    return () => {
      // Cleanup
      localStream?.getTracks().forEach(t => t.stop());
      clientRef.current?.getSocket()?.close();
      clientRef.current = null;
      hasInit.current = false;
    };

  }, [roomId]);



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

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-6xl flex flex-col flex-1 h-full gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-center py-4 px-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Room: {roomId}
          </h2>
          <div className="text-sm font-light text-slate-400">
            {isJoined ? '• Connected' : 'Joining...'}
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr min-h-0">
          
          {/* Local Video */}
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl group group-hover:ring-2 ring-blue-500/50">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transform ${!videoOff ? '-scale-x-100' : 'hidden'}`}
            />
            {videoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-4xl text-slate-600">
                  U
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-slate-950/60 backdrop-blur px-3 py-1 rounded-lg text-xs font-medium border border-slate-800">
              You (Me)
            </div>
          </div>

          {/* Remote Videos */}
          {Array.from(remoteStreams.entries()).map(([id, stream]) => (
             <div key={id} className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
                <RemoteVideo stream={stream} />
                <div className="absolute bottom-4 left-4 bg-slate-950/60 backdrop-blur px-3 py-1 rounded-lg text-xs font-medium border border-slate-800">
                  Remote Peer ({id.slice(0, 4)})
                </div>
             </div>
          ))}
        </div>

        {/* Control Bar */}
        <div className="h-24 sticky bottom-2 w-full flex items-center justify-center gap-6 mt-auto">
          <div className="flex items-center gap-6 bg-slate-900/80 backdrop-blur-2xl border border-slate-800 px-8 py-4 rounded-full shadow-2xl">
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-all ${audioMuted ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
            >
              {audioMuted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all ${videoOff ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
            >
              {videoOff ? 'Show Video' : 'Stop Video'}
            </button>
            <div className="h-8 w-[1px] bg-slate-700 mx-2" />
            <button
              onClick={() => window.location.href = '/'}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-semibold transition-all shadow-lg shadow-red-500/20"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className="w-full h-full object-cover"
    />
  );
}
