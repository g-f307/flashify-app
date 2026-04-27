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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Layers3,
  Loader2,
  Play,
  ScrollText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatDocumentTitle } from "@/lib/utils";
import { FlashcardStage } from "@/components/study/flashcard-stage";
import { QuestionStage } from "@/components/quiz/question-stage";

type FlattenedStep = {
  topic: GuidedStudyTopic;
  step: GuidedStudyStep;
};

export default function GuidedStudyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const documentId = Number(params.id);
  const shouldRestart = searchParams?.get("restart") === "1";

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
  }, [documentId, shouldRestart]);

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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Montando sua trilha guiada...</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !guidedStudy) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center bg-background">
        <Sparkles className="h-10 w-10 text-[#FACC15]" />
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
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto mt-16 text-center animate-in fade-in-50 zoom-in-95 duration-500">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FACC15]/20 to-[#48cfea]/20 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-[#FACC15]" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Trilha concluída!</h1>
          <p className="text-muted-foreground mb-8">
            Você completou todos os {totalSteps} passos de{" "}
            <span className="font-medium text-foreground">
              {formatDocumentTitle(guidedStudy.title)}
            </span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => router.push(`/deck/${documentId}`)}>
              Voltar ao deck
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setCompletedStepIds([]);
                setCurrentStepIndex(0);
                resetStepUi();
                apiClient.saveGuidedStudyProgress(documentId, [], false).catch(() => {});
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Refazer trilha
            </Button>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
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

      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <header className="relative mb-6 animate-in fade-in-50 slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={handleBack} className="hover:bg-accent/50">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Sair
            </Button>
            <div className="text-center flex-1 mx-4 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {formatDocumentTitle(guidedStudy.title)}
              </h1>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full shrink-0">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">
                {currentStepIndex + 1}/{totalSteps}
              </span>
            </div>
          </div>
        </header>

        {/* ── Progress bar ── */}
        <div className="mb-6 animate-in fade-in-50 slide-in-from-top-4 duration-500 delay-100">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between items-center mt-2 text-xs sm:text-sm text-muted-foreground">
            <span>
              Bloco {currentTopic.order} de {guidedStudy.summary.topics_count}
            </span>
            <span>{Math.round(progressPercentage)}% concluído</span>
          </div>
        </div>

        <Card className="mb-6 overflow-hidden border-border/60 animate-in fade-in-50 slide-in-from-top-4 duration-500 delay-150">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                <Layers3 className="h-3.5 w-3.5" />
                Bloco {currentTopic.order}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                <Play className="h-3.5 w-3.5" />
                Passo {currentTopicStepIndex + 1} de {currentTopic.steps.length}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                <ScrollText className="h-3.5 w-3.5" />
                {topicFlashcardsCount} flashcards e {topicQuestionsCount} perguntas
              </span>
            </div>
            <CardTitle className="text-2xl sm:text-3xl leading-tight text-balance">
              {currentTopic.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStep.type === "flashcard"
                ? "Revise os conceitos deste bloco com a mesma dinâmica do modo de flashcards antes de validar com perguntas."
                : "Agora valide o que acabou de revisar usando a mesma experiência do quiz individual."}
            </p>
          </CardContent>
        </Card>

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
              frontActions={
                <div className="flex justify-center">
                  <Button onClick={() => setShowFlashcardBack(true)} variant="ghost" size="lg" className="w-full sm:w-auto functional-button">
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Virar Card
                  </Button>
                </div>
              }
              backActions={
                <div className="flex flex-col sm:flex-row w-full justify-center items-center gap-2">
                  <Button
                    size="lg"
                    className="w-full sm:flex-1 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/15 dark:text-green-200 dark:hover:bg-green-500/25 flex-col h-auto py-3"
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
            className="animate-in fade-in-50 zoom-in-95 duration-500 delay-200"
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
            />
          </div>
        )}
      </div>
    </div>
  );
}
