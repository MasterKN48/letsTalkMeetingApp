'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const router = useRouter();

  const createRoom = () => {
    if (!userName.trim()) return alert('Please enter your name');
    const newRoomId = Math.random().toString(36).substring(2, 9);
    router.push(`/room/${newRoomId}?name=${encodeURIComponent(userName.trim())}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && userName.trim()) {
      router.push(`/room/${roomId.trim()}?name=${encodeURIComponent(userName.trim())}`);
    } else if (!userName.trim()) {
      alert('Please enter your name');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
      
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16" />
        
        <h1 className="text-4xl font-bold text-white mb-2 text-center bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          AstroMeet
        </h1>
        <p className="text-slate-400 text-center mb-8 font-light">
          Premium SFU Video Conferencing
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Your Display Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>

          <button
            onClick={createRoom}
            disabled={!userName.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:grayscale"
          >
            Create New Meeting
          </button>

          <div className="relative flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-slate-800" />
            <span className="text-slate-500 text-sm">OR JOIN EXISTING</span>
            <div className="h-[1px] flex-1 bg-slate-800" />
          </div>

          <form onSubmit={joinRoom} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter Room Code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!roomId.trim() || !userName.trim()}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Room
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center text-slate-500 text-xs uppercase tracking-widest font-medium">
          Secure • SFU Powered • Open Source
        </div>
      </div>
    </main>
  );
}
