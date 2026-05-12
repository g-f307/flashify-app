"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import {
  apiClient,
  Flashcard,
  FlashcardBulkItemInput,
  QuestionBulkItemInput,
  Quiz,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Eye,
  Loader2,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { EnhancedFlashcardRenderer } from "@/components/study/enhanced-flashcard-renderer";
import { RichTextEditor } from "@/components/study/rich-text-editor";
import {
  isRichTextEmpty,
  normalizeRichTextValue,
  richTextPreview,
} from "@/lib/rich-text";

const sectionScrollAreaClassName =
  "min-h-0 [&_[data-slot=scroll-area-scrollbar]]:opacity-100 [&_[data-slot=scroll-area-scrollbar]]:transition-opacity [&_[data-slot=scroll-area-scrollbar]]:duration-200 [&_[data-slot=scroll-area-scrollbar]]:w-3 [&_[data-slot=scroll-area-thumb]]:bg-black/15 dark:[&_[data-slot=scroll-area-thumb]]:bg-white/20 hover:[&_[data-slot=scroll-area-thumb]]:bg-black/25 dark:hover:[&_[data-slot=scroll-area-thumb]]:bg-white/35";

type Mode = "flashcards" | "quiz";
type MobileSection = "items" | "editor" | "preview";

type DraftFlashcard = {
  localId: string;
  id?: number;
  front: string;
  back: string;
  type?: Flashcard["type"];
  isDeleted?: boolean;
};

type DraftAnswer = {
  localId: string;
  id?: number;
  text: string;
  explanation: string;
  is_correct: boolean;
};

type DraftQuestion = {
  localId: string;
  id?: number;
  text: string;
  answers: DraftAnswer[];
  isDeleted?: boolean;
};

interface BulkEditContentDialogProps {
  documentId: number;
  mode: Mode;
  disabled?: boolean;
  onSaved?: () => Promise<void> | void;
  triggerMode?: "full" | "icon";
}

const createLocalId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createDraftFlashcard = (flashcard?: Flashcard): DraftFlashcard => ({
  localId: createLocalId(),
  id: flashcard?.id,
  front: flashcard?.front ?? "",
  back: flashcard?.back ?? "",
  type: flashcard?.type ?? "concept",
  isDeleted: false,
});

const createDraftAnswer = (overrides?: Partial<DraftAnswer>): DraftAnswer => ({
  localId: createLocalId(),
  id: overrides?.id,
  text: overrides?.text ?? "",
  explanation: overrides?.explanation ?? "",
  is_correct: overrides?.is_correct ?? false,
});

const createDraftQuestion = (question?: Quiz["questions"][number]): DraftQuestion => ({
  localId: createLocalId(),
  id: question?.id,
  text: question?.text ?? "",
  answers:
    question?.answers?.map((answer) =>
      createDraftAnswer({
        id: answer.id,
        text: answer.text,
        explanation: answer.explanation ?? "",
        is_correct: answer.is_correct,
      })
    ) ?? [
      createDraftAnswer({ is_correct: true }),
      createDraftAnswer(),
      createDraftAnswer(),
      createDraftAnswer(),
    ],
  isDeleted: false,
});

const normalizeFlashcards = (flashcards: DraftFlashcard[]): FlashcardBulkItemInput[] =>
  flashcards.map((flashcard) => ({
    id: flashcard.id,
    front: normalizeRichTextValue(flashcard.front),
    back: normalizeRichTextValue(flashcard.back),
    type: flashcard.type,
    is_deleted: Boolean(flashcard.isDeleted),
  }));

const normalizeQuestions = (questions: DraftQuestion[]): QuestionBulkItemInput[] =>
  questions.map((question) => ({
    id: question.id,
    text: question.text.trim(),
    is_deleted: Boolean(question.isDeleted),
    answers: question.answers.map((answer) => ({
      id: answer.id,
      text: answer.text.trim(),
      explanation: answer.explanation.trim(),
      is_correct: answer.is_correct,
    })),
  }));

export function BulkEditContentDialog({
  documentId,
  mode,
  disabled = false,
  onSaved,
  triggerMode = "full",
}: BulkEditContentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flashcards, setFlashcards] = useState<DraftFlashcard[]>([]);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [originalSnapshot, setOriginalSnapshot] = useState("");
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");
  const [mobileSection, setMobileSection] = useState<MobileSection>("items");

  const visibleFlashcards = flashcards.filter((flashcard) => !flashcard.isDeleted);
  const visibleQuestions = questions.filter((question) => !question.isDeleted);

  const currentSnapshot = useMemo(() => {
    return JSON.stringify(
      mode === "flashcards"
        ? normalizeFlashcards(flashcards)
        : normalizeQuestions(questions)
    );
  }, [flashcards, mode, questions]);

  const hasChanges = currentSnapshot !== originalSnapshot;

  const selectedFlashcard =
    mode === "flashcards"
      ? visibleFlashcards.find((flashcard) => flashcard.localId === selectedId) ?? visibleFlashcards[0] ?? null
      : null;

  const selectedQuestion =
    mode === "quiz"
      ? visibleQuestions.find((question) => question.localId === selectedId) ?? visibleQuestions[0] ?? null
      : null;

  useEffect(() => {
    if (!open) return;

    const loadContent = async () => {
      setIsLoading(true);
      try {
        setMobileSection("items");
        if (mode === "flashcards") {
          const data = await apiClient.getDocumentFlashcards(documentId);
          const draft = data.map((flashcard) => createDraftFlashcard(flashcard));
          setFlashcards(draft);
          setQuestions([]);
          setSelectedId(draft[0]?.localId ?? null);
          setPreviewSide("front");
          setOriginalSnapshot(JSON.stringify(normalizeFlashcards(draft)));
        } else {
          const document = await apiClient.getDocument(documentId);
          const draft = (document.quiz?.questions ?? []).map((question) => createDraftQuestion(question));
          setQuestions(draft);
          setFlashcards([]);
          setSelectedId(draft[0]?.localId ?? null);
          setOriginalSnapshot(JSON.stringify(normalizeQuestions(draft)));
        }
      } catch (error: any) {
        toast.error("Não foi possível carregar o conteúdo", {
          description: error.message,
        });
        setOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [documentId, mode, open]);

  const ensureSelected = (nextIds: string[]) => {
    setSelectedId((current) => {
      if (current && nextIds.includes(current)) return current;
      return nextIds[0] ?? null;
    });
  };

  const handleAddFlashcard = () => {
    const next = [...flashcards, createDraftFlashcard()];
    setFlashcards(next);
    setSelectedId(next[next.length - 1].localId);
    setMobileSection("editor");
  };

  const handleDeleteFlashcard = (localId: string) => {
    const target = flashcards.find((flashcard) => flashcard.localId === localId);
    if (!target) return;

    const next = target.id
      ? flashcards.map((flashcard) =>
          flashcard.localId === localId ? { ...flashcard, isDeleted: true } : flashcard
        )
      : flashcards.filter((flashcard) => flashcard.localId !== localId);

    setFlashcards(next);
    ensureSelected(next.filter((flashcard) => !flashcard.isDeleted).map((flashcard) => flashcard.localId));
  };

  const updateFlashcardField = (
    localId: string,
    field: keyof Pick<DraftFlashcard, "front" | "back">,
    value: string
  ) => {
    setFlashcards((current) =>
      current.map((flashcard) =>
        flashcard.localId === localId ? { ...flashcard, [field]: value } : flashcard
      )
    );
  };

  const handleAddQuestion = () => {
    const next = [...questions, createDraftQuestion()];
    setQuestions(next);
    setSelectedId(next[next.length - 1].localId);
    setMobileSection("editor");
  };

  const handleDeleteQuestion = (localId: string) => {
    const target = questions.find((question) => question.localId === localId);
    if (!target) return;

    const next = target.id
      ? questions.map((question) =>
          question.localId === localId ? { ...question, isDeleted: true } : question
        )
      : questions.filter((question) => question.localId !== localId);

    setQuestions(next);
    ensureSelected(next.filter((question) => !question.isDeleted).map((question) => question.localId));
  };

  const updateQuestionField = (localId: string, value: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.localId === localId ? { ...question, text: value } : question
      )
    );
  };

  const updateAnswerField = (
    questionLocalId: string,
    answerLocalId: string,
    field: keyof Pick<DraftAnswer, "text" | "explanation">,
    value: string
  ) => {
    setQuestions((current) =>
      current.map((question) =>
        question.localId === questionLocalId
          ? {
              ...question,
              answers: question.answers.map((answer) =>
                answer.localId === answerLocalId ? { ...answer, [field]: value } : answer
              ),
            }
          : question
      )
    );
  };

  const markCorrectAnswer = (questionLocalId: string, answerLocalId: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.localId === questionLocalId
          ? {
              ...question,
              answers: question.answers.map((answer) => ({
                ...answer,
                is_correct: answer.localId === answerLocalId,
              })),
            }
          : question
      )
    );
  };

  const addAnswer = (questionLocalId: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.localId === questionLocalId
          ? {
              ...question,
              answers: [...question.answers, createDraftAnswer()],
            }
          : question
      )
    );
  };

  const removeAnswer = (questionLocalId: string, answerLocalId: string) => {
    setQuestions((current) =>
      current.map((question) => {
        if (question.localId !== questionLocalId) return question;

        const nextAnswers = question.answers.filter((answer) => answer.localId !== answerLocalId);
        const hasCorrect = nextAnswers.some((answer) => answer.is_correct);
        return {
          ...question,
          answers: nextAnswers.map((answer, index) => ({
            ...answer,
            is_correct: hasCorrect ? answer.is_correct : index === 0,
          })),
        };
      })
    );
  };

  const validateBeforeSave = () => {
    if (mode === "flashcards") {
      const invalid = visibleFlashcards.find(
        (flashcard) => isRichTextEmpty(flashcard.front) || isRichTextEmpty(flashcard.back)
      );

      if (invalid) {
        toast.error("Preencha frente e verso de todos os flashcards.");
        setSelectedId(invalid.localId);
        return false;
      }
      return true;
    }

    const invalidQuestion = visibleQuestions.find((question) => {
      const filledAnswers = question.answers.filter((answer) => answer.text.trim());
      const correctAnswers = filledAnswers.filter((answer) => answer.is_correct);

      return !question.text.trim() || filledAnswers.length < 2 || correctAnswers.length !== 1;
    });

    if (invalidQuestion) {
      toast.error("Cada pergunta precisa de enunciado, 2 alternativas e 1 correta.");
      setSelectedId(invalidQuestion.localId);
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info("Nenhuma alteração para salvar.");
      return;
    }

    if (!validateBeforeSave()) return;

    setIsSaving(true);
    try {
      if (mode === "flashcards") {
        await apiClient.bulkUpdateDocumentFlashcards(documentId, normalizeFlashcards(flashcards));
      } else {
        await apiClient.bulkUpdateDocumentQuiz(documentId, normalizeQuestions(questions));
      }

      toast.success(mode === "flashcards" ? "Flashcards atualizados." : "Quiz atualizado.");
      setOpen(false);
      await onSaved?.();
    } catch (error: any) {
      toast.error("Falha ao salvar alterações", {
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const stopModalEventPropagation = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const closeLikeXFromOverlay = () => {
    const consume = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if ("stopImmediatePropagation" in event) {
        event.stopImmediatePropagation();
      }
    };

    const cleanup = () => {
      document.removeEventListener("touchstart", consume, true);
      document.removeEventListener("touchend", consume, true);
      document.removeEventListener("pointerup", consume, true);
      document.removeEventListener("mouseup", consume, true);
      document.removeEventListener("click", consume, true);
    };

    document.addEventListener("touchstart", consume, true);
    document.addEventListener("touchend", consume, true);
    document.addEventListener("pointerup", consume, true);
    document.addEventListener("mouseup", consume, true);
    document.addEventListener("click", consume, true);

    window.setTimeout(() => {
      cleanup();
    }, 120);

    setOpen(false);
  };

  const listPanel = (
    <div className="flex h-full min-h-0 flex-col border-b border-black/10 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02] lg:border-b-0 lg:border-r">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="text-sm font-medium">
            {mode === "flashcards"
              ? `${visibleFlashcards.length} flashcards ativos`
              : `${visibleQuestions.length} perguntas ativas`}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasChanges ? "Há alterações pendentes." : "Tudo salvo até aqui."}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={mode === "flashcards" ? handleAddFlashcard : handleAddQuestion}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
      </div>

      {/* Desktop: usa ScrollArea do Radix; Mobile: overflow nativo para scroll por toque funcionar */}
      <ScrollArea className={`${sectionScrollAreaClassName} hidden flex-1 px-3 pb-4 lg:block`}>
        <div className="space-y-2">
          {mode === "flashcards" ? (
            visibleFlashcards.length > 0 ? (
              visibleFlashcards.map((flashcard, index) => (
                <button
                  key={flashcard.localId}
                  type="button"
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    selectedFlashcard?.localId === flashcard.localId
                      ? "border-[#FACC15]/55 bg-[#FACC15]/10 shadow-[0_0_0_1px_rgba(250,204,21,0.08)]"
                      : "border-black/10 bg-background/80 hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                  }`}
                  onClick={() => {
                    setSelectedId(flashcard.localId);
                    setMobileSection("editor");
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Card {index + 1}</Badge>
                        {!flashcard.id && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                            Novo
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium">
                        {richTextPreview(flashcard.front) || "Sem frente ainda"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {richTextPreview(flashcard.back) || "Sem verso ainda"}
                      </p>
                    </div>
                    <Trash2 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-muted-foreground dark:border-white/10">
                Nenhum flashcard ativo.
              </div>
            )
          ) : visibleQuestions.length > 0 ? (
            visibleQuestions.map((question, index) => (
              <button
                key={question.localId}
                type="button"
                className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                  selectedQuestion?.localId === question.localId
                    ? "border-[#48cfea]/55 bg-[#48cfea]/10 shadow-[0_0_0_1px_rgba(72,207,234,0.08)]"
                    : "border-black/10 bg-background/80 hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                }`}
                onClick={() => {
                  setSelectedId(question.localId);
                  setMobileSection("editor");
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Pergunta {index + 1}</Badge>
                      {!question.id && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                          Nova
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm font-medium">
                      {question.text || "Sem enunciado ainda"}
                    </p>
                  </div>
                  <Trash2 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-muted-foreground dark:border-white/10">
              Nenhuma pergunta ativa.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Mobile-only: scroll nativo com suporte a toque */}
      <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-3 pb-4 lg:hidden">
        <div className="space-y-2">
          {mode === "flashcards" ? (
            visibleFlashcards.length > 0 ? (
              visibleFlashcards.map((flashcard, index) => (
                <button
                  key={flashcard.localId}
                  type="button"
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    selectedFlashcard?.localId === flashcard.localId
                      ? "border-[#FACC15]/55 bg-[#FACC15]/10 shadow-[0_0_0_1px_rgba(250,204,21,0.08)]"
                      : "border-black/10 bg-background/80 hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                  }`}
                  onClick={() => {
                    setSelectedId(flashcard.localId);
                    setMobileSection("editor");
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Card {index + 1}</Badge>
                        {!flashcard.id && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                            Novo
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium">
                        {richTextPreview(flashcard.front) || "Sem frente ainda"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {richTextPreview(flashcard.back) || "Sem verso ainda"}
                      </p>
                    </div>
                    <Trash2 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-muted-foreground dark:border-white/10">
                Nenhum flashcard ativo.
              </div>
            )
          ) : visibleQuestions.length > 0 ? (
            visibleQuestions.map((question, index) => (
              <button
                key={question.localId}
                type="button"
                className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                  selectedQuestion?.localId === question.localId
                    ? "border-[#48cfea]/55 bg-[#48cfea]/10 shadow-[0_0_0_1px_rgba(72,207,234,0.08)]"
                    : "border-black/10 bg-background/80 hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                }`}
                onClick={() => {
                  setSelectedId(question.localId);
                  setMobileSection("editor");
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Pergunta {index + 1}</Badge>
                      {!question.id && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                          Nova
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm font-medium">
                      {question.text || "Sem enunciado ainda"}
                    </p>
                  </div>
                  <Trash2 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-muted-foreground dark:border-white/10">
              Nenhuma pergunta ativa.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const editorPanel = (
    <div className="flex h-full min-h-0 flex-col border-b border-black/10 bg-background/70 dark:border-white/10 dark:bg-[#151821] lg:border-b-0 lg:border-r">
      {/* Desktop usa ScrollArea; Mobile usa overflow nativo */}
      <ScrollArea className={`${sectionScrollAreaClassName} hidden h-full lg:block`}>
        <div className="p-6">
        {mode === "flashcards" ? (
          selectedFlashcard ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Flashcard selecionado</Badge>
                  {!selectedFlashcard.id && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                      Novo
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteFlashcard(selectedFlashcard.localId)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Frente</label>
                <RichTextEditor
                  value={selectedFlashcard.front}
                  onChange={(value) => updateFlashcardField(selectedFlashcard.localId, "front", value)}
                  onFocus={() => setPreviewSide("front")}
                  placeholder="Pergunta, definição ou termo-chave"
                  minHeightClassName="min-h-[160px]"
                  className="bg-black/[0.025] dark:bg-white/[0.04]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Verso</label>
                <RichTextEditor
                  value={selectedFlashcard.back}
                  onChange={(value) => updateFlashcardField(selectedFlashcard.localId, "back", value)}
                  onFocus={() => setPreviewSide("back")}
                  placeholder="Resposta, passos de cálculo, citação, fórmula ou exemplo"
                  minHeightClassName="min-h-[240px]"
                  className="bg-black/[0.025] dark:bg-white/[0.04]"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-muted-foreground dark:border-white/10">
              Selecione ou crie um flashcard para editar.
            </div>
          )
        ) : selectedQuestion ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Pergunta selecionada</Badge>
                {!selectedQuestion.id && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                    Nova
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteQuestion(selectedQuestion.localId)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Enunciado</label>
              <Textarea
                value={selectedQuestion.text}
                onChange={(event) => updateQuestionField(selectedQuestion.localId, event.target.value)}
                className="min-h-[120px] border border-black/10 bg-black/[0.025] shadow-none dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>

            <div className="space-y-3">
              {selectedQuestion.answers.map((answer, answerIndex) => (
                <div key={answer.localId} className="rounded-xl border border-black/10 bg-black/[0.02] p-3 space-y-3 dark:border-white/10 dark:bg-white/[0.035]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={answer.is_correct ? "default" : "secondary"}>
                        {answer.is_correct ? "Correta" : `Alternativa ${answerIndex + 1}`}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => markCorrectAnswer(selectedQuestion.localId, answer.localId)}
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Marcar correta
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={selectedQuestion.answers.length <= 2}
                      onClick={() => removeAnswer(selectedQuestion.localId, answer.localId)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <Input
                    value={answer.text}
                    onChange={(event) =>
                      updateAnswerField(
                        selectedQuestion.localId,
                        answer.localId,
                        "text",
                        event.target.value
                      )
                    }
                    placeholder="Texto da alternativa"
                    className="border border-black/10 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
                  />
                  <Textarea
                    value={answer.explanation}
                    onChange={(event) =>
                      updateAnswerField(
                        selectedQuestion.localId,
                        answer.localId,
                        "explanation",
                        event.target.value
                      )
                    }
                    placeholder="Explicação opcional para feedback da resposta"
                    className="min-h-[84px] border border-black/10 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={() => addAnswer(selectedQuestion.localId)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar alternativa
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-muted-foreground dark:border-white/10">
            Selecione ou crie uma pergunta para editar.
          </div>
        )}
        </div>
      </ScrollArea>

      {/* Mobile: scroll nativo */}
      <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-6 lg:hidden">
        {mode === "flashcards" ? (
          selectedFlashcard ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Flashcard selecionado</Badge>
                  {!selectedFlashcard.id && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                      Novo
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteFlashcard(selectedFlashcard.localId)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Frente</label>
                <RichTextEditor
                  value={selectedFlashcard.front}
                  onChange={(value) => updateFlashcardField(selectedFlashcard.localId, "front", value)}
                  onFocus={() => setPreviewSide("front")}
                  placeholder="Pergunta, definição ou termo-chave"
                  minHeightClassName="min-h-[160px]"
                  className="bg-black/[0.025] dark:bg-white/[0.04]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Verso</label>
                <RichTextEditor
                  value={selectedFlashcard.back}
                  onChange={(value) => updateFlashcardField(selectedFlashcard.localId, "back", value)}
                  onFocus={() => setPreviewSide("back")}
                  placeholder="Resposta, passos de cálculo, citação, fórmula ou exemplo"
                  minHeightClassName="min-h-[240px]"
                  className="bg-black/[0.025] dark:bg-white/[0.04]"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-muted-foreground dark:border-white/10">
              Selecione ou crie um flashcard para editar.
            </div>
          )
        ) : selectedQuestion ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Pergunta selecionada</Badge>
                {!selectedQuestion.id && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                    Nova
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteQuestion(selectedQuestion.localId)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Enunciado</label>
              <Textarea
                value={selectedQuestion.text}
                onChange={(event) => updateQuestionField(selectedQuestion.localId, event.target.value)}
                className="min-h-[120px] border border-black/10 bg-black/[0.025] shadow-none dark:border-white/10 dark:bg-white/[0.04]"
              />
            </div>

            <div className="space-y-3">
              {selectedQuestion.answers.map((answer, answerIndex) => (
                <div key={answer.localId} className="rounded-xl border border-black/10 bg-black/[0.02] p-3 space-y-3 dark:border-white/10 dark:bg-white/[0.035]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={answer.is_correct ? "default" : "secondary"}>
                        {answer.is_correct ? "Correta" : `Alternativa ${answerIndex + 1}`}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => markCorrectAnswer(selectedQuestion.localId, answer.localId)}
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Marcar correta
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={selectedQuestion.answers.length <= 2}
                      onClick={() => removeAnswer(selectedQuestion.localId, answer.localId)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  <Input
                    value={answer.text}
                    onChange={(event) =>
                      updateAnswerField(
                        selectedQuestion.localId,
                        answer.localId,
                        "text",
                        event.target.value
                      )
                    }
                    placeholder="Texto da alternativa"
                    className="border border-black/10 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
                  />
                  <Textarea
                    value={answer.explanation}
                    onChange={(event) =>
                      updateAnswerField(
                        selectedQuestion.localId,
                        answer.localId,
                        "explanation",
                        event.target.value
                      )
                    }
                    placeholder="Explicação opcional para feedback da resposta"
                    className="min-h-[84px] border border-black/10 bg-background/80 shadow-none dark:border-white/10 dark:bg-white/[0.04]"
                  />
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={() => addAnswer(selectedQuestion.localId)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar alternativa
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-muted-foreground dark:border-white/10">
            Selecione ou crie uma pergunta para editar.
          </div>
        )}
      </div>
    </div>
  );

  const previewPanel = (
    <div className="flex h-full min-h-0 flex-col bg-black/[0.02] dark:bg-white/[0.02]">
      <div className="flex shrink-0 items-center gap-2 px-6 py-4">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold">Preview ao vivo</h3>
      </div>
      <Separator />

      {/* Desktop usa ScrollArea; Mobile usa overflow nativo */}
      <ScrollArea className={`${sectionScrollAreaClassName} hidden flex-1 lg:block`}>
        <div className="p-6">
          {mode === "flashcards" ? (
            selectedFlashcard ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary">
                    Preview {previewSide === "front" ? "da frente" : "do verso"}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setPreviewSide((current) => (current === "front" ? "back" : "front"))
                    }
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Virar preview
                  </Button>
                </div>

                <div className="perspective-1000">
                  <div
                    className="relative h-[320px] w-full transform-style-preserve-3d transition-transform duration-500"
                    style={{ transform: previewSide === "back" ? "rotateY(180deg)" : "rotateY(0deg)" }}
                  >
                    <div className="absolute inset-0 backface-hidden">
                      <div className="flex h-full flex-col rounded-xl border border-black/10 bg-card p-5 shadow-sm dark:border-white/10 dark:bg-card">
                        <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          Frente
                        </p>
                        <div className="flex min-h-0 flex-1">
                          <EnhancedFlashcardRenderer
                            content={selectedFlashcard.front || "Digite o conteúdo da frente para visualizar aqui."}
                            type={selectedFlashcard.type}
                            className="text-base font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-0 backface-hidden rotate-y-180">
                      <div className="flex h-full flex-col rounded-xl border border-black/10 bg-card p-5 shadow-sm dark:border-white/10 dark:bg-card">
                        <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          Verso
                        </p>
                        <div className="flex min-h-0 flex-1">
                          <EnhancedFlashcardRenderer
                            content={selectedFlashcard.back || "O verso atualizado aparece aqui em tempo real."}
                            type={selectedFlashcard.type}
                            isAnswer
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-muted-foreground dark:border-white/10">
                Selecione ou crie um flashcard para ver o preview.
              </div>
            )
          ) : selectedQuestion ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-[#48cfea]/35 bg-background/90 p-5 shadow-sm dark:bg-white/[0.02]">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-3">
                  Pergunta
                </p>
                <p className="whitespace-pre-wrap text-base font-medium leading-relaxed">
                  {selectedQuestion.text || "Digite o enunciado para visualizar aqui."}
                </p>
              </div>

              <div className="space-y-3">
                {selectedQuestion.answers.filter((answer) => answer.text.trim()).length > 0 ? (
                  selectedQuestion.answers
                    .filter((answer) => answer.text.trim())
                    .map((answer) => (
                      <div
                        key={answer.localId}
                        className={`rounded-2xl border p-4 ${
                          answer.is_correct
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : "border-black/10 bg-background/90 dark:border-white/10 dark:bg-white/[0.03]"
                        }`}
                      >
                        <p className="text-sm font-medium whitespace-pre-wrap">{answer.text}</p>
                        {answer.explanation && (
                          <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                            {answer.explanation}
                          </p>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-muted-foreground dark:border-white/10">
                    As alternativas preenchidas aparecem aqui com destaque para a correta.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-muted-foreground dark:border-white/10">
              Selecione ou crie uma pergunta para ver o preview.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Mobile: scroll nativo */}
      <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-6 lg:hidden">
        {mode === "flashcards" ? (
          selectedFlashcard ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">
                  Preview {previewSide === "front" ? "da frente" : "do verso"}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPreviewSide((current) => (current === "front" ? "back" : "front"))
                  }
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Virar preview
                </Button>
              </div>

              <div className="perspective-1000">
                <div
                  className="relative h-[320px] w-full transform-style-preserve-3d transition-transform duration-500"
                  style={{ transform: previewSide === "back" ? "rotateY(180deg)" : "rotateY(0deg)" }}
                >
                  <div className="absolute inset-0 backface-hidden">
                    <div className="flex h-full flex-col rounded-xl border border-black/10 bg-card p-5 shadow-sm dark:border-white/10 dark:bg-card">
                      <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Frente
                      </p>
                      <div className="flex min-h-0 flex-1">
                        <EnhancedFlashcardRenderer
                          content={selectedFlashcard.front || "Digite o conteúdo da frente para visualizar aqui."}
                          type={selectedFlashcard.type}
                          className="text-base font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 backface-hidden rotate-y-180">
                    <div className="flex h-full flex-col rounded-xl border border-black/10 bg-card p-5 shadow-sm dark:border-white/10 dark:bg-card">
                      <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Verso
                      </p>
                      <div className="flex min-h-0 flex-1">
                        <EnhancedFlashcardRenderer
                          content={selectedFlashcard.back || "O verso atualizado aparece aqui em tempo real."}
                          type={selectedFlashcard.type}
                          isAnswer
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-muted-foreground dark:border-white/10">
              Selecione ou crie um flashcard para ver o preview.
            </div>
          )
        ) : selectedQuestion ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-[#48cfea]/35 bg-background/90 p-5 shadow-sm dark:bg-white/[0.02]">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mb-3">
                Pergunta
              </p>
              <p className="whitespace-pre-wrap text-base font-medium leading-relaxed">
                {selectedQuestion.text || "Digite o enunciado para visualizar aqui."}
              </p>
            </div>

            <div className="space-y-3">
              {selectedQuestion.answers.filter((answer) => answer.text.trim()).length > 0 ? (
                selectedQuestion.answers
                  .filter((answer) => answer.text.trim())
                  .map((answer) => (
                    <div
                      key={answer.localId}
                      className={`rounded-2xl border p-4 ${
                        answer.is_correct
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : "border-black/10 bg-background/90 dark:border-white/10 dark:bg-white/[0.03]"
                      }`}
                    >
                      <p className="text-sm font-medium whitespace-pre-wrap">{answer.text}</p>
                      {answer.explanation && (
                        <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                          {answer.explanation}
                        </p>
                      )}
                    </div>
                  ))
              ) : (
                <div className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-muted-foreground dark:border-white/10">
                  As alternativas preenchidas aparecem aqui com destaque para a correta.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/15 p-6 text-sm text-muted-foreground dark:border-white/10">
            Selecione ou crie uma pergunta para ver o preview.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Button
        type="button"
        variant={triggerMode === "icon" ? "ghost" : "outline"}
        size={triggerMode === "icon" ? "icon" : undefined}
        className={triggerMode === "icon" ? "h-9 w-9" : "w-full"}
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label={mode === "flashcards" ? "Editar flashcards em massa" : "Editar quiz em massa"}
      >
        <PencilLine className={triggerMode === "icon" ? "w-4 h-4" : "w-4 h-4 mr-2"} />
        {triggerMode === "full" ? "Editar em massa" : <span className="sr-only">Editar em massa</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex h-[92vh] w-[calc(100vw-1.5rem)] max-w-7xl flex-col overflow-hidden border border-black/10 bg-background p-0 shadow-2xl dark:border-white/10 dark:bg-[#171922] sm:w-[calc(100vw-3rem)]"
          showCloseButton={!isSaving}
          closeOnOverlayClick={!isSaving}
          onOverlayClick={() => {
            if (!isSaving) {
              closeLikeXFromOverlay();
            }
          }}
          onPointerDownOutside={(event) => {
            event.preventDefault();
          }}
          onInteractOutside={(event) => {
            event.preventDefault();
          }}
        >
          {/* onTouchStart/onTouchEnd não são bloqueados para permitir scroll por deslize em mobile */}
          <div
            className="contents"
            onClick={stopModalEventPropagation}
            onPointerDown={stopModalEventPropagation}
            onPointerUp={stopModalEventPropagation}
            onMouseDown={stopModalEventPropagation}
            onMouseUp={stopModalEventPropagation}
          >
          <DialogHeader className="border-b border-black/10 px-6 pb-5 pt-6 dark:border-white/10">
            <DialogTitle>
              {mode === "flashcards" ? "Gerenciamento de flashcards" : "Gerenciamento de quizzes"}
            </DialogTitle>
            <DialogDescription>
              Edite, adicione e remova conteúdo sem sair do deck. O preview responde em tempo real.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Carregando conteúdo do deck...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex border-b border-black/10 px-3 py-2 dark:border-white/10 lg:hidden">
                <div className="grid w-full grid-cols-3 gap-2 rounded-xl bg-black/[0.04] p-1 dark:bg-white/[0.04]">
                  <Button
                    type="button"
                    variant={mobileSection === "items" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setMobileSection("items")}
                    className="w-full"
                  >
                    Itens
                  </Button>
                  <Button
                    type="button"
                    variant={mobileSection === "editor" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setMobileSection("editor")}
                    className="w-full"
                  >
                    Editor
                  </Button>
                  <Button
                    type="button"
                    variant={mobileSection === "preview" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setMobileSection("preview")}
                    className="w-full"
                  >
                    Preview
                  </Button>
                </div>
              </div>

              <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_360px]">
                {listPanel}
                {editorPanel}
                {previewPanel}
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
                {mobileSection === "items" && listPanel}
                {mobileSection === "editor" && editorPanel}
                {mobileSection === "preview" && previewPanel}
              </div>
            </>
          )}

          <DialogFooter className="border-t border-black/10 px-6 py-4 dark:border-white/10">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isSaving}>
              Fechar
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || isLoading || !hasChanges}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar alterações
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
