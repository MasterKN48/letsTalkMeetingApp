"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * A standalone, self-contained theme toggle button.
 * Renders ONLY the button — no background, no section wrapper, no extra spacing.
 */
export function ThemeToggleButton() {
    const { setTheme, resolvedTheme } = useTheme();
    const mounted = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );

    if (!mounted) return null;

    const isDark = resolvedTheme === "dark";

    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="group flex items-center gap-3 px-5 py-2.5 rounded-full border border-border/60 bg-background/70 backdrop-blur-xl hover:bg-background hover:border-border transition-all shadow-lg hover:shadow-primary/10 active:scale-95 cursor-pointer"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
            <motion.div
                animate={{ rotate: isDark ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="text-primary flex-shrink-0"
            >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </motion.div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
                {isDark ? "Light Mode" : "Dark Mode"}
            </span>
        </motion.button>
    );
}

export default ThemeToggleButton;
