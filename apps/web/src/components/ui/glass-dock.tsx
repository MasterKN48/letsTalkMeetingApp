'use client';
import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface DockItem {
    title: string;
    icon: LucideIcon;
    onClick?: () => void;
    href?: string;
    activeClassName?: string;
    iconClassName?: string;
}

export interface GlassDockProps extends React.HTMLAttributes<HTMLDivElement> {
    items: DockItem[];
    dockClassName?: string;
}

export const GlassDock = React.forwardRef<HTMLDivElement, GlassDockProps>((
    { items, className, dockClassName, ...props }, ref
) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [direction, setDirection] = useState(0);

    const handleMouseEnter = (index: number) => {
        if (hoveredIndex !== null && index !== hoveredIndex) {
            setDirection(index > hoveredIndex ? 1 : -1);
        }
        setHoveredIndex(index);
    };

    return (
        <div ref={ref} className={cn('w-max', className)} {...props}>
            <div className={cn(
                "relative flex gap-4 items-center px-6 py-4 rounded-[2.5rem]",
                "glass-border bg-background/80 border border-border/50",
                "backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]",
                dockClassName
            )}
                onMouseLeave={() => {
                    setHoveredIndex(null);
                    setDirection(0);
                }}
            >
                <AnimatePresence>
                    {hoveredIndex !== null && (
                        <motion.div
                            layoutId="dock-tooltip"
                            initial={{ opacity: 0, scale: 0.9, y: 10, x: hoveredIndex * 64 }}
                            animate={{
                                opacity: 1, 
                                scale: 1, 
                                y: -70, 
                                x: (hoveredIndex * 64) + 24 // Updated center for w-12 (48px) + gap-4 (16px) = 64px pitch
                            }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                            className="absolute top-0 left-6 pointer-events-none z-30 -translate-x-1/2"
                        >
                            <div className={cn(
                                'px-4 py-1.5 rounded-full whitespace-nowrap',
                                'bg-foreground text-background font-black text-[11px] uppercase tracking-widest',
                                'shadow-xl border border-border/20'
                            )}>
                                <AnimatePresence mode="popLayout" custom={direction}>
                                    <motion.span
                                        key={items[hoveredIndex].title}
                                        custom={direction}
                                        initial={{ x: direction > 0 ? 20 : -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: direction > 0 ? -20 : 20, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="block"
                                    >
                                        {items[hoveredIndex].title}
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {items.map((el, index) => {
                    const Icon = el.icon;
                    const isHovered = hoveredIndex === index;
                    
                    const handleClick = () => {
                        if (el.onClick) {
                            el.onClick();
                        } else if (el.href) {
                            window.location.href = el.href;
                        }
                    };
                    
                    return (
                        <div
                            key={index}
                            onMouseEnter={() => handleMouseEnter(index)}
                            onClick={handleClick}
                            className="relative w-12 h-12 flex items-center justify-center cursor-pointer group"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleClick();
                                }
                            }}
                        >
                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                animate={{
                                    scale: isHovered ? 1.15 : 1,
                                    y: isHovered ? -5 : 0,
                                }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                className={cn(
                                    "flex items-center justify-center w-full h-full rounded-full transition-all duration-300", 
                                    el.activeClassName ? el.activeClassName : (isHovered ? "bg-muted" : "bg-transparent")
                                )}
                            >
                                <Icon
                                    size={22}
                                    strokeWidth={2.8}
                                    className={cn(
                                        'transition-colors duration-200',
                                        'text-foreground group-hover:text-foreground',
                                        el.iconClassName
                                    )}
                                />
                            </motion.div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

GlassDock.displayName = 'GlassDock';
export default GlassDock;
