import React from 'react';
import { Badge } from "@/components/ui/badge";
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
  
  const getBadgeVariant = () => {
    if (percentage >= 90) return "destructive";
    if (percentage >= 70) return "secondary";
    return "default";
  };

  const getTextColor = () => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-orange-600 dark:text-orange-400";
    return "text-primary";
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge 
            variant={getBadgeVariant()} 
            className={cn(
              // --- ALTERAÇÃO AQUI ---
              // Padrão (mobile): 80px do topo (top-20)
              // Telas médias (md) e maiores: volta para 16px do topo (md:top-4)
              "fixed top-20 right-4 z-50 gap-1.5 px-3 py-1.5 cursor-help shadow-lg hover:shadow-xl transition-shadow md:top-4",
              className
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-semibold tabular-nums">
              {used}/{limit}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent 
          // Voltado para "bottom", pois agora há espaço
          side="bottom" 
          align="end"
          className="max-w-[280px] p-4"
        >
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-sm mb-1">Gerações Diárias</p>
              <p className="text-xs text-muted-foreground">
                Você usou <strong className={getTextColor()}>{used} de {limit}</strong> gerações hoje
              </p>
            </div>
            
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all rounded-full",
                    percentage >= 90 ? "bg-destructive" :
                    percentage >= 70 ? "bg-orange-500" :
                    "bg-primary"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", getTextColor())}>
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