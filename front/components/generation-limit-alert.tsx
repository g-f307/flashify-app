import React from 'react';
import { Sparkles, Clock } from "lucide-react";
import { GenerationLimitInfo } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GenerationLimitAlertProps {
  limitInfo: GenerationLimitInfo;
  className?: string;
}

export function GenerationLimitAlert({ limitInfo, className }: GenerationLimitAlertProps) {
  const { used, remaining, limit, hours_until_reset } = limitInfo;
  const percentage = (used / limit) * 100;
  
  const getVariant = () => {
    if (percentage >= 90) return {
      bg: "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700",
      text: "text-white",
      barBg: "bg-red-600 dark:bg-red-700",
      statusText: "text-red-600 dark:text-red-400"
    };
    if (percentage >= 70) return {
      bg: "bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700",
      text: "text-white",
      barBg: "bg-orange-600 dark:bg-orange-700",
      statusText: "text-orange-600 dark:text-orange-400"
    };
    return {
      bg: "bg-primary hover:bg-primary/90",
      text: "text-primary-foreground",
      barBg: "bg-primary/80",
      statusText: "text-primary"
    };
  };

  const variant = getVariant();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {/* Usando div ao invés de Badge para evitar problema com refs */}
          <div
            className={cn(
              "fixed top-20 right-4 z-50 cursor-help shadow-lg hover:shadow-xl transition-all",
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              "text-sm font-semibold",
              "md:top-4",
              variant.bg,
              variant.text,
              className
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="tabular-nums">
              {used}/{limit}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="end"
          className="max-w-[280px] p-4"
        >
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-sm mb-1">Gerações Diárias</p>
              <p className="text-xs text-muted-foreground">
                Você usou <strong className={variant.statusText}>{used} de {limit}</strong> gerações hoje
              </p>
            </div>
            
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all rounded-full",
                    variant.barBg
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", variant.statusText)}>
                  {remaining > 0 ? (
                    <>{remaining} disponível{remaining !== 1 && 's'}</>
                  ) : (
                    <>Limite atingido</>
                  )}
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Renova em {hours_until_reset}h
                </span>
              </div>
            </div>

            {remaining === 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 Enquanto aguarda, revise seus decks!
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}