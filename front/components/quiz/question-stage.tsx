"use client";

import { CheckAnswerResponse, Question } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuestionAnswerStatus = "unanswered" | "correct" | "incorrect";

interface QuestionStageProps {
  question: Question;
  questionLabel: string | number;
  selectedAnswerId: number | null;
  onSelectAnswer: (answerId: number) => void;
  answerStatus: QuestionAnswerStatus;
  feedback: CheckAnswerResponse | null;
  isChecking: boolean;
  onCheck: () => void;
  onNext: () => void;
  nextLabel: string;
  hideNextArrow?: boolean;
}

export function QuestionStage({
  question,
  questionLabel,
  selectedAnswerId,
  onSelectAnswer,
  answerStatus,
  feedback,
  isChecking,
  onCheck,
  onNext,
  nextLabel,
  hideNextArrow = false,
}: QuestionStageProps) {
  const letters = ["A", "B", "C", "D", "E"];

  return (
    <>
      <Card className="overflow-hidden border-muted animate-in fade-in-50 zoom-in-95 duration-500 delay-200">
        <CardHeader className="bg-muted/30 border-b border-muted">
          <div className="flex items-start gap-4 p-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">{questionLabel}</span>
            </div>
            <CardTitle className="text-lg sm:text-xl leading-relaxed pt-1.5 flex-1">
              {question.text}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-6">
          <RadioGroup
            value={selectedAnswerId ? String(selectedAnswerId) : undefined}
            onValueChange={(value) => onSelectAnswer(Number(value))}
            disabled={answerStatus !== "unanswered"}
            className="space-y-3"
          >
            {question.answers.map((answer, index) => {
              const isCorrect = feedback?.correct_answer_id === answer.id;
              const isSelected = selectedAnswerId === answer.id;

              return (
                <Label
                  key={answer.id}
                  htmlFor={`ans-${answer.id}`}
                  className={cn(
                    "flex items-start gap-4 p-4 border rounded-xl transition-all duration-300 cursor-pointer group",
                    "hover:shadow-md hover:scale-[1.02]",
                    answerStatus === "unanswered" && "hover:border-primary/80 hover:bg-primary/5",
                    answerStatus !== "unanswered" && !isCorrect && "opacity-60",
                    isSelected && answerStatus === "unanswered" && "border-primary bg-primary/5 scale-[1.02]",
                    answerStatus === "correct" && isCorrect && "border-green-500 bg-green-500/10",
                    answerStatus === "incorrect" && isSelected && "border-destructive bg-destructive/10",
                    answerStatus === "incorrect" && isCorrect && "border-green-500 bg-green-500/10"
                  )}
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all",
                      isSelected && answerStatus === "unanswered"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                      answerStatus === "correct" && isCorrect && "bg-green-500 text-white",
                      answerStatus === "incorrect" && isSelected && "bg-destructive text-white",
                      answerStatus === "incorrect" && isCorrect && "bg-green-500 text-white"
                    )}
                  >
                    {letters[index]}
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <RadioGroupItem
                      value={String(answer.id)}
                      id={`ans-${answer.id}`}
                      className="border-border"
                    />
                    <span className="text-sm sm:text-base leading-relaxed">
                      {answer.text}
                    </span>
                  </div>

                  {answerStatus !== "unanswered" && (
                    <div className="flex-shrink-0">
                      {isCorrect ? (
                        <CheckCircle className="w-6 h-6 text-green-500 animate-in zoom-in-50 duration-300" />
                      ) : isSelected ? (
                        <XCircle className="w-6 h-6 text-destructive animate-in zoom-in-50 duration-300" />
                      ) : null}
                    </div>
                  )}
                </Label>
              );
            })}
          </RadioGroup>

          {feedback && (
            <div
              className={cn(
                "mt-6 p-4 rounded-xl animate-in fade-in-50 slide-in-from-bottom-4 duration-500 border",
                feedback.is_correct
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-destructive/10 border-destructive/30"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5",
                    feedback.is_correct ? "bg-green-500" : "bg-destructive"
                  )}
                >
                  {feedback.is_correct ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <XCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      feedback.is_correct
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    )}
                  >
                    {feedback.explanation
                      .replace(/^Correto!\s*/i, "")
                      .replace(/^Incorreto[o|a]?[!]?\s*/i, "")
                      .replace(/^Errado[!]?\s*/i, "")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col sm:flex-row sm:justify-end animate-in fade-in-50 slide-in-from-bottom-4 duration-500 delay-300">
        {answerStatus === "unanswered" ? (
          <Button
            onClick={onCheck}
            disabled={!selectedAnswerId || isChecking}
            size="lg"
            className="w-full sm:w-auto sm:min-w-[140px]"
          >
            {isChecking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Verificar
          </Button>
        ) : (
          <Button
            onClick={onNext}
            size="lg"
            className="w-full sm:w-auto sm:min-w-[140px] group"
          >
            {nextLabel}
            {!hideNextArrow && (
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            )}
          </Button>
        )}
      </div>
    </>
  );
}
