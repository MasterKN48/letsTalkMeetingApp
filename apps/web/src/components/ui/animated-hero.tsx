"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface AnimatedHeroProps {
    /** Hero title text */
    title?: string;
    /** Whether to show the theme toggle button */
    showThemeToggle?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Force specific theme rendering */
    forceTheme?: "dark" | "light";
}

export function AnimatedHero({
    title = "AN AWESOME TITLE",
    showThemeToggle = true,
    className = "",
    forceTheme,
}: AnimatedHeroProps) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const mounted = useSyncExternalStore(
        () => () => {},         // no-op subscribe — nothing to unsubscribe
        () => true,             // client snapshot: we are mounted
        () => false,            // server snapshot: not yet mounted (SSR)
    );

    const isDark = forceTheme ? forceTheme === "dark" : resolvedTheme === "dark";

    const toggleTheme = () => {
        setTheme(isDark ? "light" : "dark");
    };

    if (!mounted) {
        return <div className={cn("relative w-full h-[500px] bg-background", className)} />;
    }

    return (
        <section className={cn("relative w-full h-auto", className)}>
            {/* Aurora Background Layer */}
            <div
                className="absolute inset-0 transition-all duration-1000 overflow-hidden"
                style={{
                    background: isDark 
                        ? "radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%)" 
                        : "radial-gradient(circle at 50% 50%, #f0f9ff 0%, #ffffff 100%)",
                }}
            >
                <div
                    className="absolute inset-x-0 top-0 h-[500px] animate-aurora-bg mix-blend-screen opacity-50 blur-[80px]"
                    style={{
                        backgroundImage: `
                            repeating-linear-gradient(
                                100deg,
                                rgba(59, 130, 246, 0.5) 10%,
                                rgba(139, 92, 246, 0.5) 15%,
                                rgba(59, 130, 246, 0.5) 20%,
                                rgba(6, 182, 212, 0.5) 25%,
                                rgba(59, 130, 246, 0.5) 30%
                            )
                        `,
                        backgroundSize: "200%, 100%",
                    }}
                />
                <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px]" />
            </div>

            {/* Content Area */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[clamp(3.5rem,10vw,10rem)] font-black tracking-tighter leading-none select-none italic"
                >
                    <span className="bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent drop-shadow-2xl">
                        {title}
                    </span>
                    <span className="absolute inset-0 blur-3xl opacity-20 bg-primary/30 -z-10 rounded-full animate-pulse" />
                </motion.h1>

                {showThemeToggle && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        onClick={toggleTheme}
                        className="mt-12 group flex items-center gap-3 px-6 py-3 rounded-full border border-border bg-background/50 backdrop-blur-xl hover:bg-background transition-all shadow-xl hover:shadow-primary/10 active:scale-95"
                    >
                        <motion.div
                            animate={{ rotate: isDark ? 180 : 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            className="text-primary"
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </motion.div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors">
                            {isDark ? "Light Mode" : "Dark Mode"}
                        </span>
                    </motion.button>
                )}
            </div>
        </section>
    );
}

export default AnimatedHero;
