"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  RotateCcw,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddContentModal } from "./add-content-modal";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { useGenerationLimit } from "@/contexts/generation-limit-context";
import {
  PerformanceStats,
  getActionRecommendations,
  getMotivationalMessage,
} from "@/lib/performance-utils";

const FLASH_YELLOW = "#facc15";
const FLASH_YELLOW_DARK = "#f59e0b";
const MAX_FLASHCARDS = 20;

interface PerformanceReportResponsiveProps {
  stats: PerformanceStats;
  totalCards: number;
  documentId: number;
  isReviewMode?: boolean;
  onRestart: () => void;
  onContinueReview: () => void;
  onPracticeQuestions: () => void;
  onBack: () => void;
  onContentAdded?: () => void;
}

function FlashcardScoreRing({
  percentage,
  correctCards,
  totalCards,
}: {
  percentage: number;
  correctCards: number;
  totalCards: number;
}) {
  const size = 172;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="flashcard-report-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={FLASH_YELLOW} />
            <stop offset="100%" stopColor={FLASH_YELLOW_DARK} />
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
          stroke="url(#flashcard-report-ring)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold text-foreground md:text-4xl">{percentage}%</span>
        <span className="mt-1 text-xs text-muted-foreground md:text-sm">
          {correctCards}/{totalCards} domina
        </span>
      </div>
    </div>
  );
}

function getRetentionLabel(percentage: number) {
  if (percentage >= 85) return "Alta";
  if (percentage >= 65) return "Boa";
  if (percentage >= 45) return "Em evolução";
  return "Precisa reforçar";
}

export function PerformanceReportResponsive({
  stats,
  totalCards,
  documentId,
  isReviewMode = false,
  onRestart,
  onContinueReview,
  onPracticeQuestions,
  onBack,
  onContentAdded,
}: PerformanceReportResponsiveProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { refreshLimitInfo } = useGenerationLimit();

  const message = getMotivationalMessage(stats.performanceLevel, stats.accuracyPercentage);
  const recommendations = getActionRecommendations(stats);
  const canAddMore = totalCards < MAX_FLASHCARDS;

  const report = useMemo(() => {
    const learningCards = stats.partialCards + stats.incorrectCards;
    return {
      retentionLabel: getRetentionLabel(stats.accuracyPercentage),
      learningCards,
      masteredCards: stats.correctCards,
    };
  }, [stats]);

  const handleAddFlashcards = async (quantity: number, difficulty: string) => {
    setIsAdding(true);
    try {
      await apiClient.addFlashcardsToDocument(documentId, quantity, difficulty);
      toast.success(`${quantity} novos flashcards foram adicionados!`);
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
        toast.error("Erro ao adicionar flashcards", {
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
      <div className="min-h-screen overflow-x-hidden bg-background px-3 py-4 md:px-5 md:py-4">
        <div className="mx-auto w-full max-w-4xl min-w-0">
          <Card className="w-full min-w-0 overflow-hidden animate-in fade-in-50 duration-500 border border-border/70 bg-card/95 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#facc15]/45 hover:shadow-[0_0_0_1px_rgba(250,204,21,0.18),0_22px_54px_-24px_rgba(250,204,21,0.34)] dark:border-zinc-800 dark:bg-[#23262f]/95 dark:hover:border-[#facc15]/24 dark:hover:shadow-[0_0_0_1px_rgba(250,204,21,0.12),0_22px_54px_-24px_rgba(250,204,21,0.22)] md:p-6 lg:min-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-2rem)] lg:p-6">
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
                Estudo finalizado
              </span>
              <div className="h-10 w-10" />
            </div>

            <div className="grid w-full min-w-0 gap-4 lg:h-[calc(100%-3rem)] lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.05fr)] lg:grid-rows-[1fr_auto]">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex w-full min-w-0 min-h-[260px] flex-col items-center justify-center rounded-3xl border border-[rgba(250,204,21,0.22)] bg-gradient-to-br from-[#facc15]/10 via-transparent to-[#f59e0b]/5 px-4 py-8 text-center shadow-[inset_0_1px_0_rgba(250,204,21,0.06)] dark:border-[rgba(250,204,21,0.16)] dark:from-[#facc15]/8 dark:via-transparent dark:to-[#f59e0b]/4 dark:shadow-[inset_0_1px_0_rgba(250,204,21,0.05)] lg:min-h-0 lg:px-7 lg:py-8"
              >
                <div className="mb-4 flex justify-center">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-amber-300 opacity-80" />
                    <div className="absolute -bottom-1 -left-3 h-3 w-3 rounded-full bg-[#facc15] opacity-60" />
                    <div className="absolute top-3 -left-2 h-2 w-2 rounded-full bg-yellow-200 opacity-80" />
                    <div className="absolute -top-1 left-4 h-2 w-2 rounded-full bg-[#f59e0b] opacity-75" />

                    <div className="relative z-10 rounded-2xl bg-[#facc15] p-4 text-black shadow-lg">
                      <span className="text-2xl">{message.emoji}</span>
                    </div>

                    <div className="absolute -bottom-2 right-1 h-3 w-3 rounded-full bg-amber-300 opacity-60" />
                    <div className="absolute top-1 right-3 h-2 w-2 rounded-full bg-yellow-300 opacity-70" />
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
                className="grid w-full min-w-0 gap-4 lg:grid-cols-[190px_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr]"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
                  <div className="rounded-2xl border border-[rgba(250,204,21,0.24)] bg-[#facc15]/10 p-4 dark:border-[rgba(250,204,21,0.16)] dark:bg-[rgba(250,204,21,0.08)]">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#b77906] dark:text-[#f8de7e]">
                      <Target className="h-4 w-4" />
                      Desempenho geral
                    </div>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {stats.accuracyPercentage}%
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[rgba(250,204,21,0.24)] bg-[#facc15]/10 p-4 dark:border-[rgba(250,204,21,0.16)] dark:bg-[rgba(250,204,21,0.08)]">
                    <div className="flex items-center gap-2 text-sm font-medium text-[#b77906] dark:text-[#f8de7e]">
                      <CheckCircle2 className="h-4 w-4" />
                      Retenção
                    </div>
                    <p className="mt-2 text-2xl font-bold leading-tight text-foreground">
                      {report.retentionLabel}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 dark:border-zinc-800 lg:row-span-2">
                  <p className="mb-4 text-sm font-semibold text-foreground">Progresso</p>
                  <div className="flex h-full items-center justify-center">
                    <FlashcardScoreRing
                      percentage={stats.accuracyPercentage}
                      correctCards={stats.correctCards}
                      totalCards={stats.totalCards}
                    />
                  </div>
                </div>

                <div className="space-y-4 min-w-0">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 dark:border-zinc-800">
                      <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:text-[11px]">
                        Sabe
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {report.masteredCards}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 dark:border-zinc-800">
                      <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:text-[11px]">
                        Revê
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {report.learningCards}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 px-3 py-3 dark:border-zinc-800">
                      <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground sm:text-[11px]">
                        Total
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {stats.totalCards}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 dark:border-zinc-800">
                    <h2 className="text-sm font-semibold text-foreground">Resumo</h2>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      <p>
                        <strong className="text-foreground">{stats.correctCards}</strong> cards dominados em{" "}
                        <strong className="text-foreground">{stats.totalCards}</strong>.
                      </p>
                      <p>
                        <strong className="text-foreground">{report.learningCards}</strong> ainda pedem reforço.
                      </p>
                      <p>
                        Nível atual: <strong className="text-foreground">{report.retentionLabel}</strong>.
                      </p>
                    </div>
                  </div>

                  {isReviewMode && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {stats.correctCards > 0 && (
                        <div className="rounded-2xl border border-emerald-500/18 bg-emerald-500/8 px-4 py-3">
                          <div className="flex items-start gap-2">
                            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <div className="text-sm text-emerald-700 dark:text-emerald-300">
                              <strong>{stats.correctCards}</strong> {stats.correctCards === 1 ? "card promovido" : "cards promovidos"}.
                            </div>
                          </div>
                        </div>
                      )}
                      {report.learningCards > 0 && (
                        <div className="rounded-2xl border border-amber-500/18 bg-amber-500/8 px-4 py-3">
                          <div className="flex items-start gap-2">
                            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                            <div className="text-sm text-amber-700 dark:text-amber-300">
                              <strong>{report.learningCards}</strong> {report.learningCards === 1 ? "card voltou para a fila" : "cards voltaram para a fila"}.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="w-full min-w-0 lg:col-span-2 lg:row-start-2"
              >
                <div className="flex flex-col gap-3">
                  {recommendations.showReviewOption && (
                    <Button
                      onClick={onContinueReview}
                      className="w-full min-w-0 rounded-lg bg-[#facc15] px-4 py-4 text-base font-medium text-black hover:bg-[#eab308]"
                      size="lg"
                    >
                      <RefreshCw className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">{recommendations.secondaryAction}</span>
                    </Button>
                  )}

                  {canAddMore && (
                    <Button
                      onClick={() => setIsAddModalOpen(true)}
                      variant="outline"
                      className="w-full min-w-0 rounded-lg border-[#facc15]/30 px-4 py-4 text-base font-medium text-foreground hover:bg-[#facc15]/10 dark:border-[#facc15]/20"
                      size="lg"
                      disabled={isAdding}
                    >
                      <Plus className="mr-2 h-4 w-4 shrink-0 text-[#d97706]" />
                      <span className="truncate">Adicionar mais flashcards</span>
                    </Button>
                  )}

                  <Button
                    onClick={onRestart}
                    variant="ghost"
                    className="w-full min-w-0 rounded-lg px-4 py-4 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    size="lg"
                  >
                    <RotateCcw className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">Reiniciar deck</span>
                  </Button>

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
        onConfirm={handleAddFlashcards}
        contentType="flashcards"
        currentCount={totalCards}
        maxLimit={MAX_FLASHCARDS}
      />
    </>
  );
}
