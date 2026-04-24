"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Brain, Loader2, ChevronRight, Clock3, ListTodo } from "lucide-react";
import { apiClient, Flashcard, Quiz, SrsStats } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface SrsOverviewPanelProps {
  documentId: number;
  hasQuiz: boolean;
  srsStats: SrsStats | null;
}

interface PendingPreviewData {
  flashcards: Flashcard[];
  quiz: Quiz | null;
}

function formatPreviewText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function SrsOverviewPanel({
  documentId,
  hasQuiz,
  srsStats,
}: SrsOverviewPanelProps) {
  const [open, setOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [details, setDetails] = useState<PendingPreviewData>({
    flashcards: [],
    quiz: null,
  });

  const srsEnabled = srsStats?.srs_enabled ?? true;
  const flashcardsPending = srsStats?.flashcards_pending ?? 0;
  const questionsPending = srsStats?.questions_pending ?? 0;
  const totalPending = flashcardsPending + questionsPending;
  const priority = srsStats?.pending_priorities ?? { high: 0, medium: 0, low: 0 };
  const totalPriority = priority.high + priority.medium + priority.low;

  const priorityBars = useMemo(
    () => [
      {
        label: "Errou",
        count: priority.high,
        color: "bg-red-500",
      },
      {
        label: "Quase",
        count: priority.medium,
        color: "bg-amber-500",
      },
      {
        label: "Acertou",
        count: priority.low,
        color: "bg-emerald-500",
      },
    ],
    [priority.high, priority.medium, priority.low]
  );

  const flashcardTheme = {
    border: "border-[#FACC15]/40 dark:border-[#FACC15]/30",
    panel: "bg-[#FACC15]/10 dark:bg-[#FACC15]/10",
    soft: "bg-[#FACC15]/5 dark:bg-[#FACC15]/10",
    text: "text-[#8a6400] dark:text-[#FACC15]",
    button: "bg-[#FACC15] text-black hover:bg-[#e6c200] hover:text-black",
    badge: "border-[#FACC15]/30 bg-[#FACC15]/15 text-[#8a6400] dark:text-[#FACC15]",
  };

  const quizTheme = {
    border: "border-[#48cfea]/40 dark:border-[#48cfea]/30",
    panel: "bg-[#48cfea]/10 dark:bg-[#48cfea]/10",
    soft: "bg-[#48cfea]/5 dark:bg-[#48cfea]/10",
    text: "text-[#1e84a3] dark:text-[#48cfea]",
    button: "bg-[#48cfea] text-black hover:bg-[#2fbfe0] hover:text-black",
    badge: "border-[#48cfea]/30 bg-[#48cfea]/15 text-[#1e84a3] dark:text-[#48cfea]",
  };

  useEffect(() => {
    if (!open || !srsEnabled || totalPending === 0) {
      return;
    }

    const loadDetails = async () => {
      setLoadingDetails(true);
      setDetailsError(null);

      try {
        const flashcardsRequest = apiClient.getReviewFlashcardsByDocument(documentId);
        const quizRequest: Promise<Quiz | null> = hasQuiz
          ? apiClient.getReviewQuiz(documentId)
          : Promise.resolve(null);

        const [flashcardsResult, quizResult] = await Promise.all([flashcardsRequest, quizRequest]);

        setDetails({
          flashcards: Array.isArray(flashcardsResult) ? flashcardsResult : [],
          quiz: quizResult && "questions" in quizResult ? quizResult : null,
        });
      } catch (error: any) {
        setDetailsError(error.message || "Não foi possível carregar os detalhes.");
      } finally {
        setLoadingDetails(false);
      }
    };

    loadDetails();
  }, [open, documentId, hasQuiz, srsEnabled, totalPending]);

  if (!srsEnabled) {
    return null;
  }

  return (
    <>
      <Card className="border-border/50 overflow-hidden dark:border-zinc-800">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Pendências de hoje
              </p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-semibold text-foreground">
                  {totalPending}
                </h3>
                <span className="text-sm text-muted-foreground">
                  itens para revisar
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className={cn("font-medium", flashcardTheme.text)}>{flashcardsPending}</span> flashcards
                {hasQuiz ? (
                  <>
                    <span className="mx-1 text-muted-foreground">·</span>
                    <span className={cn("font-medium", quizTheme.text)}>{questionsPending}</span> questões
                  </>
                ) : null}
              </p>
            </div>

            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-primary">
              <ListTodo className="mr-1 h-3.5 w-3.5" />
              SRS ativo
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Prioridade</span>
              <span>Errou · Quase · Acertou</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              {totalPriority > 0 ? (
                priorityBars.map((item) => {
                  const width = item.count > 0 ? `${(item.count / totalPriority) * 100}%` : "0%";
                  return (
                    <div
                      key={item.label}
                      className={cn("h-full transition-all", item.color)}
                      style={{ width }}
                      aria-label={`${item.label}: ${item.count}`}
                    />
                  );
                })
              ) : (
                <div className="h-full w-full bg-muted-foreground/20" />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {priorityBars.map((item) => (
                <Badge
                  key={item.label}
                  variant="outline"
                  className={cn(
                    "rounded-full border-transparent px-2.5 py-1 text-xs",
                    item.count > 0 ? "bg-muted/80 text-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <span className={cn("mr-1.5 inline-block h-2 w-2 rounded-full", item.color)} />
                  {item.label} {item.count}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            variant="outline"
            onClick={() => setOpen(true)}
            disabled={totalPending === 0}
          >
            {totalPending > 0 ? "Ver detalhes" : "Sem pendências"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl border-border/50 bg-background dark:border-zinc-800 dark:bg-zinc-950">
          <SheetHeader className="border-b border-border/50 pr-10 pb-4 dark:border-zinc-800">
            <SheetTitle>O que revisar hoje</SheetTitle>
            <SheetDescription>
              As pendências são organizadas pelo SRS para você estudar primeiro o que mais precisa de atenção.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loadingDetails ? (
              <div className="flex h-full items-center justify-center py-16 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando pendências...
              </div>
            ) : detailsError ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                {detailsError}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn("rounded-xl border p-4 shadow-sm", flashcardTheme.border, flashcardTheme.panel)}>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Flashcards</p>
                    <p className={cn("mt-2 text-2xl font-semibold", flashcardTheme.text)}>{flashcardsPending}</p>
                  </div>
                  <div className={cn("rounded-xl border p-4 shadow-sm", quizTheme.border, quizTheme.panel)}>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Quizzes</p>
                    <p className={cn("mt-2 text-2xl font-semibold", quizTheme.text)}>{questionsPending}</p>
                  </div>
                </div>

                {details.flashcards.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Flashcards pendentes</h4>
                      <Badge variant="secondary">{details.flashcards.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {details.flashcards.slice(0, 5).map((flashcard, index) => (
                        <div
                          key={flashcard.id}
                          className={cn("rounded-xl border p-3 shadow-sm", flashcardTheme.border, flashcardTheme.soft)}
                        >
                          <div className="flex items-start gap-3">
                            <Badge variant="outline" className={cn("mt-0.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide", flashcardTheme.badge)}>
                              FC {index + 1}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {formatPreviewText(flashcard.front)}
                              </p>
                              <div className={cn("mt-2 flex items-center gap-2 text-xs", flashcardTheme.text)}>
                                <Clock3 className="h-3.5 w-3.5" />
                                Prioridade alta
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {details.flashcards.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        Mostrando apenas os 5 primeiros itens.
                      </p>
                    )}
                  </section>
                )}

                {details.quiz?.questions?.length ? (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Questões pendentes</h4>
                      <Badge variant="secondary">{details.quiz.questions.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {details.quiz.questions.slice(0, 5).map((question, index) => (
                        <div
                          key={question.id}
                          className={cn("rounded-xl border p-3 shadow-sm", quizTheme.border, quizTheme.soft)}
                        >
                          <div className="flex items-start gap-3">
                            <Badge variant="outline" className={cn("mt-0.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide", quizTheme.badge)}>
                              Q {index + 1}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {formatPreviewText(question.text)}
                              </p>
                              <div className={cn("mt-2 flex items-center gap-2 text-xs", quizTheme.text)}>
                                <Brain className="h-3.5 w-3.5" />
                                Revisão pelo quiz
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {details.quiz.questions.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        Mostrando apenas as 5 primeiras questões.
                      </p>
                    )}
                  </section>
                ) : null}

                {details.flashcards.length === 0 && !details.quiz?.questions?.length && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900/60">
                    Não há itens pendentes no momento.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-3 border-t border-border/50 p-4 dark:border-zinc-800 sm:grid-cols-2">
            {flashcardsPending > 0 ? (
              <Button asChild className={flashcardTheme.button}>
                <Link href={`/study/${documentId}?mode=review`}>
                  Revisar flashcards
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                Sem flashcards
              </Button>
            )}
            {hasQuiz && questionsPending > 0 ? (
              <Button asChild className={quizTheme.button}>
                <Link href={`/quiz/${documentId}?mode=review`}>
                  Revisar quiz
                </Link>
              </Button>
            ) : (
              <Button variant="outline" disabled className="border-border/60 text-muted-foreground dark:border-zinc-800 dark:text-zinc-400">
                Sem quiz
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
