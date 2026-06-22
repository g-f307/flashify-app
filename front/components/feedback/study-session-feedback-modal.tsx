"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Confetti from "react-confetti";
import {
  Check,
  Copy,
  Gift,
  Link2,
  Loader2,
  Send,
  Share2,
  X,
} from "lucide-react";
import {
  FaInstagram,
  FaLinkedinIn,
  FaTelegram,
  FaWhatsapp,
  FaXTwitter,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useGenerationLimit } from "@/contexts/generation-limit-context";
import {
  apiClient,
  StudyFeedbackSessionType,
} from "@/lib/api";
import type { FlashinhoExpressionVariant } from "@/lib/flashinho-expression";
import { FlashinhoExpression } from "@/components/ui/flashinho-expression";
import { trackUserFeedback } from "@/lib/analytics-utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSound } from "@/contexts/sound-context";

const APP_SHARE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://flashify.cloud";
const FEEDBACK_MAX_LENGTH = 240;

const FEEDBACK_OPTIONS = [
  { value: 1, mascotVariant: "muito_ruim" as FlashinhoExpressionVariant, label: "Muito ruim" },
  { value: 2, mascotVariant: "ruim" as FlashinhoExpressionVariant, label: "Ruim" },
  { value: 3, mascotVariant: "ok" as FlashinhoExpressionVariant, label: "Ok" },
  { value: 4, mascotVariant: "boa" as FlashinhoExpressionVariant, label: "Boa" },
  { value: 5, mascotVariant: "amei" as FlashinhoExpressionVariant, label: "Amei" },
] as const;

const FEEDBACK_MASCOT_IMAGE_CLASS: Record<FlashinhoExpressionVariant, string> = {
  muito_ruim: "object-bottom scale-[1.12] -translate-y-[4%]",
  ruim: "object-bottom scale-[1.5] -translate-y-[7%]",
  ok: "object-bottom scale-[1.3] translate-y-[4%]",
  boa: "object-bottom scale-[1.2] translate-y-[4%]",
  amei: "object-bottom scale-[1.36] -translate-y-[4%]",
};

function getShareUrl() {
  if (typeof window === "undefined") {
    return APP_SHARE_URL;
  }

  const origin = window.location.origin;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return APP_SHARE_URL;
  }

  return origin;
}

function getShareMessage() {
  return "Estou usando o Flashify para transformar meus estudos em flashcards, quizzes e trilhas guiadas. Vale muito testar:";
}

function sendFeedbackToSupport(data: {
  sessionType: StudyFeedbackSessionType;
  documentId: number;
  rating: number;
  feedback?: string;
  rewardApplied: boolean;
}) {
  return fetch("/api/support/experience", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rating: data.rating,
      feedback: data.feedback,
      mostUsedFeature: data.sessionType,
      wouldRecommend: data.rating >= 4 ? "sim" : "talvez",
      easeOfUse: data.rating >= 4 ? "muito_facil" : data.rating === 3 ? "normal" : "dificil",
      documentId: data.documentId,
      rewardApplied: data.rewardApplied ? "sim" : "nao",
    }),
  }).catch(() => undefined);
}

interface StudySessionFeedbackModalProps {
  documentId?: number;
  sessionType?: StudyFeedbackSessionType;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoOpen?: boolean;
  initialStage?: "feedback" | "thanks" | "share";
}

export function StudySessionFeedbackModal({
  documentId,
  sessionType,
  open: openProp,
  onOpenChange,
  autoOpen = true,
  initialStage = "feedback",
}: StudySessionFeedbackModalProps) {
  const { limitInfo, loading, replaceLimitInfo } = useGenerationLimit();
  const { playSound } = useSound();
  const [internalOpen, setInternalOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [rewardOfferVisible, setRewardOfferVisible] = useState(false);
  const [hasRegisteredPromptView, setHasRegisteredPromptView] = useState(false);
  const [stage, setStage] = useState<"feedback" | "thanks" | "share">(initialStage);
  const [selectedRating, setSelectedRating] = useState(0);
  const [sliderRating, setSliderRating] = useState(3);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rewardApplied, setRewardApplied] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const closeTimerRef = useRef<number | null>(null);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const setOpen = (nextOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(nextOpen);
      return;
    }

    setInternalOpen(nextOpen);
  };

  useEffect(() => {
    if (!autoOpen || hasAutoOpened || loading) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRewardOfferVisible(Boolean(limitInfo?.feedback_reward_available));
      setOpen(true);
      setHasAutoOpened(true);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [autoOpen, hasAutoOpened, limitInfo, loading]);

  useEffect(() => {
    if (!autoOpen || !open || !rewardOfferVisible || hasRegisteredPromptView || !sessionType || !documentId) {
      return;
    }

    setHasRegisteredPromptView(true);
    apiClient
      .registerStudyFeedbackPromptView(sessionType, documentId)
      .then((info) => replaceLimitInfo(info))
      .catch(() => {
        setHasRegisteredPromptView(false);
      });
  }, [
    autoOpen,
    documentId,
    hasRegisteredPromptView,
    open,
    replaceLimitInfo,
    rewardOfferVisible,
    sessionType,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);

    return () => {
      window.removeEventListener("resize", updateViewportSize);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const shareUrl = getShareUrl();
  const shareMessage = `${getShareMessage()} ${shareUrl}`;
  const shouldShowImprovementField = selectedRating > 0 && selectedRating <= 3;
  const currentRatingLabel = FEEDBACK_OPTIONS.find(
    (option) => option.value === (selectedRating || sliderRating)
  )?.label;

  const resetModalState = () => {
    setStage(initialStage);
    setSelectedRating(0);
    setSliderRating(3);
    setFeedbackText("");
    setIsSubmitting(false);
    setRewardApplied(false);
    setRewardAmount(0);
    setCopied(false);
    setShowConfetti(false);
    setHasRegisteredPromptView(false);
    setRewardOfferVisible(Boolean(autoOpen && limitInfo?.feedback_reward_available));
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      closeTimerRef.current = window.setTimeout(() => {
        resetModalState();
      }, 180);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRating || isSubmitting || !sessionType || !documentId) {
      toast.warning("Escolha uma nota antes de enviar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedFeedback = feedbackText.trim();
      const response = await apiClient.submitStudyFeedback(
        sessionType,
        selectedRating,
        trimmedFeedback || undefined,
        documentId
      );

      replaceLimitInfo(response.generation_limit);
      setRewardApplied(response.reward_applied);
      setRewardAmount(response.reward_amount);
      setShowConfetti(response.reward_applied);
      setStage("thanks");
      playSound(response.reward_applied ? "reward" : "sessionComplete");

      trackUserFeedback(selectedRating, sessionType);
      void sendFeedbackToSupport({
        sessionType,
        documentId,
        rating: selectedRating,
        feedback: trimmedFeedback || undefined,
        rewardApplied: response.reward_applied,
      });
    } catch (error: any) {
      toast.error("Não foi possível enviar seu feedback.", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyShareMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast.success("Mensagem copiada!", {
        description: "Agora você pode compartilhar com quem quiser.",
      });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Não foi possível copiar a mensagem automaticamente.");
    }
  };

  const openExternalShare = async (url: string, copyFirst = false) => {
    if (copyFirst) {
      try {
        await navigator.clipboard.writeText(shareMessage);
        toast.success("Mensagem copiada para facilitar o compartilhamento.");
      } catch {
        toast.info("Abra a rede e cole sua mensagem de indicação.");
      }
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      {showConfetti && viewportSize.width > 0 && viewportSize.height > 0 && (
        <Confetti
          width={viewportSize.width}
          height={viewportSize.height}
          recycle={false}
          numberOfPieces={220}
          gravity={0.22}
          className="pointer-events-none !fixed !inset-0 !z-[70]"
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1.25rem)] max-w-[28rem] overflow-hidden rounded-[2rem] border border-black/10 bg-background p-0 shadow-[0_30px_80px_-32px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#171922] sm:w-full"
      >
        <button
          type="button"
          onClick={() => handleDialogOpenChange(false)}
          className="absolute right-4 top-4 z-20 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          aria-label="Fechar modal"
        >
          <X className="h-4 w-4" />
        </button>

        <AnimatePresence mode="wait">
          {stage === "feedback" && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="px-5 pb-5 pt-7 sm:px-6 sm:pb-6 sm:pt-8"
            >
              <div className="space-y-1 text-center">
                <h2 className="text-[1.65rem] font-semibold tracking-tight text-foreground">
                  Como foi sua experiência?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Seu feedback nos ajuda a melhorar o Flashify
                </p>
              </div>

              <div className="mt-6">
                <div className="grid grid-cols-5 gap-0.5 sm:gap-1">
                  {FEEDBACK_OPTIONS.map((option) => {
                    const selected = selectedRating === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSelectedRating(option.value);
                          setSliderRating(option.value);
                        }}
                        className={cn(
                          "flex min-h-[154px] flex-col items-center justify-start rounded-2xl px-1 py-2.5 transition-all duration-200 sm:min-h-[176px] sm:px-1.5 sm:py-4",
                          selected
                            ? "bg-[#facc15]/18 shadow-[0_14px_24px_-20px_rgba(250,204,21,0.9)] dark:bg-[#facc15]/12"
                            : "hover:bg-accent/60"
                        )}
                      >
                        <FlashinhoExpression
                          variant={option.mascotVariant}
                          alt={`Flashinho representando ${option.label.toLowerCase()}`}
                          className="mx-auto h-28 w-full max-w-[118px] sm:h-32 sm:max-w-[132px]"
                          imageClassName={FEEDBACK_MASCOT_IMAGE_CLASS[option.mascotVariant]}
                          sizes="(max-width: 640px) 118px, 132px"
                        />
                        <span
                          className={cn(
                            "mt-2.5 text-[11px] font-medium leading-tight sm:text-xs",
                            selected ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="mt-4 rounded-2xl border border-border/60 bg-background/55 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                  onPointerDown={() => {
                    if (selectedRating === 0) {
                      setSelectedRating(sliderRating);
                    }
                  }}
                >
                  <Slider
                    value={[sliderRating]}
                    min={1}
                    max={5}
                    step={1}
                    aria-label="Avaliação da experiência"
                    onValueChange={(value) => {
                      const nextRating = value[0] ?? 3;
                      setSliderRating(nextRating);
                      setSelectedRating(nextRating);
                    }}
                    className="w-full"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Muito ruim</span>
                    <span className="font-medium text-foreground/80">
                      {currentRatingLabel}
                    </span>
                    <span>Excelente</span>
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {shouldShowImprovementField && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-foreground">
                          O que podemos melhorar?
                        </label>
                        <span className="text-[11px] text-muted-foreground">
                          {feedbackText.length}/{FEEDBACK_MAX_LENGTH}
                        </span>
                      </div>
                      <Textarea
                        value={feedbackText}
                        onChange={(event) =>
                          setFeedbackText(event.target.value.slice(0, FEEDBACK_MAX_LENGTH))
                        }
                        placeholder="Conte o que não funcionou ou o que faltou para a experiência ficar melhor."
                        className="min-h-[112px] rounded-2xl border-border/70 bg-background/80 text-sm shadow-none dark:border-white/10 dark:bg-white/[0.03]"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {rewardOfferVisible && (
                <div className="mt-5 rounded-2xl border border-[#facc15]/30 bg-gradient-to-r from-[#facc15]/14 to-[#fef3c7]/40 px-4 py-3 shadow-[0_16px_30px_-26px_rgba(250,204,21,0.95)] dark:border-[#facc15]/18 dark:from-[#facc15]/12 dark:to-[#fef3c7]/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#facc15] text-black shadow-sm">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Envie seu feedback e desbloqueie
                      </p>
                      <p className="text-lg font-semibold text-foreground">+3 gerações</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3 text-center">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selectedRating || isSubmitting}
                  className="h-12 w-full rounded-full bg-[#facc15] text-[15px] font-semibold text-black shadow-[0_20px_34px_-26px_rgba(250,204,21,1)] transition-all hover:bg-[#facc15]/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando feedback
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar feedback
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => handleDialogOpenChange(false)}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Agora não
                </button>
              </div>
            </motion.div>
          )}

          {stage === "thanks" && (
            <motion.div
              key="thanks"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="px-5 pb-5 pt-7 text-center sm:px-6 sm:pb-6 sm:pt-8"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mx-auto flex w-full justify-center"
              >
                <Image
                  src="/presente.png"
                  alt="Presente de recompensa"
                  width={150}
                  height={150}
                  className="h-auto w-[120px] sm:w-[150px]"
                  priority
                />
              </motion.div>

              <div className="mt-2 space-y-2">
                <h2 className="text-[1.7rem] font-semibold tracking-tight text-foreground">
                  Obrigado pelo seu feedback
                </h2>
                {rewardApplied ? (
                  <div className="flex justify-center">
                    <FlashinhoExpression
                      variant="amei"
                      alt="Flashinho celebrando sua recompensa"
                      className="h-24 w-24 sm:h-32 sm:w-32"
                      sizes="(max-width: 640px) 96px, 128px"
                    />
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {rewardApplied
                    ? `Você ganhou +${rewardAmount} gerações e a barra já foi atualizada.`
                    : "Sua resposta já nos ajuda a deixar a experiência melhor."}
                </p>
              </div>

              <div className="mt-5 rounded-[1.6rem] border border-[#facc15]/28 bg-gradient-to-br from-[#fef3c7]/55 via-background to-[#d9f99d]/18 p-4 text-left shadow-[0_20px_36px_-30px_rgba(250,204,21,0.95)] dark:border-transparent dark:bg-[linear-gradient(145deg,rgba(250,204,21,0.12),rgba(23,25,34,0.98),rgba(34,197,94,0.08))] dark:shadow-[inset_0_0_0_1px_rgba(250,204,21,0.16),0_20px_36px_-30px_rgba(250,204,21,0.4)]">
                <p className="text-center text-sm font-medium text-foreground">
                  Seus amigos também merecem estudar com mais clareza
                </p>
                <Button
                  type="button"
                  onClick={() => setStage("share")}
                  className="mt-4 h-11 w-full rounded-full border border-[#facc15]/30 bg-gradient-to-r from-[#facc15] via-[#f7d93b] to-[#48cfea] text-sm font-semibold text-black shadow-[0_22px_38px_-28px_rgba(72,207,234,0.9)] hover:opacity-95 dark:border-transparent dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_22px_38px_-28px_rgba(72,207,234,0.9)]"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar com amigos
                </Button>
              </div>

              <Button
                type="button"
                onClick={() => handleDialogOpenChange(false)}
                className="mt-5 h-11 rounded-full bg-[#facc15] px-8 text-sm font-semibold text-black hover:bg-[#facc15]/90"
              >
                Continuar
              </Button>
            </motion.div>
          )}

          {stage === "share" && (
            <motion.div
              key="share"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="px-5 pb-5 pt-7 text-center sm:px-6 sm:pb-6 sm:pt-8"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-black/10 bg-background shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                <Link2 className="h-7 w-7 text-[#6BDEF3]" />
              </div>

              <div className="mt-5 space-y-2">
                <h2 className="text-[1.6rem] font-semibold tracking-tight text-foreground">
                  Compartilhe com seus amigos
                </h2>
                <p className="text-sm text-muted-foreground">
                  Tem muita gente perdendo tempo estudando do jeito mais difícil.
                </p>
              </div>

              <div className="mt-5 space-y-3 text-left">
                <label className="text-sm font-semibold text-foreground">
                  Compartilhe o link
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-[#facc15]/30 bg-gradient-to-r from-[#fefce8] to-background p-2 dark:border-[#facc15]/16 dark:from-[#facc15]/10 dark:to-white/[0.02]">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                    onClick={(event) => (event.target as HTMLInputElement).select()}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleCopyShareMessage}
                    className="rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm text-muted-foreground">
                  Ou compartilhe direto nas redes sociais
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      openExternalShare(
                        `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-background text-[#25D366] transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.03]"
                    aria-label="Compartilhar no WhatsApp"
                  >
                    <FaWhatsapp className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openExternalShare(
                        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-background text-[#2563eb] transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.03]"
                    aria-label="Compartilhar no LinkedIn"
                  >
                    <FaLinkedinIn className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openExternalShare(
                        `https://x.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-background text-foreground transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.03]"
                    aria-label="Compartilhar no X"
                  >
                    <FaXTwitter className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openExternalShare("https://www.instagram.com/", true)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-background text-[#d946ef] transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.03]"
                    aria-label="Abrir Instagram"
                  >
                    <FaInstagram className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openExternalShare(
                        `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(getShareMessage())}`
                      )
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-background text-[#0ea5e9] transition-transform hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.03]"
                    aria-label="Compartilhar no Telegram"
                  >
                    <FaTelegram className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDialogOpenChange(false)}
                className="mt-6 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Agora não
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
