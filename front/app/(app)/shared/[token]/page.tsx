"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, SharedDeckRead } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  AlertTriangle,
  Library,
  ArrowLeft,
  Layers,
  BrainCircuit,
  FileText,
  Wand2,
  Lock,
  BookPlus,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn, formatDocumentTitle } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { useLoading } from "@/components/providers/loading-provider";

// ──────────────────────────────────────────────────────────────
// ActionCard — mesmo componente visual do deck/[id]/page.tsx
// ──────────────────────────────────────────────────────────────
const ActionCard = ({
  icon: Icon,
  iconBgColor,
  title,
  description,
  children,
  delay = 0,
  onActivate,
}: {
  icon: any;
  iconBgColor: "flashcards" | "quiz" | "guided";
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
  onActivate?: () => void;
}) => (
  <motion.div
    className="self-start"
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden border-border/50 transition-all duration-300 hover:shadow-xl",
        iconBgColor === "flashcards" && "hover:border-[#FACC15]/50",
        iconBgColor === "quiz" && "hover:border-[#48cfea]/50",
        iconBgColor === "guided" && "hover:border-[#7FD9A0]/45",
        onActivate && "cursor-pointer"
      )}
      onClick={(event) => {
        if (!onActivate) return;
        const target = event.target as HTMLElement;
        if (target.closest("button, a, input, textarea, select, [role='button']")) return;
        onActivate();
      }}
    >
      {/* Glow overlay */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          iconBgColor === "flashcards" && "bg-[#FACC15]/5",
          iconBgColor === "quiz" && "bg-[#48cfea]/5",
          iconBgColor === "guided" &&
            "bg-gradient-to-br from-[#7FD9A0]/10 via-[#7FD9A0]/5 to-transparent dark:from-[#7FD9A0]/12 dark:via-[#7FD9A0]/6"
        )}
      />

      <CardHeader className="relative pb-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "relative p-3 rounded-2xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3",
              iconBgColor === "flashcards" && "bg-[#FACC15] text-black",
              iconBgColor === "quiz" && "bg-[#48cfea] text-black",
              iconBgColor === "guided" && "bg-[#7FD9A0] text-black"
            )}
          >
            {iconBgColor === "guided" ? (
              <div className="relative w-7 h-7">
                <FileText className="absolute left-0 bottom-0 w-4.5 h-4.5" />
                <Wand2 className="absolute right-0 top-0 w-4 h-4 opacity-90" />
              </div>
            ) : (
              <Icon className="w-7 h-7" />
            )}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent" />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <CardTitle
              className={cn(
                "text-xl font-bold mb-1 transition-colors duration-300",
                iconBgColor === "flashcards" && "group-hover:text-[#FACC15]",
                iconBgColor === "quiz" && "group-hover:text-[#48cfea]",
                iconBgColor === "guided" &&
                  "group-hover:text-[#3E8E63] dark:group-hover:text-[#9EE6B8]"
              )}
            >
              {title}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative pt-0 flex flex-col gap-3">
        {children}
        {/* Locked overlay hint */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Lock className="w-3 h-3" />
          <span>Adicione à biblioteca para estudar</span>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// ──────────────────────────────────────────────────────────────
// Import button inline
// ──────────────────────────────────────────────────────────────
function ImportButton({ token }: { token: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { showLoading } = useLoading();
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  const handleImport = async () => {
    if (!user) {
      router.push(`/register?redirect=${encodeURIComponent(`/shared/${token}`)}`);
      return;
    }
    setState("loading");
    try {
      const newDoc = await apiClient.importSharedDeck(token) as any;
      setState("success");
      toast.success("Deck adicionado à sua biblioteca!");
      setTimeout(() => {
        showLoading("Abrindo seu novo deck...", false);
        router.push(`/deck/${newDoc.id}`);
      }, 800);
    } catch (err: any) {
      setState("idle");
      toast.error("Não foi possível adicionar o deck.", {
        description: err.message || "Tente novamente.",
      });
    }
  };

  return (
    <Button
      size="lg"
      onClick={handleImport}
      disabled={state !== "idle"}
      className={cn(
        "h-12 px-8 text-base font-semibold shadow-lg transition-all duration-300",
        state === "success"
          ? "bg-emerald-500 hover:bg-emerald-500 text-white"
          : "bg-[#48cfea] hover:bg-[#48cfea]/90 text-black hover:shadow-[0_0_24px_rgba(72,207,234,0.4)]"
      )}
    >
      {state === "loading" ? (
        <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Adicionando...</>
      ) : state === "success" ? (
        <><Check className="w-5 h-5 mr-2" />Adicionado!</>
      ) : user ? (
        <><BookPlus className="w-5 h-5 mr-2" />Adicionar à biblioteca</>
      ) : (
        <><BookPlus className="w-5 h-5 mr-2" />Criar conta para adicionar</>
      )}
    </Button>
  );
}

// ──────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────
type PageState = "loading" | "loaded" | "not_found" | "error";

export default function SharedDeckPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [deck, setDeck] = useState<SharedDeckRead | null>(null);

  useEffect(() => {
    if (!token) return;
    apiClient
      .getSharedDeck(token)
      .then((data) => { setDeck(data); setPageState("loaded"); })
      .catch((err: any) => {
        const msg: string = err?.message ?? "";
        setPageState(
          msg.includes("404") || msg.toLowerCase().includes("not found")
            ? "not_found"
            : "error"
        );
      });
  }, [token]);

  /* ── LOADING ── */
  if (pageState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#48cfea]" />
        <p className="text-muted-foreground animate-pulse text-sm">Carregando deck compartilhado...</p>
      </div>
    );
  }

  /* ── NOT FOUND ── */
  if (pageState === "not_found") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-4">
        <AlertTriangle className="w-14 h-14 text-muted-foreground/40" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Deck não encontrado</h1>
          <p className="text-muted-foreground text-sm max-w-sm">
            Este link pode ter expirado, estar incorreto ou o deck foi removido pelo autor.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard"><Library className="w-4 h-4 mr-2" />Ir para o início</Link>
        </Button>
      </div>
    );
  }

  /* ── ERROR ── */
  if (pageState === "error" || !deck) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h1 className="text-xl font-bold">Algo deu errado</h1>
        <Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
      </div>
    );
  }

  /* ── LOADED ── */
  const title = formatDocumentTitle(deck.file_path, deck.title);
  const flashcardsCount = deck.flashcards?.length ?? 0;
  const questionsCount = deck.quiz?.questions?.length ?? 0;
  const topicsCount = deck.guided_study?.topics?.length ?? 0;
  const hasSharedFlashcards = flashcardsCount > 0;
  const hasSharedQuiz = questionsCount > 0;
  const hasSharedGuidedStudy = topicsCount > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 lg:max-w-[calc(60%-1rem)] xl:max-w-[calc(60%-1.5rem)]"
      >
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 hover:bg-primary/10">
          <ArrowLeft className="w-4 h-4 mr-2" />Voltar
        </Button>
        <div className="flex items-start gap-3 mb-1">
          <h1
            className="text-2xl font-bold tracking-tight text-balance [overflow-wrap:anywhere] sm:text-3xl lg:text-4xl"
            title={title}
          >
            {title}
          </h1>
        </div>
        <div className="pt-2 text-base sm:pt-3 sm:text-lg">
          <Badge variant="outline" className="rounded-full border-[#48cfea]/30 bg-[#48cfea]/8 text-[#48cfea] text-xs sm:text-sm">
            <Lock className="w-3 h-3 mr-1" />
            Deck compartilhado · somente leitura
          </Badge>
        </div>
      </motion.div>

      {/* ── Grid — mesmo layout do deck/[id] ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
        {/* Left: action cards */}
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-3">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Flashcards */}
            {hasSharedFlashcards && (
              <ActionCard
                icon={FileText}
                iconBgColor="flashcards"
                title="Flashcards"
                description="Veja e revise flashcards, otimizando seu aprendizado."
                delay={0.1}
                onActivate={() => router.push(`/shared/${token}/study`)}
              >
                <Button
                  className="w-full h-12 text-base shadow-md transition-all group"
                  size="lg"
                  onClick={() => router.push(`/shared/${token}/study`)}
                >
                  Iniciar
                </Button>
              </ActionCard>
            )}

            {/* Quiz */}
            {hasSharedQuiz && (
              <ActionCard
                icon={BrainCircuit}
                iconBgColor="quiz"
                title="Quiz"
                description="Responda perguntas de quiz geradas pela IA."
                delay={0.2}
                onActivate={() => router.push(`/shared/${token}/quiz`)}
              >
                <Button
                  className="w-full h-12 text-base shadow-md transition-all group bg-[#48cfea] hover:bg-[#48cfea]/90 text-black"
                  size="lg"
                  onClick={() => router.push(`/shared/${token}/quiz`)}
                >
                  Iniciar
                </Button>
              </ActionCard>
            )}
          </div>

          {/* Estudo Guiado */}
          {hasSharedGuidedStudy && (
            <ActionCard
              icon={Wand2}
              iconBgColor="guided"
              title="Estudo Guiado"
              description="Siga uma trilha mista com explicações rápidas e perguntas de validação por blocos do assunto."
              delay={0.3}
              onActivate={() => router.push(`/shared/${token}/guided`)}
            >
              <Button
                className="w-full h-12 text-base shadow-md transition-all group bg-[#7FD9A0] hover:bg-[#7FD9A0]/90 text-black"
                size="lg"
                onClick={() => router.push(`/shared/${token}/guided`)}
              >
                Iniciar
              </Button>
            </ActionCard>
          )}
        </div>

        <div className="order-1 space-y-6 lg:order-2 lg:col-span-2 lg:-mt-[5.5rem]">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border-border/50 sticky top-0 h-full min-h-[calc(100%+2rem)] gap-2 overflow-hidden">
              <CardHeader className="relative pb-0">
                <CardTitle className="text-xl">Visão Geral</CardTitle>
                <CardDescription>
                  A experiência abaixo espelha o deck da biblioteca, mas sem SRS, estatísticas, respostas, feedback ou relatórios.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-2.5 pt-0">
                <div className="grid grid-cols-3 gap-2">
                  <div className="min-w-0 rounded-2xl border border-[#FACC15]/60 bg-[#FACC15]/8 p-3 dark:border-[#FACC15]/55">
                    <p className="text-[9px] uppercase leading-tight tracking-[0.12em] text-muted-foreground [overflow-wrap:anywhere] sm:text-[10px]">Flashcards</p>
                    <p className="mt-2 text-2xl font-bold leading-none">{flashcardsCount}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">modo leitura</p>
                  </div>

                  <div className="min-w-0 rounded-2xl border border-[#48cfea]/60 bg-[#48cfea]/8 p-3 dark:border-[#48cfea]/55">
                    <p className="text-[9px] uppercase leading-tight tracking-[0.12em] text-muted-foreground [overflow-wrap:anywhere] sm:text-[10px]">Quiz</p>
                    <p className="mt-2 text-2xl font-bold leading-none">{questionsCount}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">sem correção</p>
                  </div>

                  <div className="min-w-0 rounded-2xl border border-[#7FD9A0]/60 bg-[#7FD9A0]/8 p-3 dark:border-[#7FD9A0]/55">
                    <p className="text-[9px] uppercase leading-tight tracking-[0.12em] text-muted-foreground [overflow-wrap:anywhere] sm:text-[10px]">Guiado</p>
                    <p className="mt-2 text-2xl font-bold leading-none">{topicsCount}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">sem progresso</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#48cfea]/20 bg-[#48cfea]/4 p-4 dark:bg-[#48cfea]/5">
                  <div className="mb-3 flex items-center gap-2">
                    <BookPlus className="w-5 h-5 text-[#48cfea]" />
                    <h3 className="text-base font-semibold">Salvar este deck</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <ImportButton token={token} />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      O deck ficará disponível na sua biblioteca para edição e estudo completo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
