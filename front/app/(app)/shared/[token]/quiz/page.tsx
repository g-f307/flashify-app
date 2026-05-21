"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, SharedDeckRead, SharedQuestion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PageState = "loading" | "loaded" | "error";

export default function SharedQuizPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [deck, setDeck] = useState<SharedDeckRead | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    if (!token) return;
    apiClient
      .getSharedDeck(token)
      .then((data) => {
        setDeck(data);
        setPageState("loaded");
      })
      .catch(() => {
        setPageState("error");
      });
  }, [token]);

  const questions = deck?.quiz?.questions ?? [];
  const currentQuestion = questions[currentQuestionIndex];

  if (pageState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando quiz...</p>
      </div>
    );
  }

  if (pageState === "error" || !deck || !deck.quiz || questions.length === 0 || !currentQuestion) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">Não foi possível carregar o quiz deste deck compartilhado.</p>
        <Button onClick={() => router.push(`/shared/${token}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o deck
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-4xl flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => router.push(`/shared/${token}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <p className="text-right text-xs text-muted-foreground">Modo leitura · sem resposta, feedback ou relatório</p>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <Card className="overflow-hidden border-muted">
          <CardHeader className="border-b border-muted bg-muted/30">
            <div className="flex items-start gap-4 p-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#48cfea]/10">
                <span className="text-lg font-bold text-[#48cfea]">{currentQuestionIndex + 1}</span>
              </div>
              <CardTitle className="flex-1 pt-1.5 text-lg leading-relaxed sm:text-xl">
                {currentQuestion.text}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-5 pb-5">
            {currentQuestion.answers.map((answer: SharedQuestion["answers"][number], index: number) => (
              <div
                key={`${currentQuestionIndex}-${index}`}
                className={cn(
                  "flex items-start gap-4 rounded-xl border border-border/80 p-4 text-sm transition-all duration-300 dark:border-zinc-700/80",
                  "bg-muted/20"
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted font-bold text-muted-foreground">
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="flex-1 text-sm leading-relaxed sm:text-base">{answer.text}</span>
              </div>
            ))}
          </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {currentQuestionIndex + 1} de {questions.length}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setCurrentQuestionIndex((current) => Math.max(0, current - 1))} disabled={currentQuestionIndex === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button
              className="bg-[#48cfea] hover:bg-[#48cfea]/90 text-black"
              onClick={() => setCurrentQuestionIndex((current) => Math.min(questions.length - 1, current + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Próxima
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
