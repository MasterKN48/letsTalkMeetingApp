'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { MediasoupClient } from '@/lib/mediasoup';
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
} from 'lucide-react';

export default function RoomPage() {
  const { roomId } = useParams() as { roomId: string };
  const [userName, setUserName] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, { stream: MediaStream, userName: string }>>(new Map()); // Key: userId
  const [isJoined, setIsJoined] = useState(false);
  const [showLobby, setShowLobby] = useState(true);
  const [joiningStatus, setJoiningStatus] = useState('');
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        
        const params = new URLSearchParams(window.location.search);
        const nameFromUrl = params.get('name');
        if (nameFromUrl) setUserName(nameFromUrl);
      } catch (err) {
        console.error('Mic/Cam access denied:', err);
        setError('Camera/Microphone access denied. Please enable permissions in your browser.');
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
    if (!userName.trim()) return setError('Please enter your name');
    setError(null);
    setJoiningStatus('Authenticating...');
    setShowLobby(false);

    if (!userIdRef.current) {
        userIdRef.current = `user-${Math.floor(Math.random() * 1000)}`;
    }
    const userId = userIdRef.current;

    try {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
      const authRes = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userName, roomId })
      });
      
      if (!authRes.ok) throw new Error('Authorization failed. Is the server running?');
      const { token } = await authRes.json();

      setJoiningStatus('Connecting to signaling server...');
      const client = new MediasoupClient(
        roomId, 
        (producerId, kind, pName, pId) => handleNewProducer(producerId, kind, pName, pId),
        (producerId, pId) => handleProducerClosed(producerId, pId)
      );
      clientRef.current = client;

      await client.connect(token);
      
      setJoiningStatus('Joining room...');
      const existingProducers = await client.joinRoom();
      
      setJoiningStatus('Setting up media transports...');
      await client.initTransports();

      setJoiningStatus('Publishing media...');
      if (localStream) {
        for (const track of localStream.getTracks()) {
          await client.produce(track);
        }
      }

      setJoiningStatus('Syncing remote participants...');
      for (const p of existingProducers) {
        handleNewProducer(p.producerId, p.kind, p.userName, p.userId);
      }

      setIsJoined(true);
      setJoiningStatus('');
    } catch (err: unknown) {
      console.error('Join failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to join room';
      setError(message || 'Failed to join room. Please check your connection.');
      setShowLobby(true);
      setJoiningStatus('');
    }
  };

  const handleNewProducer = async (producerId: string, kind: string, producerUserName: string, producerUserId: string) => {
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
            next.set(producerUserId, { stream: newStream, userName: producerUserName });
          } else {
            const incomingStream = new MediaStream([consumer.track]);
            next.set(producerUserId, { stream: incomingStream, userName: producerUserName });
          }
          return next;
        });
    } catch (err) {
        console.error('Error consuming producer:', err);
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

  if (showLobby) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
        <div className="w-full max-w-xl space-y-8 bg-slate-900/50 p-8 rounded-3xl border border-slate-800 backdrop-blur-2xl shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent italic">
              LETS TALK
            </h1>
            <p className="text-slate-400 font-medium">Room ID: <span className="text-blue-400 font-mono">{roomId}</span></p>
          </div>

          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group transition-all hover:border-blue-500/50">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transform -scale-x-100 ${videoOff ? 'hidden' : ''}`}
            />
            {(!localStream || videoOff) && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="w-24 h-24 rounded-full bg-slate-800/50 backdrop-blur-xl border border-slate-700 flex items-center justify-center text-4xl font-bold bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 shadow-2xl overflow-hidden">
                  <User size={48} className="text-slate-500" />
                </div>
              </div>
            )}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
               <button 
                 onClick={toggleAudio} 
                 className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${audioMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-900/90 text-white hover:bg-slate-800 hover:scale-105'}`}
               >
                 {audioMuted ? <MicOff size={20} /> : <Mic size={20} />}
               </button>
               <button 
                 onClick={toggleVideo} 
                 className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${videoOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-900/90 text-white hover:bg-slate-800 hover:scale-105'}`}
               >
                 {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
               </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400 ml-1 flex items-center gap-2">
                <User size={14} /> What&apos;s your name?
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter display name"
                className="w-full px-6 py-5 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 ring-blue-500 transition-all outline-none text-lg font-medium placeholder:text-slate-600"
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20 animate-in fade-in slide-in-from-top-2">
                <ShieldCheck size={18} className="rotate-180" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={!!joiningStatus}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-2xl font-bold text-xl transition-all shadow-xl shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {joiningStatus ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="opacity-80 font-medium tracking-wide">{joiningStatus}</span>
                </>
              ) : (
                <>
                  Join Meeting
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center selection:bg-blue-500/30">
      <div className="w-full max-w-7xl flex flex-col flex-1 h-full gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-center py-4 px-8 bg-slate-900/40 backdrop-blur-2xl border border-slate-800/60 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent italic tracking-tighter">
              LETS TALK
            </h2>
            <div className="h-6 w-[1px] bg-slate-800 hidden md:block" />
            <span className="text-slate-400 font-mono text-sm hidden md:block">{roomId}</span>
          </div>
          
          <div className="flex items-center gap-6">
             {joiningStatus && (
               <div className="flex items-center gap-2">
                 <Loader2 size={14} className="text-blue-500 animate-spin" />
                 <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{joiningStatus}</span>
               </div>
             )}
             <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold uppercase tracking-tight">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="opacity-80">{isJoined ? 'Live' : 'Connecting'}</span>
             </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr min-h-0">
          
          {/* Local Video */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group h-full">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transform ${!videoOff ? '-scale-x-100' : 'hidden'}`}
            />
            {videoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="w-32 h-32 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center text-5xl font-bold bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 text-slate-300 shadow-2xl">
                   <User size={64} className="text-slate-600" />
                </div>
              </div>
            )}
            <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold border border-white/5 tracking-wide">
              <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
              {userName} (You)
            </div>
          </div>

          {/* Remote Videos */}
          {Array.from(remoteStreams.entries()).map(([id, { stream, userName: remoteName }]) => (
             <div key={id} className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-700 h-full">
                <RemoteVideo stream={stream} />
                <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold border border-white/5 tracking-wide text-blue-400">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  {remoteName}
                </div>
             </div>
          ))}
        </div>

        {/* Control Bar */}
        <div className="h-28 sticky bottom-4 w-full flex items-center justify-center mt-auto">
          <div className="flex items-center gap-8 bg-slate-900/60 backdrop-blur-[40px] border border-white/10 px-10 py-5 rounded-[3rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]">
            <button
              onClick={toggleAudio}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${audioMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:scale-110'}`}
            >
              {audioMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${videoOff ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:scale-110'}`}
            >
              {videoOff ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
            <div className="h-8 w-[1px] bg-slate-700/50 mx-2" />
            <button
              onClick={() => window.location.href = '/'}
              className="px-10 py-5 bg-red-600 hover:bg-red-500 text-white rounded-3xl font-bold transition-all shadow-xl shadow-red-500/30 hover:scale-[1.02] active:scale-95 text-lg flex items-center gap-3"
            >
              <PhoneOff size={22} />
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
