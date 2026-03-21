import { Suspense } from 'react';
import { Metadata } from 'next';

type Props = {
    params: { roomId: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { roomId } = await params;
    
    return {
        title: `Join Meeting: ${roomId} | Let'sTalk`,
        description: "Join this high-performance secure room on Let'sTalk to start collaborating instantly.",
        openGraph: {
            title: `Join Meeting - ${roomId}`,
            description: "Join this high-performance secure room on Let'sTalk to start collaborating instantly.",
            images: [
                {
                    url: '/icons/icon.png',
                    width: 512,
                    height: 512,
                    alt: "Let'sTalk Logo",
                },
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `Join Meeting - ${roomId} | Let'sTalk`,
            description: "Join this high-performance secure room on Let'sTalk to start collaborating instantly.",
            images: ['/icons/icon.png'],
        },
    };
}

export default function RoomLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <Suspense>{children}</Suspense>;
}
