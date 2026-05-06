"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  RotateCcw,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddContentModal } from "@/components/study/add-content-modal";
import { apiClient } from "@/lib/api";
import { useGenerationLimit } from "@/contexts/generation-limit-context";
import { toast } from "sonner";

const QUIZ_BLUE = "#48cfea";
const QUIZ_BLUE_DARK = "#1498c3";
const MAX_QUESTIONS = 15;

const getQuizMotivationalMessage = (score: number) => {
  if (score >= 90) {
    return {
      emoji: "🏆",
      title: "Desempenho excelente",
      subtitle: "Você fechou este quiz com muita segurança e ótima precisão.",
    };
  }
  if (score >= 70) {
    return {
      emoji: "🌊",
      title: "Muito bom resultado",
      subtitle: "A base está firme. Vale só lapidar alguns detalhes para subir ainda mais.",
    };
  }
  if (score >= 50) {
    return {
      emoji: "📘",
      title: "Aprendizado em progresso",
      subtitle: "Você já construiu uma boa parte do caminho. Mais uma passada deve ajudar bastante.",
    };
  }
  return {
    emoji: "🧭",
    title: "Hora de reforçar o conteúdo",
    subtitle: "Uma nova tentativa pode ajudar a fixar os pontos que ainda ficaram frágeis.",
  };
};

interface QuizPerformanceReportProps {
  score: number;
  correctAnswersCount: number;
  totalQuestions: number;
  documentId: number;
  onRestart: () => void;
  onBack: () => void;
  onContentAdded?: () => void;
}

function getRetentionLabel(score: number) {
  if (score >= 85) return "Alta";
  if (score >= 65) return "Boa";
  if (score >= 45) return "Em evolução";
  return "Precisa reforçar";
}

function QuizScoreRing({
  score,
  correctAnswersCount,
  totalQuestions,
}: {
  score: number;
  correctAnswersCount: number;
  totalQuestions: number;
}) {
  const size = 172;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="quiz-report-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={QUIZ_BLUE} />
            <stop offset="100%" stopColor={QUIZ_BLUE_DARK} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(72, 207, 234, 0.16)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#quiz-report-ring)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold text-foreground md:text-4xl">{score}%</span>
        <span className="mt-1 text-xs text-muted-foreground md:text-sm">
          {correctAnswersCount}/{totalQuestions} acertos
        </span>
      </div>
    </div>
  );
}

export function QuizPerformanceReport({
  score,
  correctAnswersCount,
  totalQuestions,
  documentId,
  onRestart,
  onBack,
  onContentAdded,
}: QuizPerformanceReportProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { refreshLimitInfo } = useGenerationLimit();

  const message = getQuizMotivationalMessage(score);
  const canAddMore = totalQuestions < MAX_QUESTIONS;

  const stats = useMemo(() => {
    const incorrectAnswersCount = totalQuestions - correctAnswersCount;
    return {
      incorrectAnswersCount,
      retentionLabel: getRetentionLabel(score),
      answeredQuestions: totalQuestions,
    };
  }, [correctAnswersCount, score, totalQuestions]);

  const handleAddQuestions = async (quantity: number, difficulty: string) => {
    setIsAdding(true);
    try {
      await apiClient.addQuestionsToQuiz(documentId, quantity, difficulty);
      toast.success(`${quantity} novas perguntas foram adicionadas!`);
      setIsAddModalOpen(false);

      await refreshLimitInfo();

      if (onContentAdded) {
        onContentAdded();
      }
    } catch (error: any) {
      if (error.message === "LIMIT_EXCEEDED" && error.limitInfo) {
        toast.error("Limite diário atingido", {
          description: `Você já usou todas as ${error.limitInfo.limit} gerações hoje. Renova em ${error.limitInfo.hours_until_reset}h.`,
          duration: 5000,
        });
      } else {
        toast.error("Erro ao adicionar perguntas", {
          description: error.message,
        });
      }
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background px-4 py-4 md:px-5 md:py-4">
        <div className="mx-auto max-w-4xl">
          <Card className="overflow-hidden animate-in fade-in-50 duration-500 border border-border/70 bg-card/95 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#48cfea]/45 hover:shadow-[0_0_0_1px_rgba(72,207,234,0.18),0_22px_54px_-24px_rgba(72,207,234,0.42)] dark:border-zinc-800 dark:bg-[#23262f]/95 dark:hover:border-[#48cfea]/28 dark:hover:shadow-[0_0_0_1px_rgba(72,207,234,0.12),0_22px_54px_-24px_rgba(72,207,234,0.3)] md:p-6 lg:min-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-2rem)] lg:p-6">
            <div className="mb-4 flex items-center justify-between lg:mb-3">
              <Button
                onClick={onBack}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                Quiz finalizado
              </span>
              <div className="h-10 w-10" />
            </div>

            <div className="grid gap-4 lg:h-[calc(100%-3rem)] lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.05fr)] lg:grid-rows-[1fr_auto]">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-[rgba(72,207,234,0.18)] bg-gradient-to-br from-[#48cfea]/10 via-transparent to-[#48cfea]/4 px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(72,207,234,0.05)] dark:border-[rgba(72,207,234,0.14)] dark:from-[#48cfea]/8 dark:via-transparent dark:to-[#48cfea]/3 dark:shadow-[inset_0_1px_0_rgba(72,207,234,0.04)] lg:min-h-0 lg:px-7 lg:py-8"
              >
                <div className="mb-4 flex justify-center">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-sky-300 opacity-80" />
                    <div className="absolute -bottom-1 -left-3 h-3 w-3 rounded-full bg-[#48cfea] opacity-60" />
                    <div className="absolute top-3 -left-2 h-2 w-2 rounded-full bg-cyan-200 opacity-80" />
                    <div className="absolute -top-1 left-4 h-2 w-2 rounded-full bg-[#48cfea] opacity-75" />

                    <div className="relative z-10 rounded-2xl bg-[#48cfea] p-4 text-black shadow-lg">
                      <span className="text-2xl">{message.emoji}</span>
                    </div>

                    <div className="absolute -bottom-2 right-1 h-3 w-3 rounded-full bg-sky-300 opacity-60" />
                    <div className="absolute top-1 right-3 h-2 w-2 rounded-full bg-cyan-300 opacity-70" />
                  </div>
                </div>

                <h1 className="max-w-sm text-3xl font-bold leading-tight text-foreground lg:text-[2.45rem]">
                  {message.title}
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground md:text-base">
                  {message.subtitle}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr]"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
                  <div className="rounded-2xl border border-[#48cfea]/20 bg-[#48cfea]/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#0f7797] dark:text-[#7ddff5]">
                      <Target className="h-4 w-4" />
                      Desempenho geral
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">{score}%</p>
                  </div>

                  <div className="rounded-2xl border border-[#48cfea]/20 bg-[#48cfea]/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#0f7797] dark:text-[#7ddff5]">
                      <CheckCircle2 className="h-4 w-4" />
                      Retenção
                    </div>
                    <p className="mt-2 text-2xl font-bold leading-tight text-foreground">{stats.retentionLabel}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 dark:border-zinc-800 lg:row-span-2">
                  <p className="mb-4 text-sm font-semibold text-foreground">Pontuação</p>
                  <div className="flex h-full items-center justify-center">
                    <QuizScoreRing
                      score={score}
                      correctAnswersCount={correctAnswersCount}
                      totalQuestions={totalQuestions}
                    />
                  </div>
                </div>

                <div className="space-y-4 min-w-0">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 dark:border-zinc-800">
                      <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:text-[11px]">
                        Acertos
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {correctAnswersCount}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 dark:border-zinc-800">
                      <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:text-[11px]">
                        Erros
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {stats.incorrectAnswersCount}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 dark:border-zinc-800">
                      <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:text-[11px]">
                        Total
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {stats.answeredQuestions}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 dark:border-zinc-800">
                    <h2 className="text-sm font-semibold text-foreground">Resumo</h2>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <p>
                        <strong className="text-foreground">{correctAnswersCount}</strong> acertos em{" "}
                        <strong className="text-foreground">{totalQuestions}</strong> perguntas.
                      </p>
                      <p>
                        Nível atual: <strong className="text-foreground">{stats.retentionLabel}</strong>.
                      </p>
                      <p>Tente de novo ou gere mais perguntas para ampliar a prática.</p>
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
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={onRestart}
                    className="w-full min-w-0 rounded-lg bg-[#48cfea] px-4 py-4 text-base font-medium text-black hover:bg-[#36bfdc]"
                    size="lg"
                  >
                    <RotateCcw className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">Tentar novamente</span>
                  </Button>

                  {canAddMore && (
                    <Button
                      onClick={() => setIsAddModalOpen(true)}
                      variant="outline"
                      className="w-full min-w-0 rounded-lg border-[#48cfea]/30 px-4 py-4 text-base font-medium text-foreground hover:bg-[#48cfea]/10 dark:border-[#48cfea]/20"
                      size="lg"
                      disabled={isAdding}
                    >
                      <Plus className="mr-2 h-4 w-4 shrink-0 text-[#1498c3]" />
                      <span className="truncate">Adicionar mais perguntas</span>
                    </Button>
                  )}

                  <Button
                    onClick={onBack}
                    variant="ghost"
                    className="w-full min-w-0 rounded-lg px-4 py-4 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
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

      <AddContentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConfirm={handleAddQuestions}
        contentType="questions"
        currentCount={totalQuestions}
        maxLimit={MAX_QUESTIONS}
      />
    </>
  );
}
