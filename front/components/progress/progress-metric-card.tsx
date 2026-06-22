"use client";

import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProgressTrend } from "@/lib/api";
import type { ReactNode } from "react";

type AccentKey = "flashcards" | "quiz" | "guided" | "performance";

const accentStyles: Record<
  AccentKey,
  {
    iconWrap: string;
    iconColor: string;
    valueColor: string;
  }
> = {
  flashcards: {
    iconWrap: "bg-[#fdbe0c]/12 border-[#fdbe0c]/25 dark:bg-[#3c3213] dark:border-[#6a5719]",
    iconColor: "text-[#e5a600] dark:text-[#ffd76e]",
    valueColor: "text-[#f2ab00] dark:text-[#fdbe0c]",
  },
  quiz: {
    iconWrap: "bg-[#2bacf2]/12 border-[#2bacf2]/20 dark:bg-[#162a36] dark:border-[#23485d]",
    iconColor: "text-[#2bacf2] dark:text-[#8ad8ff]",
    valueColor: "text-[#2bacf2]",
  },
  guided: {
    iconWrap: "bg-[#52ba6b]/12 border-[#52ba6b]/20 dark:bg-[#1a3020] dark:border-[#2f5a39]",
    iconColor: "text-[#52ba6b] dark:text-[#9ed9aa]",
    valueColor: "text-[#52ba6b]",
  },
  performance: {
    iconWrap: "bg-[#2bacf2]/12 border-[#2bacf2]/20 dark:bg-[#162a36] dark:border-[#23485d]",
    iconColor: "text-[#2bacf2] dark:text-[#8ad8ff]",
    valueColor: "text-[#2bacf2]",
  },
};

interface ProgressMetricCardProps {
  title: string;
  icon: LucideIcon;
  accent: AccentKey;
  value: string;
  subtitle: string;
  trend: ProgressTrend;
  visualization?: ReactNode;
  className?: string;
}

export function ProgressMetricCard({
  title,
  icon: Icon,
  accent,
  value,
  subtitle,
  className,
}: ProgressMetricCardProps) {
  const styles = accentStyles[accent];

  return (
    <Card
      className={cn(
        "flex min-h-[176px] flex-col rounded-[24px] border border-[#e7edf3] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(24,39,56,0.05)] dark:border-zinc-800 dark:bg-[#23262f]/95",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl border",
              styles.iconWrap
            )}
          >
            <Icon className={cn("h-5 w-5", styles.iconColor)} />
          </div>
          <p className="truncate text-sm font-semibold text-[#2a3a52] dark:text-white/90">{title}</p>
        </div>
      </div>

      <div className="mt-6 flex-1">
        <p className={cn("text-[2.35rem] font-bold leading-none tracking-tight", styles.valueColor)}>{value}</p>
        <p className="mt-3 max-w-[24ch] text-sm leading-6 text-[#627089] dark:text-white/65">{subtitle}</p>
      </div>
    </Card>
  );
}
