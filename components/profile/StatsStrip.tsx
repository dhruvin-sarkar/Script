"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface CountUpProps {
  value: number;
  label: string;
  icon?: string;
  className?: string;
}

function CountUp({ value, label, icon, className }: CountUpProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  const spring = useSpring(0, {
    mass: 1,
    stiffness: 100,
    damping: 30,
  });
  
  const display = useTransform(spring, (current) => 
    Math.round(current).toLocaleString()
  );

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  return (
    <div ref={ref} className={cn("flex flex-col items-center justify-center p-6 bg-card border rounded-xl shadow-sm hover:border-accent/40 transition-colors group", className)}>
      <div className="text-3xl font-bold text-primary mb-1">
        {icon && <span className="mr-2 opacity-80 group-hover:scale-110 inline-block transition-transform">{icon}</span>}
        <motion.span>{display}</motion.span>
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{label}</div>
    </div>
  );
}

interface StatsStripProps {
  stats: {
    posts: number;
    reputation: number;
    followers: number;
    streak: number;
  };
}

export function StatsStrip({ stats }: StatsStripProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      <CountUp value={stats.posts} label="Total Posts" icon="📝" />
      <CountUp value={stats.reputation} label="Reputation" icon="⚡" />
      <CountUp value={stats.followers} label="Followers" icon="👥" />
      <CountUp value={stats.streak} label="Current Streak" icon="🔥" />
    </div>
  );
}
