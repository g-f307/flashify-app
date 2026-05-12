"use client";

import { useEffect, useState } from "react";
import { Question, QuestionBulkItemInput, apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";

interface EditQuestionModalProps {
  documentId: number;
  question: Question | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedQuestion: Question) => void;
}

type DraftAnswer = {
  id?: number;
  text: string;
  explanation: string;
  is_correct: boolean;
};

export function EditQuestionModal({
  documentId,
  question,
  isOpen,
  onClose,
  onUpdate,
}: EditQuestionModalProps) {
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<DraftAnswer[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!question) return;
    setText(question.text);
    setAnswers(
      question.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
        explanation: answer.explanation ?? "",
        is_correct: answer.is_correct,
      }))
    );
  }, [question]);

  const updateAnswer = (
    index: number,
    field: keyof Pick<DraftAnswer, "text" | "explanation">,
    value: string
  ) => {
    setAnswers((current) =>
      current.map((answer, answerIndex) =>
        answerIndex === index ? { ...answer, [field]: value } : answer
      )
    );
  };

  const setCorrectAnswer = (index: number) => {
    setAnswers((current) =>
      current.map((answer, answerIndex) => ({
        ...answer,
        is_correct: answerIndex === index,
      }))
    );
  };

  const removeAnswer = (index: number) => {
    setAnswers((current) => {
      const next = current.filter((_, answerIndex) => answerIndex !== index);
      const hasCorrect = next.some((answer) => answer.is_correct);
      return next.map((answer, answerIndex) => ({
        ...answer,
        is_correct: hasCorrect ? answer.is_correct : answerIndex === 0,
      }));
    });
  };

  const addAnswer = () => {
    setAnswers((current) => [
      ...current,
      { text: "", explanation: "", is_correct: current.length === 0 },
    ]);
  };

  const handleSave = async () => {
    if (!question) return;

    const cleanedAnswers = answers
      .map((answer) => ({
        ...answer,
        text: answer.text.trim(),
        explanation: answer.explanation.trim(),
      }))
      .filter((answer) => answer.text);

    const correctAnswers = cleanedAnswers.filter((answer) => answer.is_correct);

    if (!text.trim() || cleanedAnswers.length < 2 || correctAnswers.length !== 1) {
      toast.error("A pergunta precisa de enunciado, 2 alternativas e 1 correta.");
      return;
    }

    const payload: QuestionBulkItemInput = {
      id: question.id,
      text: text.trim(),
      answers: cleanedAnswers.map((answer) => ({
        id: answer.id,
        text: answer.text,
        explanation: answer.explanation || undefined,
        is_correct: answer.is_correct,
      })),
    };

    setIsSaving(true);
    try {
      const updatedQuiz = await apiClient.updateQuestionInDocument(documentId, payload);
      const updatedQuestion = updatedQuiz.questions.find((item) => item.id === question.id);
      if (!updatedQuestion) {
        throw new Error("Pergunta atualizada, mas não encontrada na resposta.");
      }
      onUpdate(updatedQuestion);
      toast.success("Pergunta atualizada com sucesso!");
      onClose();
    } catch (error: any) {
      toast.error("Falha ao atualizar pergunta", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!question) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[min(92vh,900px)] w-[calc(100vw-1.5rem)] max-w-3xl flex-col p-0 sm:w-full">
        <DialogHeader className="border-b border-black/10 px-6 py-5 dark:border-white/10">
          <DialogTitle>Editar pergunta</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-6 py-5">
          <div className="space-y-4">
            <div className="space-y-2 rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <label className="text-sm font-medium">Enunciado</label>
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="min-h-[140px] border border-black/10 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>

            <div className="space-y-3">
              {answers.map((answer, index) => (
                <div
                  key={`${answer.id ?? "new"}-${index}`}
                  className="space-y-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={answer.is_correct ? "default" : "secondary"}>
                        {answer.is_correct ? "Correta" : `Alternativa ${index + 1}`}
                      </Badge>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setCorrectAnswer(index)}>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Marcar correta
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={answers.length <= 2}
                      onClick={() => removeAnswer(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <Input
                    value={answer.text}
                    onChange={(event) => updateAnswer(index, "text", event.target.value)}
                    placeholder="Texto da alternativa"
                    className="border border-black/10 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
                  />
                  <Textarea
                    value={answer.explanation}
                    onChange={(event) => updateAnswer(index, "explanation", event.target.value)}
                    placeholder="Explicação opcional"
                    className="min-h-[100px] border border-black/10 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={addAnswer}>
              Adicionar alternativa
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t border-black/10 px-6 py-4 dark:border-white/10">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
