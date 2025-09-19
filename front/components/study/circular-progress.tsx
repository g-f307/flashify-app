"use client";

import { useEffect, useState } from 'react';

interface CircularProgressConsistentProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  correctCount?: number;
  partialCount?: number;
  totalCount?: number;
}

export function CircularProgress({
  percentage,
  size = 200,
  strokeWidth = 12,
  showPercentage = true,
  correctCount = 0,
  partialCount = 0,
  totalCount = 0
}: CircularProgressConsistentProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [animatedCorrect, setAnimatedCorrect] = useState(0);
  const [animatedPartial, setAnimatedPartial] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Calcula as proporções para cada segmento
  const correctProportion = totalCount > 0 ? correctCount / totalCount : 0;
  const partialProportion = totalCount > 0 ? partialCount / totalCount : 0;
  
  const correctOffset = circumference - (animatedCorrect * correctProportion * circumference);
  const partialOffset = circumference - (animatedPartial * partialProportion * circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
      setAnimatedCorrect(1);
      setAnimatedPartial(1);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Círculo de fundo usando cor do sistema */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-30"
        />
        
        {/* Círculo de progresso parcial (usando cor secundária) */}
        {partialCount > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--secondary))"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={partialOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              transformOrigin: '50% 50%',
              transform: `rotate(${correctProportion * 360}deg)`
            }}
          />
        )}
        
        {/* Círculo de progresso correto (usando cor primária) */}
        {correctCount > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={correctOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        )}
      </svg>
      
      {/* Texto central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-4xl font-bold text-foreground transition-all duration-1000 ease-out">
            {Math.round(animatedPercentage)}%
          </span>
        )}
        {totalCount > 0 && (
          <span className="text-sm text-muted-foreground mt-1">
            {totalCount} cards
          </span>
        )}
      </div>
    </div>
  );
}
