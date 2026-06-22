"use client";

import { motion } from 'framer-motion';
import { FlashinhoExpression } from "@/components/ui/flashinho-expression";
import { MotivationalMessage } from '@/lib/performance-utils';

interface MotivationalHeaderProps {
  message: MotivationalMessage;
  currentCard: number;
  totalCards: number;
}

export function MotivationalHeader({ message, currentCard, totalCards }: MotivationalHeaderProps) {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center mb-6">
        <span className="text-white/70 text-sm font-medium">
          {currentCard} / {totalCards}
        </span>
      </div>

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          duration: 0.6,
          type: "spring",
          stiffness: 200,
          damping: 15
        }}
        className="mb-6"
      >
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 rounded-full opacity-80"></div>
          <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-blue-400 rounded-full opacity-60"></div>
          <div className="absolute top-3 -left-2 w-2 h-2 bg-green-400 rounded-full opacity-70"></div>
          <div className="absolute -top-1 left-4 w-2 h-2 bg-yellow-400 rounded-full opacity-80"></div>
          
          <div className="bg-orange-500 p-1.5 rounded-[1rem] shadow-lg relative z-10">
            <FlashinhoExpression
              variant={message.mascotVariant}
              alt={message.title}
              className="h-40 w-40 sm:h-48 sm:w-48"
              sizes="(max-width: 640px) 160px, 192px"
            />
          </div>
          
          <div className="absolute -bottom-2 right-1 w-3 h-3 bg-pink-400 rounded-full opacity-60"></div>
          <div className="absolute top-1 right-3 w-2 h-2 bg-cyan-400 rounded-full opacity-70"></div>
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-3xl font-bold text-white mb-3"
      >
        {message.title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-white/80 text-lg max-w-md mx-auto leading-relaxed"
      >
        {message.subtitle}
      </motion.p>
    </div>
  );
}
