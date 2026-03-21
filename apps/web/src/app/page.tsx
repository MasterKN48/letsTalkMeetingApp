import LandingClient from '@/components/landing-client';
import { Metadata } from 'next';

// Next.js will cache this page by default as a static asset if there are no dynamic functions
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
  return (
    <LandingClient />
  );
}
