"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpenCheck, Map, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  GuidedPathRecommendation,
  QuizRecommendation,
  ReviewRecommendation,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function ActionCard({
  eyebrow,
  title,
  subtitle,
  actionUrl,
  actionLabel,
  icon,
  tone,
  progress,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actionUrl?: string | null;
  actionLabel: string;
  icon: ReactNode;
  tone: "guided" | "quiz" | "review";
  progress?: string;
}) {
  const toneClasses = {
    guided:
      "border-[#d9efe0] bg-[#f4fbf6] dark:border-[#2d4c35] dark:bg-[#17231a]",
    quiz:
      "border-[#d7effd] bg-[#f5fbff] dark:border-[#25445a] dark:bg-[#16202b]",
    review:
      "border-[#f7e4b7] bg-[#fff9eb] dark:border-[#4d4124] dark:bg-[#251f13]",
  } as const;

  const buttonClasses = {
    guided: "border-[#52ba6b]/25 text-[#1e7c37] hover:bg-[#52ba6b]/10 dark:text-[#92daa2]",
    quiz: "border-[#2bacf2]/25 text-[#1779af] hover:bg-[#2bacf2]/10 dark:text-[#8ad8ff]",
    review: "border-[#fdbe0c]/25 text-[#c38400] hover:bg-[#fdbe0c]/10 dark:text-[#f3d276]",
  } as const;

  return (
    <Card className={cn("rounded-[22px] border p-5 shadow-[0_2px_8px_rgba(24,39,56,0.05)]", toneClasses[tone])}>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white/85 shadow-sm dark:bg-white/5">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#46556d] dark:text-white/60">{eyebrow}</p>
          <h4 className="mt-1 line-clamp-1 text-lg font-bold text-[#182738] dark:text-white">{title}</h4>
          <p className="mt-1 text-sm text-[#627089] dark:text-white/65">{subtitle}</p>

          {progress ? (
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/6 dark:bg-white/8">
                <div
                  className={cn(
                    "h-full rounded-full",
                    tone === "guided"
                      ? "bg-[#52ba6b]"
                      : tone === "quiz"
                        ? "bg-[#2bacf2]"
                        : "bg-[#fdbe0c]"
                  )}
                  style={{ width: progress }}
                />
              </div>
              <span className="text-xs font-semibold text-[#627089] dark:text-white/60">{progress}</span>
            </div>
          ) : null}
        </div>

        {actionUrl ? (
          <Button
            asChild
            variant="outline"
            className={cn("h-11 rounded-2xl px-5 font-semibold", buttonClasses[tone])}
          >
            <Link href={actionUrl}>
              {actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled
            className="h-11 rounded-2xl px-5 font-semibold"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}

interface ProgressNextActionsProps {
  guidedPath: GuidedPathRecommendation | null;
  quiz: QuizRecommendation | null;
  review: ReviewRecommendation;
  className?: string;
}

export function ProgressNextActions({
  guidedPath,
  quiz,
  review,
  className,
}: ProgressNextActionsProps) {
  return (
    <div className={cn("grid gap-4 xl:grid-cols-3", className)}>
      <ActionCard
        eyebrow={guidedPath?.step_label ?? "Estudo guiado indisponível"}
        title={guidedPath?.title ?? "Libere uma trilha guiada em um deck completo"}
        subtitle={guidedPath?.progress_label ?? "Gere flashcards e quiz para habilitar essa experiência."}
        actionUrl={guidedPath?.action_url ?? null}
        actionLabel={guidedPath?.action_label ?? "Explorar"}
        tone="guided"
        progress={guidedPath ? `${guidedPath.progress}%` : undefined}
        icon={<Map className="h-7 w-7 text-[#52ba6b]" />}
      />

      <ActionCard
        eyebrow="Próximo quiz sugerido"
        title={quiz?.title ?? "Nenhum quiz disponível agora"}
        subtitle={quiz ? `${quiz.question_count} questões - ${quiz.difficulty_label}` : "Finalize um deck com quiz para receber recomendações."}
        actionUrl={quiz?.action_url ?? null}
        actionLabel={quiz?.action_label ?? "Explorar"}
        tone="quiz"
        icon={<Target className="h-7 w-7 text-[#2bacf2]" />}
      />

      <ActionCard
        eyebrow="Revisão inteligente"
        title={review.title}
        subtitle={review.subtitle}
        actionUrl={review.action_url}
        actionLabel={review.action_label}
        tone="review"
        icon={<BookOpenCheck className="h-7 w-7 text-[#fdbe0c]" />}
      />
    </div>
  );
}
