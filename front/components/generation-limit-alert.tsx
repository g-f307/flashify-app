import React from "react";
import Link from "next/link";
import { Clock, HelpCircle } from "lucide-react";
import { GenerationLimitInfo } from "@/lib/api";
import { cn } from "@/lib/utils";

interface GenerationLimitAlertProps {
  limitInfo: GenerationLimitInfo;
  className?: string;
  variant?: "default" | "compact" | "inline";
}

export function GenerationLimitAlert({
  limitInfo,
  className,
  variant = "default",
}: GenerationLimitAlertProps) {
  const { used, remaining, limit, hours_until_reset } = limitInfo;
  const percentage = (used / limit) * 100;

  const statusTone =
    percentage >= 90
      ? "text-red-600 dark:text-red-400"
      : percentage >= 70
        ? "text-orange-600 dark:text-orange-400"
        : "text-foreground";

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "w-full max-w-[210px] rounded-xl border border-border/60 bg-background/85 px-3 py-2 text-left shadow-sm backdrop-blur-sm",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Gerações
            </span>
            <Link
              href="/support/saiba-mais/consumo-ia"
              className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-primary"
              aria-label="Saiba mais sobre consumo de IA"
            >
              <HelpCircle className="h-3 w-3" />
            </Link>
          </div>
          <span className={cn("text-sm font-semibold tabular-nums", statusTone)}>
            {used}/{limit}
          </span>
        </div>

        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border/70">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              percentage >= 90
                ? "bg-red-500"
                : percentage >= 70
                  ? "bg-orange-500"
                  : "bg-primary/80",
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>{remaining > 0 ? `${remaining} restante${remaining !== 1 ? "s" : ""}` : "Limite atingido"}</span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {hours_until_reset}h
          </span>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-end gap-2 whitespace-nowrap text-[11px] text-muted-foreground sm:text-xs",
          className,
        )}
      >
        <span className="font-medium text-foreground tabular-nums">
          {used}/{limit}
        </span>
        <span aria-hidden="true" className="text-border">•</span>
        <span>
          {remaining > 0 ? `${remaining} restante${remaining !== 1 ? "s" : ""}` : "limite atingido"}
        </span>
        <span aria-hidden="true" className="text-border">•</span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Clock className="h-3 w-3" />
          renova em {hours_until_reset}h
        </span>
        <Link
          href="/support/saiba-mais/consumo-ia"
          className="inline-flex shrink-0 items-center text-muted-foreground transition-colors hover:text-primary"
          aria-label="Saiba mais sobre consumo de IA"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto mt-5 max-w-sm rounded-2xl border border-border/60 bg-muted/30 p-4 text-left",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Gerações
            </span>
            <Link
              href="/support/saiba-mais/consumo-ia"
              className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-primary"
              aria-label="Saiba mais sobre consumo de IA"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            {remaining > 0
              ? `${remaining} restante${remaining !== 1 ? "s" : ""} hoje.`
              : "Limite diário atingido."}
          </p>
        </div>

        <div className="text-right">
          <p className={cn("text-lg font-semibold tabular-nums", statusTone)}>
            {used}/{limit}
          </p>
          <p className="text-xs text-muted-foreground">usadas</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/70">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            percentage >= 90
              ? "bg-red-500"
              : percentage >= 70
                ? "bg-orange-500"
                : "bg-primary/80",
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{percentage >= 100 ? "Sem novas gerações no momento" : "Disponível para este deck"}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Renova em {hours_until_reset}h
        </span>
      </div>
    </div>
  );
}
