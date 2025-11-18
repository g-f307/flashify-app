// front/components/study/add-content-modal.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Plus,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Zap,
  Sprout,
  Leaf,
  Trees,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number, difficulty: string) => Promise<void>;
  contentType: "flashcards" | "questions";
  currentCount: number;
  maxLimit: number;
}

const QUANTITY_OPTIONS = [3, 5, 8, 10];

const DIFFICULTY_OPTIONS = [
  {
    value: "Fácil",
    label: "Fácil",
    icon: Sprout,
    description: "Conceitos básicos e fundamentais",
  },
  {
    value: "Média",
    label: "Média",
    icon: Leaf,
    description: "Exige compreensão e aplicação",
  },
  {
    value: "Difícil",
    label: "Difícil",
    icon: Trees,
    description: "Análise crítica e síntese",
  },
];

const LOADING_MESSAGES = {
  flashcards: [
    "Analisando o conteúdo original...",
    "Identificando novos conceitos...",
    "Criando flashcards inéditos...",
    "Revisando duplicatas...",
    "Finalizando os flashcards...",
  ],
  questions: [
    "Analisando o conteúdo original...",
    "Identificando tópicos não abordados...",
    "Gerando novas perguntas...",
    "Criando alternativas plausíveis...",
    "Finalizando o quiz...",
  ],
};

export function AddContentModal({
  isOpen,
  onClose,
  onConfirm,
  contentType,
  currentCount,
  maxLimit,
}: AddContentModalProps) {
  const [quantity, setQuantity] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>("Média");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("");

  const availableSlots = maxLimit - currentCount;
  const isOverLimit = quantity > availableSlots || quantity < 1;

  const contentLabels = {
    flashcards: {
      singular: "flashcard",
      plural: "flashcards",
      title: "Adicionar Flashcards",
      description: "Expanda seu deck com novos flashcards gerados pela IA",
      icon: Sparkles,
    },
    questions: {
      singular: "pergunta",
      plural: "perguntas",
      title: "Adicionar Perguntas",
      description: "Amplie seu quiz com novas perguntas geradas pela IA",
      icon: TrendingUp,
    },
  };

  const labels = contentLabels[contentType];
  const Icon = labels.icon;

  const selectedDifficulty = DIFFICULTY_OPTIONS.find(
    (opt) => opt.value === difficulty
  );

  const handleConfirm = async () => {
    if (isOverLimit) return;

    setError(null);
    setIsLoading(true);
    setLoadingProgress(0);

    const messages = LOADING_MESSAGES[contentType];
    let messageIndex = 0;
    setCurrentLoadingMessage(messages[0]);

    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 15;
      });

      const newMessageIndex = Math.min(
        Math.floor((loadingProgress / 100) * messages.length),
        messages.length - 1
      );

      if (newMessageIndex !== messageIndex && messages[newMessageIndex]) {
        messageIndex = newMessageIndex;
        setCurrentLoadingMessage(messages[newMessageIndex]);
      }
    }, 800);

    try {
      await onConfirm(quantity, difficulty);
      setLoadingProgress(100);
      clearInterval(progressInterval);

      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setQuantity(5);
          setDifficulty("Média");
          setLoadingProgress(0);
          setCurrentLoadingMessage("");
        }, 300);
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      
      // 🆕 TRATAMENTO ESPECIAL PARA ERRO 429
      if (err.message === "LIMIT_EXCEEDED" && err.limitInfo) {
        setError(
          `Limite diário de gerações atingido (${err.limitInfo.used}/${err.limitInfo.limit}). ` +
          `Renova em ${err.limitInfo.hours_until_reset}h.`
        );
      } else {
        setError(err.message || "Erro ao adicionar conteúdo");
      }
      
      setLoadingProgress(0);
      setCurrentLoadingMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      setQuantity(5);
      setDifficulty("Média");
      setLoadingProgress(0);
      setCurrentLoadingMessage("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            {labels.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {labels.description}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 py-8"
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="p-4 rounded-full bg-primary/10"
                >
                  <Sparkles className="w-8 h-8 text-primary" />
                </motion.div>

                <div className="text-center space-y-2 w-full">
                  <h3 className="text-lg font-semibold text-foreground">
                    Gerando conteúdo com IA
                  </h3>
                  <motion.p
                    key={currentLoadingMessage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-sm text-muted-foreground min-h-[20px]"
                  >
                    {currentLoadingMessage}
                  </motion.p>
                </div>

                <div className="w-full space-y-2">
                  <Progress value={loadingProgress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    {Math.round(loadingProgress)}% concluído
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-4 py-3 rounded-lg">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Isto pode levar alguns segundos. Aguarde...</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 py-4"
            >
              {/* Status Atual */}
              <div className="rounded-xl border border-border bg-gradient-to-br from-[#6BDEF3]/10 to-transparent p-5 space-y-3 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Status do Deck
                  </span>
                  <span className="text-lg font-bold text-[#6BDEF3]">
                    {currentCount} / {maxLimit}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentCount / maxLimit) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[#6BDEF3] to-[#6BDEF3]/80"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {labels.plural.charAt(0).toUpperCase() +
                        labels.plural.slice(1)}{" "}
                      atuais
                    </span>
                    <span className="font-medium text-[#6BDEF3]">
                      {availableSlots} disponíveis
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantidade (Cards + Input) */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Quantos {labels.plural} deseja adicionar?
                </Label>

                <RadioGroup
                  value={String(quantity)}
                  onValueChange={(value) => {
                    if (value) setQuantity(Number(value));
                  }}
                  className="grid grid-cols-4 gap-2"
                >
                  {QUANTITY_OPTIONS.map((qty) => {
                    const isDisabled = qty > availableSlots;
                    const isSelected = quantity === qty;

                    return (
                      <div key={qty}>
                        <RadioGroupItem
                          value={String(qty)}
                          id={`qty-${qty}`}
                          className="sr-only"
                          disabled={isDisabled}
                        />
                        <Label
                          htmlFor={`qty-${qty}`}
                          className={`
                            flex items-center justify-center p-4 text-2xl font-bold rounded-lg border-2
                            transition-colors cursor-pointer
                            ${
                              isDisabled
                                ? "border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed dark:border-neutral-800"
                                : isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:bg-accent dark:border-neutral-800"
                            }
                          `}
                        >
                          {qty}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>

                <div className="relative text-center my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border dark:border-neutral-800"></span>
                  </div>
                  <span className="relative px-2 bg-background text-xs text-muted-foreground">
                    OU
                  </span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="custom-qty" className="text-sm font-medium">
                    Digite um valor (Máx: {availableSlots})
                  </Label>
                  <Input
                    id="custom-qty"
                    type="number"
                    min={1}
                    max={availableSlots}
                    value={quantity === 0 ? "" : quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        setQuantity(0);
                        return;
                      }
                      
                      let num = parseInt(value, 10);

                      if (!isNaN(num)) {
                        if (num > availableSlots) {
                          num = availableSlots;
                        }
                        setQuantity(num);
                      }
                    }}
                    placeholder={`Ex: 7 (limite: ${availableSlots})`}
                    className="h-11 text-base text-center"
                  />
                  {quantity < 1 && quantity !== 0 && (
                     <p className="text-xs text-destructive px-1">
                       O valor deve ser ao menos 1.
                     </p>
                  )}
                </div>
              </div>

              {/* Dificuldade */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Nível de dificuldade
                </Label>

                <RadioGroup
                  value={difficulty}
                  onValueChange={(value) => {
                    if (value) setDifficulty(value);
                  }}
                  className="grid grid-cols-3 gap-2"
                >
                  {DIFFICULTY_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = difficulty === option.value;

                    return (
                      <div key={option.value}>
                        <RadioGroupItem
                          value={option.value}
                          id={`diff-${option.value}`}
                          className="sr-only"
                        />
                        <Label
                          htmlFor={`diff-${option.value}`}
                          className={`
                            flex flex-col items-center gap-2 p-4 rounded-lg border-2
                            transition-colors cursor-pointer
                            ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:bg-accent dark:border-neutral-800"
                            }
                          `}
                        >
                          <IconComponent className="w-6 h-6" />
                          <span className="text-sm font-semibold">
                            {option.label}
                          </span>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>

                {selectedDifficulty && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-muted/50 border border-border dark:border-neutral-800"
                  >
                    <p className="text-xs text-muted-foreground text-center">
                      {selectedDifficulty.description}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-border bg-muted/50 p-4 dark:border-neutral-800"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Resumo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Após confirmar, serão adicionados:
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      {quantity < 1 ? 0 : quantity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {quantity === 1 ? labels.singular : labels.plural}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t dark:border-neutral-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total final:</span>
                    <span className="font-semibold text-foreground">
                      {(currentCount + quantity < 1 ? currentCount : currentCount + quantity)} / {maxLimit}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Erro */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isOverLimit}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar{" "}
              {labels.plural.charAt(0).toUpperCase() + labels.plural.slice(1)}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}