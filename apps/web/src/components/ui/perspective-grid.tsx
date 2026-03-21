"use client";

import React, { useSyncExternalStore, useMemo } from "react";
import { cn } from "@/lib/utils";

interface PerspectiveGridProps {
    /** Additional CSS classes for the grid container */
    className?: string;
    /** Grid line color */
    gridColor?: string;
    /** Number of tiles per row/column (default: 40) */
    gridSize?: number;
    /** Whether to show the gradient overlay (default: true) */
    showOverlay?: boolean;
    /** Fade radius percentage for the gradient overlay (default: 80) */
    fadeRadius?: number;
}


export function PerspectiveGrid({
    className,
    gridColor,
    gridSize = 40,
    showOverlay = true,
    fadeRadius = 80,
}: PerspectiveGridProps) {
    // useSyncExternalStore is the React-recommended way to detect client-side
    // rendering without causing a cascading re-render from useEffect + setState.
    // It returns the client snapshot immediately on the client, and the server
    // snapshot during SSR — no extra render cycle needed.
    const mounted = useSyncExternalStore(
        () => () => {},           // subscribe: no-op (nothing to subscribe to)
        () => true,               // getSnapshot (client): always mounted
        () => false               // getServerSnapshot (SSR): never mounted
    );

    // Memoize tiles array to prevent unnecessary re-renders
    const tiles = useMemo(() => Array.from({ length: gridSize * gridSize }), [gridSize]);

    return (
        <div
            className={cn(
                "relative w-full h-full overflow-hidden bg-white dark:bg-black",
                "[--fade-stop:#ffffff] dark:[--fade-stop:#000000]",
                className
            )}
            style={{
                perspective: "2000px",
                transformStyle: "preserve-3d",
            }}
        >
            <div
                className="absolute w-[80rem] aspect-square grid origin-center"
                style={{
                    left: "50%",
                    top: "50%",
                    transform:
                        "translate(-50%, -50%) rotateX(30deg) rotateY(-5deg) rotateZ(20deg) scale(2)",
                    transformStyle: "preserve-3d",
                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                    gridTemplateRows: `repeat(${gridSize}, 1fr)`,
                }}
            >
                {/* Tiles */}
                {mounted &&
                    tiles.map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "tile min-h-[1px] min-w-[1px] border bg-transparent transition-colors duration-[1500ms] hover:duration-0",
                                !gridColor && "border-gray-300 dark:border-gray-700"
                            )}
                            style={{ borderColor: gridColor }}
                        />
                    ))}
            </div>

            {/* Radial Gradient Mask (Overlay) */}
            {showOverlay && (
                <div
                    className="absolute inset-0 pointer-events-none z-10"
                    style={{
                        background: `radial-gradient(circle, transparent 25%, var(--fade-stop) ${fadeRadius}%)`,
                    }}
                />
            )}
        </div>
    );
}

export default PerspectiveGrid;
