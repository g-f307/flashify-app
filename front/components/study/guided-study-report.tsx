"use client";

import { useEffect, useMemo } from "react";
import type { FlashinhoExpressionVariant } from "@/lib/flashinho-expression";
import { FlashinhoExpression } from "@/components/ui/flashinho-expression";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  Clock,
  Layers3,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GuidedStudy } from "@/lib/api";
import { formatStudyTime } from "@/lib/performance-utils";
import { StudySessionFeedbackModal } from "@/components/feedback/study-session-feedback-modal";
import { useSound } from "@/contexts/sound-context";

const GUIDED_GREEN = "#7FD9A0";
const GUIDED_GREEN_DARK = "#4FA36E";

type GuidedQuestionResult = {
  questionId: number;
  isCorrect: boolean;
};

interface GuidedStudyReportProps {
  documentId: number;
  guidedStudy: GuidedStudy;
  sessionStartedAt: Date;
  sessionCompletedAt: Date;
  questionResults: GuidedQuestionResult[];
  onRestart: () => void;
  onBack: () => void;
}

function getGuidedMessage(healthScore: number) {
  if (healthScore >= 90) {
    return {
      mascotVariant: "amei" as FlashinhoExpressionVariant,
      title: "Trilha muito bem consolidada",
      subtitle: "Você terminou com ótima segurança no conteúdo revisado.",
    };
  }
  if (healthScore >= 75) {
    return {
      mascotVariant: "boa" as FlashinhoExpressionVariant,
      title: "Boa construção de base",
      subtitle: "A trilha avançou bem. Vale só reforçar alguns pontos.",
    };
  }
  if (healthScore >= 60) {
    return {
      mascotVariant: "ok" as FlashinhoExpressionVariant,
      title: "Aprendizado em evolução",
      subtitle: "Você percorreu a trilha inteira, mas ainda há espaço para fixar melhor os conceitos.",
    };
  }
  return {
    mascotVariant: "ruim" as FlashinhoExpressionVariant,
    title: "Hora de reforçar a trilha",
    subtitle: "A cobertura foi boa, mas a retenção ainda pede uma nova passada.",
  };
}

function getRetentionLabel(accuracy: number) {
  if (accuracy >= 85) return "Alta";
  if (accuracy >= 65) return "Média";
  return "Em consolidação";
}

function GuidedScoreRing({
  percentage,
  correctQuestions,
  totalQuestions,
}: {
  percentage: number;
  correctQuestions: number;
  totalQuestions: number;
}) {
  const size = 150;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="guided-report-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={GUIDED_GREEN} />
            <stop offset="100%" stopColor={GUIDED_GREEN_DARK} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(127, 217, 160, 0.16)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#guided-report-ring)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold text-foreground">{percentage}%</span>
        <span className="mt-1 text-[11px] text-muted-foreground">
          {correctQuestions}/{totalQuestions} acertos
        </span>
      </div>
    </div>
  );
}

export function GuidedStudyReport({
  documentId,
  guidedStudy,
  sessionStartedAt,
  sessionCompletedAt,
  questionResults,
  onRestart,
  onBack,
}: GuidedStudyReportProps) {
  const { playSound } = useSound();
  const stats = useMemo(() => {
    const totalTopics = guidedStudy.summary.topics_count;
    const totalSteps = guidedStudy.summary.steps_count;
    const totalFlashcards = guidedStudy.summary.flashcards_count;
    const totalQuestions = guidedStudy.summary.questions_count;
    const correctQuestions = questionResults.filter((result) => result.isCorrect).length;
    const incorrectQuestions = Math.max(totalQuestions - correctQuestions, 0);
    const quizAccuracy =
      totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 100;
    const healthScore = Math.round(quizAccuracy * 0.7 + 30);

    const weakestTopics = guidedStudy.topics
      .map((topic) => {
        const topicQuestions = topic.steps.filter(
          (step) => step.type === "question" && step.question_id
        );
        if (topicQuestions.length === 0) {
          return null;
        }

        const correct = topicQuestions.filter((step) =>
          questionResults.some(
            (result) => result.questionId === step.question_id && result.isCorrect
          )
        ).length;

        return {
          title: topic.title,
          accuracy: Math.round((correct / topicQuestions.length) * 100),
        };
      })
      .filter((topic): topic is { title: string; accuracy: number } => Boolean(topic))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 2);

    return {
      totalTopics,
      totalSteps,
      totalFlashcards,
      totalQuestions,
      correctQuestions,
      incorrectQuestions,
      quizAccuracy,
      healthScore,
      weakestTopics,
    };
  }, [guidedStudy, questionResults]);

  const message = getGuidedMessage(stats.healthScore);
  const studyTime = formatStudyTime(sessionStartedAt, sessionCompletedAt);
  const retentionLabel = getRetentionLabel(stats.quizAccuracy);

  useEffect(() => {
    playSound(stats.healthScore >= 85 ? "sessionCelebration" : "sessionComplete");
  }, [playSound, stats.healthScore]);

  return (
    <>
      <StudySessionFeedbackModal
        documentId={documentId}
        sessionType="guided"
      />
      <div className="min-h-screen bg-background px-4 py-4 md:px-5 md:py-4">
        <div className="mx-auto max-w-4xl">
          <Card className="overflow-hidden animate-in fade-in-50 duration-500 border border-border/70 bg-card/95 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#7FD9A0]/45 hover:shadow-[0_0_0_1px_rgba(127,217,160,0.18),0_22px_54px_-24px_rgba(127,217,160,0.48)] dark:border-zinc-800 dark:bg-[#23262f]/95 dark:hover:border-[#7FD9A0]/28 dark:hover:shadow-[0_0_0_1px_rgba(127,217,160,0.12),0_22px_54px_-24px_rgba(127,217,160,0.3)] md:p-5 lg:min-h-[calc(100vh-1.5rem)] lg:max-h-[calc(100vh-1.5rem)] lg:p-5">
          <div className="mb-3 flex items-center justify-between lg:mb-2">
            <Button
              onClick={onBack}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground sm:text-sm">
              Trilha finalizada
            </span>
            <div className="h-10 w-10" />
          </div>

          <div className="grid gap-3 lg:h-[calc(100%-2.5rem)] lg:grid-cols-[minmax(250px,0.92fr)_minmax(0,1.08fr)] lg:grid-rows-[1fr_auto]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-[rgba(127,217,160,0.18)] bg-gradient-to-br from-[#7FD9A0]/10 via-transparent to-[#7FD9A0]/4 px-4 py-6 text-center shadow-[inset_0_1px_0_rgba(127,217,160,0.05)] dark:border-[rgba(127,217,160,0.14)] dark:from-[#7FD9A0]/8 dark:via-transparent dark:to-[#7FD9A0]/3 dark:shadow-[inset_0_1px_0_rgba(127,217,160,0.04)] lg:min-h-0 lg:px-6 lg:py-6"
            >
              <div className="mb-3 flex justify-center">
                <div className="relative inline-flex items-center justify-center">
                  <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-emerald-300 opacity-80" />
                  <div className="absolute -bottom-1 -left-3 h-3 w-3 rounded-full bg-[#7FD9A0] opacity-60" />
                  <div className="absolute top-3 -left-2 h-2 w-2 rounded-full bg-emerald-200 opacity-70" />
                  <div className="absolute -top-1 left-4 h-2 w-2 rounded-full bg-[#7FD9A0] opacity-80" />

                  <div className="relative z-10 rounded-[1rem] bg-[#7FD9A0] p-1 text-black shadow-lg sm:p-1.5">
                    <FlashinhoExpression
                      variant={message.mascotVariant}
                      alt={message.title}
                      className="h-44 w-44 sm:h-52 sm:w-52"
                      sizes="(max-width: 640px) 176px, 208px"
                      priority
                    />
                  </div>

                  <div className="absolute -bottom-2 right-1 h-3 w-3 rounded-full bg-emerald-300 opacity-60" />
                  <div className="absolute top-1 right-3 h-2 w-2 rounded-full bg-[#7FD9A0] opacity-70" />
                </div>
              </div>

              <h1 className="max-w-sm text-2xl font-bold leading-tight text-foreground lg:text-[2rem]">
                {message.title}
              </h1>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {message.subtitle}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr]"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
                <div className="rounded-2xl border border-[rgba(127,217,160,0.24)] bg-[#7FD9A0]/10 p-3 dark:border-[rgba(127,217,160,0.16)] dark:bg-[rgba(127,217,160,0.08)]">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#5CAF7A] dark:text-[#A5E7BB] sm:text-sm">
                    <Brain className="h-4 w-4" />
                    Saúde do conhecimento
                  </div>
                  <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{stats.healthScore}%</p>
                </div>

                <div className="rounded-2xl border border-[rgba(127,217,160,0.24)] bg-[#7FD9A0]/10 p-3 dark:border-[rgba(127,217,160,0.16)] dark:bg-[rgba(127,217,160,0.08)]">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#5CAF7A] dark:text-[#A5E7BB] sm:text-sm">
                    <Layers3 className="h-4 w-4" />
                    Cobertura
                  </div>
                  <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                    {stats.totalTopics} blocos
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 dark:border-zinc-800 lg:row-span-2">
                <p className="mb-3 text-sm font-semibold text-foreground">Precisão</p>
                <div className="flex h-full items-center justify-center">
                  <GuidedScoreRing
                    percentage={stats.quizAccuracy}
                    correctQuestions={stats.correctQuestions}
                    totalQuestions={stats.totalQuestions}
                  />
                </div>
              </div>

              <div className="space-y-4 min-w-0">
                <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-2">
                  <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-2.5 py-2.5 dark:border-zinc-800">
                    <p className="truncate text-[9px] font-medium uppercase tracking-[0.05em] text-muted-foreground sm:text-[10px]">
                      Retenção
                    </p>
                    <p className="mt-1 break-words text-[13px] font-semibold leading-tight text-foreground sm:text-sm">
                      {retentionLabel}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-2.5 py-2.5 dark:border-zinc-800">
                    <p className="truncate text-[9px] font-medium uppercase tracking-[0.05em] text-muted-foreground sm:text-[10px]">
                      Acertos
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-foreground sm:text-sm">
                      {stats.correctQuestions}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-2.5 py-2.5 dark:border-zinc-800">
                    <p className="truncate text-[9px] font-medium uppercase tracking-[0.05em] text-muted-foreground sm:text-[10px]">
                      Tempo
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-foreground sm:text-sm">{studyTime}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 dark:border-zinc-800">
                  <h2 className="text-sm font-semibold text-foreground">Resumo</h2>
                  <div className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">{stats.totalSteps}</strong> passos concluídos.
                    </p>
                    <p>
                      <strong className="text-foreground">{stats.totalFlashcards}</strong> flashcards e{" "}
                      <strong className="text-foreground">{stats.totalQuestions}</strong> quizzes percorridos.
                    </p>
                    {stats.weakestTopics.length > 0 ? (
                      <p>
                        Vale revisar:{" "}
                        <strong className="text-foreground">
                          {stats.weakestTopics.map((topic) => topic.title).join(" e ")}
                        </strong>
                        .
                      </p>
                    ) : (
                      <p>O desempenho ficou estável em todos os blocos avaliados.</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[rgba(127,217,160,0.18)] bg-[#7FD9A0]/8 px-3 py-2.5 dark:border-[rgba(127,217,160,0.14)] dark:bg-[rgba(127,217,160,0.06)]">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#5CAF7A] dark:text-[#A5E7BB]">
                      <Layers3 className="h-4 w-4" />
                      Cobertura
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {stats.totalTopics} blocos na trilha.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[rgba(127,217,160,0.18)] bg-[#7FD9A0]/8 px-3 py-2.5 dark:border-[rgba(127,217,160,0.14)] dark:bg-[rgba(127,217,160,0.06)]">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#5CAF7A] dark:text-[#A5E7BB]">
                      <Clock className="h-4 w-4" />
                      Ritmo
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Sessão concluída em {studyTime}.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="lg:col-span-2 lg:row-start-2"
            >
                <div className="flex flex-col gap-2.5">
                  <Button
                    onClick={onRestart}
                    className="w-full min-w-0 rounded-lg bg-[#7FD9A0] px-4 py-3 text-sm font-medium text-black hover:bg-[#72c993] sm:text-base"
                    size="lg"
                  >
                    <RotateCcw className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Refazer trilha</span>
                </Button>

                  <Button
                    onClick={onBack}
                    variant="ghost"
                    className="w-full min-w-0 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground sm:text-base"
                    size="lg"
                  >
                  <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Voltar ao deck</span>
                </Button>
              </div>
            </motion.div>
          </div>
          </Card>
        </div>
      </div>
    </>
  );
}
