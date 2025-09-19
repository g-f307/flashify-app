"use client";

import { motion } from 'framer-motion';

interface StatsBadgeConsistentProps {
  label: string;
  count: number;
  variant: 'success' | 'warning' | 'info' | 'default';
  delay?: number;
}

export function StatsBadge({ label, count, variant, delay = 0 }: StatsBadgeConsistentProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-primary',
          text: 'text-primary-foreground',
          border: 'border-primary'
        };
      case 'warning':
        return {
          bg: 'bg-secondary', 
          text: 'text-secondary-foreground',
          border: 'border-secondary'
        };
      case 'info':
        return {
          bg: 'bg-accent',
          text: 'text-accent-foreground',
          border: 'border-accent'
        };
      default:
        return {
          bg: 'bg-muted',
          text: 'text-muted-foreground',
          border: 'border-muted'
        };
    }
  };

  const classes = getVariantClasses();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      className={`
        flex items-center justify-between
        px-4 py-3 rounded-full
        ${classes.bg} ${classes.text}
        shadow-lg
        min-w-[140px]
        transition-all duration-200
        hover:scale-105 hover:shadow-xl
        glow-on-hover
      `}
    >
      <span className="font-medium text-sm">
        {label}
      </span>
      <span className="font-bold text-lg ml-2">
        {count}
      </span>
    </motion.div>
  );
}
