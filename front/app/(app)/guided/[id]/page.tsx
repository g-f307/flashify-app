"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  apiClient,
  CheckAnswerResponse,
  GuidedStudy,
  GuidedStudyStep,
  GuidedStudyTopic,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers3,
  Brain,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { formatDocumentTitle } from "@/lib/utils";
import { FlashcardStage } from "@/components/study/flashcard-stage";
import { QuestionStage } from "@/components/quiz/question-stage";
import { GuidedStudyReport } from "@/components/study/guided-study-report";
import { useGenerationLimit } from "@/contexts/generation-limit-context";
import { LoadingScreen } from "@/components/ui/loading-screen";

type FlattenedStep = {
  topic: GuidedStudyTopic;
  step: GuidedStudyStep;
};

type GuidedQuestionResult = {
  questionId: number;
  isCorrect: boolean;
};

export default function GuidedStudyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = Number(params.id);
  const shouldRestart = searchParams?.get("restart") === "1";
  const { refreshLimitInfo } = useGenerationLimit();

  const [guidedStudy, setGuidedStudy] = useState<GuidedStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showFlashcardBack, setShowFlashcardBack] = useState(false);
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [answerFeedback, setAnswerFeedback] = useState<CheckAnswerResponse | null>(null);
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [questionResults, setQuestionResults] = useState<GuidedQuestionResult[]>([]);
  const [sessionStartedAt] = useState(new Date());
  const [sessionCompletedAt, setSessionCompletedAt] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!documentId) return;
      try {
        setLoading(true);
        if (shouldRestart) {
          await apiClient.saveGuidedStudyProgress(documentId, [], false);
        }
        const [guidedData, progress] = await Promise.all([
          apiClient.getGuidedStudy(documentId),
          apiClient.getGuidedStudyProgress(documentId),
        ]);
        refreshLimitInfo().catch(() => {});
        if (cancelled) return;
        setGuidedStudy(guidedData);

        if (progress && !progress.is_completed && progress.completed_step_ids.length > 0 && !shouldRestart) {
          setCompletedStepIds(progress.completed_step_ids);
          const allSteps = guidedData.topics.flatMap((t) => t.steps);
          let lastIdx = -1;
          for (let i = allSteps.length - 1; i >= 0; i--) {
            if (progress.completed_step_ids.includes(allSteps[i].id)) {
              lastIdx = i;
              break;
            }
          }
          if (lastIdx >= 0 && lastIdx + 1 < allSteps.length) {
            setCurrentStepIndex(lastIdx + 1);
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || "Não foi possível carregar o estudo guiado.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [documentId, shouldRestart, refreshLimitInfo]);

  const flattenedSteps = useMemo<FlattenedStep[]>(() => {
    if (!guidedStudy) return [];
    return guidedStudy.topics.flatMap((topic) =>
      topic.steps.map((step) => ({ topic, step }))
    );
  }, [guidedStudy]);

  const currentEntry = flattenedSteps[currentStepIndex];
  const currentStep = currentEntry?.step;
  const currentTopic = currentEntry?.topic;
  const totalSteps = flattenedSteps.length;
  const progressPercentage = totalSteps > 0 ? (currentStepIndex / totalSteps) * 100 : 0;
  const currentTopicStepIndex = currentTopic?.steps.findIndex((step) => step.id === currentStep?.id) ?? -1;
  const topicFlashcardsCount = currentTopic?.steps.filter((step) => step.type === "flashcard").length ?? 0;
  const topicQuestionsCount = currentTopic?.steps.filter((step) => step.type === "question").length ?? 0;

  const resetStepUi = () => {
    setShowFlashcardBack(false);
    setSelectedAnswerId(null);
    setAnswerFeedback(null);
  };

  const scheduleSave = useCallback(
    (nextIds: string[], done: boolean) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        apiClient.saveGuidedStudyProgress(documentId, nextIds, done).catch(() => {});
      }, 800);
    },
    [documentId]
  );

  const handleAdvanceStep = () => {
    if (!currentStep) return;
    const nextIds = completedStepIds.includes(currentStep.id)
      ? completedStepIds
      : [...completedStepIds, currentStep.id];
    const isLast = currentStepIndex >= totalSteps - 1;
    setCompletedStepIds(nextIds);
    if (isLast) {
      setSessionCompletedAt(new Date());
    }
    scheduleSave(nextIds, isLast);
    if (isLast) return;
    setCurrentStepIndex((p) => p + 1);
    resetStepUi();
  };

  const handleCheckAnswer = async () => {
    if (!currentStep?.question_id || !selectedAnswerId) {
      toast.warning("Selecione uma alternativa para continuar.");
      return;
    }
    try {
      setIsCheckingAnswer(true);
      const fb = await apiClient.checkQuizAnswer(currentStep.question_id, selectedAnswerId);
      setAnswerFeedback(fb);
      setQuestionResults((prev) => {
        const next = prev.filter((result) => result.questionId !== currentStep.question_id);
        next.push({
          questionId: currentStep.question_id!,
          isCorrect: fb.is_correct,
        });
        return next;
      });
    } catch (err: any) {
      toast.error("Não foi possível validar a resposta.", { description: err.message });
    } finally {
      setIsCheckingAnswer(false);
    }
  };

  const handleBack = () => {
    const inProgress = completedStepIds.length > 0 && completedStepIds.length < totalSteps;
    if (inProgress) {
      setShowExitDialog(true);
    } else {
      router.back();
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingScreen message="Montando sua trilha guiada..." fullScreen={false} />;
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !guidedStudy) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center bg-background">
        <Sparkles className="h-10 w-10 text-[#7FD9A0]" />
        <h1 className="text-2xl font-bold">Estudo guiado indisponível</h1>
        <p className="text-muted-foreground">{error || "Não foi possível montar a trilha."}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  // ── Completion ─────────────────────────────────────────────────────────────
  const isAllDone = completedStepIds.length === totalSteps && totalSteps > 0;
  if (isAllDone) {
    return (
      <GuidedStudyReport
        guidedStudy={guidedStudy}
        sessionStartedAt={sessionStartedAt}
        sessionCompletedAt={sessionCompletedAt ?? new Date()}
        questionResults={questionResults}
        onBack={() => router.push(`/deck/${documentId}`)}
        onRestart={() => {
          setCompletedStepIds([]);
          setCurrentStepIndex(0);
          setQuestionResults([]);
          setSessionCompletedAt(null);
          resetStepUi();
          apiClient.saveGuidedStudyProgress(documentId, [], false).catch(() => {});
        }}
      />
    );
  }

  if (!currentStep || !currentTopic) return null;

  const answerStatus = answerFeedback
    ? answerFeedback.is_correct
      ? "correct"
      : "incorrect"
    : "unanswered";

  // ── Main ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background px-3 pb-4 pt-2 sm:px-5 sm:pb-6 sm:pt-3 lg:px-6 lg:pb-6 lg:pt-3">
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="border-border bg-background dark:border-zinc-800 dark:bg-zinc-950">
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da trilha guiada?</AlertDialogTitle>
            <AlertDialogDescription>
              Seu progresso está salvo. Você pode retomar de onde parou quando voltar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar estudando</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.back()}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto w-full max-w-[82rem]">
        <header className="relative mb-3 animate-in fade-in-50 slide-in-from-top-4 duration-500">
          <div className="rounded-[1.5rem] border border-border/60 bg-card/95 px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-[#23262f]/95 sm:px-5 sm:py-3.5 lg:px-6 lg:py-3.5">
            <div className="flex flex-col gap-2.5">
              <div className={isHeaderExpanded ? "flex items-center justify-between gap-3" : "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"}>
                <Button variant="ghost" size="sm" onClick={handleBack} className="shrink-0 hover:bg-accent/50">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Sair
                </Button>
                {!isHeaderExpanded && (
                  <h1 className="truncate px-2 text-center text-lg font-bold leading-tight text-foreground sm:text-xl lg:text-[1.65rem]">
                    {currentTopic.title}
                  </h1>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHeaderExpanded((prev) => !prev)}
                    className="h-9 rounded-full px-3 text-muted-foreground hover:bg-[#7FD9A0]/10 hover:text-foreground"
                  >
                    {isHeaderExpanded ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Recolher
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Expandir
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <div className="min-w-0">
                  {isHeaderExpanded && (
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/80">
                      {formatDocumentTitle(guidedStudy.title)}
                    </p>
                  )}
                  {isHeaderExpanded && (
                    <h1 className="mt-1.5 text-xl font-bold leading-tight text-foreground text-balance sm:text-[1.8rem] lg:text-[2.05rem]">
                      {currentTopic.title}
                    </h1>
                  )}
                  {isHeaderExpanded ? (
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {currentStep.type === "flashcard"
                        ? "Revise este bloco com calma e avance quando sentir que o conceito ficou claro."
                        : "Valide o que acabou de revisar com perguntas objetivas antes de seguir para o próximo bloco."}
                    </p>
                  ) : null}
                </div>

                {isHeaderExpanded && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#7FD9A0]/25 bg-[#7FD9A0]/10 p-3 dark:border-[#7FD9A0]/20 dark:bg-[#7FD9A0]/10">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#3E8E63] dark:text-[#9EE6B8]">
                        <Layers3 className="h-3.5 w-3.5" />
                        Bloco
                      </div>
                      <p className="mt-1 text-sm font-semibold">{currentTopic.order}/{guidedStudy.summary.topics_count}</p>
                    </div>
                    <div className="rounded-2xl border border-[#7FD9A0]/25 bg-[#7FD9A0]/10 p-3 dark:border-[#7FD9A0]/20 dark:bg-[#7FD9A0]/10">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#3E8E63] dark:text-[#9EE6B8]">
                        <Play className="h-3.5 w-3.5" />
                        Passo
                      </div>
                      <p className="mt-1 text-sm font-semibold">{currentTopicStepIndex + 1}/{currentTopic.steps.length}</p>
                    </div>
                    <div className="rounded-2xl border border-[#7FD9A0]/25 bg-[#7FD9A0]/10 p-3 dark:border-[#7FD9A0]/20 dark:bg-[#7FD9A0]/10">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#3E8E63] dark:text-[#9EE6B8]">
                        <BookOpen className="h-3.5 w-3.5" />
                        Flashcards
                      </div>
                      <p className="mt-1 text-sm font-semibold">{topicFlashcardsCount}</p>
                    </div>
                    <div className="rounded-2xl border border-[#7FD9A0]/25 bg-[#7FD9A0]/10 p-3 dark:border-[#7FD9A0]/20 dark:bg-[#7FD9A0]/10">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[#3E8E63] dark:text-[#9EE6B8]">
                        <Brain className="h-3.5 w-3.5" />
                        Quiz
                      </div>
                      <p className="mt-1 text-sm font-semibold">{topicQuestionsCount}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Progress value={progressPercentage} className="h-2 bg-[#7FD9A0]/20" indicatorClassName="bg-[#7FD9A0]" />
                <div className="flex items-center justify-between text-xs text-muted-foreground sm:text-sm">
                  <span>Passo {currentStepIndex + 1}/{totalSteps}</span>
                  <span>{isHeaderExpanded ? `${Math.round(progressPercentage)}% concluído` : `${currentTopicStepIndex + 1}/${currentTopic.steps.length}`}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Step card ── */}
        {currentStep.type === "flashcard" ? (
          <div
            key={currentStepIndex}
            className="animate-in fade-in-50 zoom-in-95 duration-500 delay-200"
          >
            <FlashcardStage
              flashcard={{
                front: currentStep.front ?? "",
                back: currentStep.back ?? "",
              }}
              currentIndex={currentStepIndex}
              total={totalSteps}
              isFlipped={showFlashcardBack}
              onFlip={() => setShowFlashcardBack((prev) => !prev)}
              interactiveClassName="hover:shadow-[0_0_20px_rgba(127,217,160,0.34),0_0_30px_rgba(127,217,160,0.18)]"
              stageClassName="mx-auto max-w-2xl"
              footerClassName="mx-auto mt-4 max-w-2xl"
              showCounter={false}
              frontActions={
                <div className="flex justify-center">
                  <Button onClick={() => setShowFlashcardBack(true)} variant="ghost" size="lg" className="w-full sm:w-auto functional-button border border-[#7FD9A0]/25 hover:border-[#7FD9A0]/45 hover:bg-[#7FD9A0]/10 dark:border-[#7FD9A0]/20 dark:hover:bg-[#7FD9A0]/12">
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Virar Card
                  </Button>
                </div>
              }
              backActions={
                <div className="flex flex-col sm:flex-row w-full justify-center items-center gap-2">
                  <Button
                    size="lg"
                    className="w-full sm:flex-1 bg-[#7FD9A0]/20 text-[#2E6A49] hover:bg-[#7FD9A0]/30 dark:bg-[#7FD9A0]/15 dark:text-[#B5F0C8] dark:hover:bg-[#7FD9A0]/22 flex-col h-auto py-3 border border-[#7FD9A0]/25"
                    onClick={handleAdvanceStep}
                  >
                    <span className="flex items-center gap-1">Já aprendi isso</span>
                    <span className="text-[10px] font-normal opacity-70">Avançar para o próximo passo</span>
                  </Button>
                </div>
              }
            />
          </div>
        ) : (
          <div
            key={currentStepIndex}
            className="mx-auto w-full max-w-4xl animate-in fade-in-50 zoom-in-95 duration-500 delay-200"
          >
            <QuestionStage
              question={{
                id: currentStep.question_id ?? 0,
                text: currentStep.prompt ?? "",
                answers: currentStep.answers,
              }}
              questionLabel={currentTopicStepIndex + 1}
              selectedAnswerId={selectedAnswerId}
              onSelectAnswer={setSelectedAnswerId}
              answerStatus={answerStatus}
              feedback={answerFeedback}
              isChecking={isCheckingAnswer}
              onCheck={handleCheckAnswer}
              onNext={handleAdvanceStep}
              nextLabel={currentStepIndex === totalSteps - 1 ? "Concluir trilha" : "Próximo passo"}
              hideNextArrow={currentStepIndex === totalSteps - 1}
              theme={{
                badge: "bg-[#7FD9A0]/15",
                badgeText: "text-[#3E8E63] dark:text-[#9EE6B8]",
                hoverBorder: "hover:border-[#7FD9A0]/80",
                hoverBg: "hover:bg-[#7FD9A0]/5",
                selectedBorder: "border-[#7FD9A0]",
                selectedBg: "bg-[#7FD9A0]/5",
                selectedBadge: "bg-[#7FD9A0]",
                selectedBadgeText: "text-black",
                primaryButton: "bg-[#7FD9A0] hover:bg-[#7FD9A0]/90 text-black",
                radioItem: "border-[#7FD9A0]/45 text-[#7FD9A0] data-[state=checked]:border-[#7FD9A0] [&_[data-slot=radio-group-indicator]_svg]:fill-[#7FD9A0]",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
