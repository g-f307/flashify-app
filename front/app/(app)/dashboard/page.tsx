"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, ChevronLeft, ChevronRight, FileUp, MessageSquare, BrainCircuit, Library, BookOpenCheck, Flame, Layers, ClipboardCheck, History, X, Expand } from "lucide-react";
import { apiClient, DashboardSummary, DeckStats, Document, StreakCalendarRangeSummary, StreakCalendarSummary } from "@/lib/api";
import { RecentDocumentCard } from "@/components/documents/recent-document-card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDocumentTitle } from "@/lib/utils";
import TimeAgo from "@/components/common/time-ago";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const formatCalendarMonth = (month: number, year: number) =>
  new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(year, month - 1, 1))
    .replace(/^\w/, (char) => char.toUpperCase());

const startOfWeekSunday = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
};

const shiftDateByDays = (date: Date, amount: number) => {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
};

const shiftDateByMonths = (date: Date, amount: number) => {
  const shifted = new Date(date);
  shifted.setMonth(shifted.getMonth() + amount);
  return shifted;
};

const toLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatWeekLabel = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const startLabel = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(start);
  const endLabel =
    start.getMonth() === end.getMonth()
      ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(end)
      : new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(end);

  return `${startLabel} - ${endLabel}`.replace(/^\w/, (char) => char.toUpperCase());
};

// Componente do Carrosel
const CarouselSection = ({ onCreateClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const slides = [
    {
      icon: FileUp,
      title: "1. Envie o seu Conteúdo",
      description: "Faça o upload de PDF, Word, PowerPoint, imagem ou simplesmente cole um texto que deseja estudar.",
      color: "text-[#FACC15]"
    },
    {
      icon: MessageSquare,
      title: "2. IA Cria Flashcards e Quizzes",
      description: "A nossa Inteligência Artificial analisa o seu material e cria flashcards e quizzes relevantes automaticamente.",
      color: "text-[#48cfea]"
    },
    {
      icon: BrainCircuit,
      title: "3. Estude de Forma Eficaz",
      description: "Reveja os flashcards, teste os seus conhecimentos com quizzes e memorize o conteúdo mais rapidamente.",
      color: "text-[#FACC15]"
    }
  ];

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [autoPlay, slides.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 5000);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 5000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setAutoPlay(false);
    setTimeout(() => setAutoPlay(true), 5000);
  };

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl lg:text-3xl font-bold">Como Funciona</h2>
        <p className="text-muted-foreground mt-1">Transforme qualquer conteúdo em material de estudo inteligente.</p>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Carrosel */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-card border border-gray-200 dark:border-zinc-800 rounded-lg p-6"
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-300 ${
                  slides[currentSlide].color === "text-[#FACC15]" ? "bg-[#FACC15]/10" :
                  "bg-[#48cfea]/10"
                }`}>
                  {(() => {
                    const Icon = slides[currentSlide].icon;
                    return <Icon className={`w-6 h-6 ${slides[currentSlide].color}`} />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-foreground mb-1">
                    {slides[currentSlide].title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {slides[currentSlide].description}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Botões de navegação e indicadores */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={prevSlide}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground active:bg-accent/50"
              aria-label="Slide anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-1.5">
              {slides.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentSlide
                      ? 'bg-primary w-6 h-1.5'
                      : 'bg-muted hover:bg-muted-foreground/30 w-1.5 h-1.5'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  aria-label={`Ir para slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground active:bg-accent/50"
              aria-label="Próximo slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CTA Button - Destaque */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mt-8"
        >
          <Button 
            size="lg" 
            onClick={onCreateClick}
            className="shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Criar Novo Deck
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Comece em menos de 2 minutos
          </p>
        </motion.div>
      </div>
    </section>
  );
};

const getDailyHeadline = (
  username: string | undefined,
  pendingDeckCount: number,
  reviewedDecksToday: number,
  totalPending: number
) => {
  const safeName = username || "você";

  if (pendingDeckCount === 0) {
    const phrases = [
      "Nenhum deck pendente. Quem é essa máquina?",
      "Tudo em ordem. Até estranhei.",
      "Você tá ficando perigosamente inteligente.",
      "Hoje o caos não apareceu. Aproveita o feito.",
    ];
    const index = (safeName.length + reviewedDecksToday) % phrases.length;
    return {
      greeting: `Olá, ${safeName}`,
      headline: phrases[index],
      description:
        reviewedDecksToday > 0
          ? `${reviewedDecksToday} ${reviewedDecksToday === 1 ? "deck revisado" : "decks revisados"} hoje. Tudo em ordem.`
          : "Nada pendente no momento.",
      ctaLabel: "Abrir biblioteca",
      ctaHref: "/library",
    };
  }

  if (pendingDeckCount <= 2) {
    const phrases =
      pendingDeckCount === 1
        ? [
            "Um deck levantou a mão. Serviço rápido, sem novela.",
            "Tem só um deck na fila. Dá para resolver antes do café esfriar.",
            "Hoje veio manso: uma revisão e a chance real de zerar a pendência.",
          ]
        : [
            "Dois deckzinhos pedindo atenção. Nada dramático, mas eles notaram sua ausência.",
            "Tem pouca coisa esperando. Dá para resolver bonito hoje.",
            "O dia veio educado: poucas revisões, bom ritmo e chance real de fechar tudo.",
          ];
    const index = (pendingDeckCount + totalPending + safeName.length) % phrases.length;
    return {
      greeting: `Olá, ${safeName}`,
      headline: phrases[index],
      description: `${pendingDeckCount} ${pendingDeckCount === 1 ? "deck precisa" : "decks precisam"} de revisão agora.`,
      ctaLabel: "Revisar agora",
      ctaHref: `/deck`,
    };
  }

  const phrases = [
    "Eles se multiplicaram. Precisamos agir com elegância.",
    "Seu eu do passado preparou material. Seu eu de hoje foi convocado.",
    "Tem movimento no radar. Nada caótico, mas vale entrar em ação.",
  ];
  const index = (pendingDeckCount + reviewedDecksToday + totalPending) % phrases.length;
  return {
    greeting: `Olá, ${safeName}`,
    headline: phrases[index],
    description: `${pendingDeckCount} decks com revisões pendentes no momento.`,
    ctaLabel: "Ver decks pendentes",
    ctaHref: "/library",
  };
};

const DailyTasksBanner = ({
  username,
  pendingDeckCount,
  totalPending,
  reviewedDecksToday,
  onPrimaryAction,
}: {
  username?: string;
  pendingDeckCount: number;
  totalPending: number;
  reviewedDecksToday: number;
  onPrimaryAction: () => void;
}) => {
  const copy = getDailyHeadline(username, pendingDeckCount, reviewedDecksToday, totalPending);

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <Card className="relative overflow-hidden border-[2.5px] border-border/80 bg-[#fbfbfe] shadow-sm dark:border-zinc-800 dark:bg-[#1c1d20]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.012),transparent_42%,rgba(15,23,42,0.006)_100%)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_40%,rgba(255,255,255,0.01)_100%)]" />
        <div className="pointer-events-none absolute left-3 bottom-3 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.62)_0%,rgba(250,204,21,0.34)_42%,rgba(250,204,21,0)_74%)] blur-[24px] animate-banner-blob-blue dark:bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.42)_0%,rgba(250,204,21,0.2)_42%,rgba(250,204,21,0)_74%)] dark:blur-[28px]" />
        <div className="pointer-events-none absolute right-3 top-3 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(72,207,234,0.94)_0%,rgba(72,207,234,0.62)_42%,rgba(72,207,234,0)_74%)] blur-[26px] animate-banner-blob-yellow dark:bg-[radial-gradient(circle_at_center,rgba(72,207,234,0.66)_0%,rgba(72,207,234,0.38)_42%,rgba(72,207,234,0)_74%)] dark:blur-[30px]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,rgba(72,207,234,0.85),rgba(250,204,21,0.88),transparent)]" />

        <CardContent className="relative p-5 sm:p-6 lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.95fr] lg:items-center">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{copy.greeting}</p>
                <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem] lg:text-3xl">
                  {copy.headline}
                </h2>
                {pendingDeckCount > 0 ? (
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
                    <span className="rounded-md bg-[#FACC15]/14 px-1.5 py-0.5 font-semibold text-foreground dark:bg-[#FACC15]/16">
                      {pendingDeckCount} {pendingDeckCount === 1 ? "deck" : "decks"}
                    </span>{" "}
                    com revisões pendentes no momento.
                  </p>
                ) : (
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
                    {copy.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  className={cn(
                    "rounded-xl px-5",
                    pendingDeckCount > 0
                      ? "bg-[#48cfea] text-black hover:bg-[#48cfea]/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  onClick={onPrimaryAction}
                >
                  Ir para a biblioteca
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative min-h-[268px] overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/80 p-4 sm:p-5 dark:border-zinc-800 dark:bg-[#18191d]/80">
              <div className="relative flex h-full items-center justify-center">
                <div className="grid w-full max-w-[392px] translate-y-2 grid-cols-2 gap-3 sm:translate-y-4 lg:translate-y-5 sm:gap-4">
                  <div className="relative flex min-h-[184px] flex-col items-center justify-center">
                  <div className="pointer-events-none absolute top-1 h-3 w-3 rounded-full border border-border/70 bg-background/90 shadow-[0_0_18px_rgba(255,255,255,0.18)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_0_18px_rgba(255,255,255,0.08)]" />
                  <div className="pointer-events-none absolute left-1/2 top-[110px] h-12 w-36 -translate-x-1/2 rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,1)_0%,rgba(255,250,235,1)_26%,rgba(254,249,195,0.94)_46%,rgba(253,230,138,0.38)_64%,rgba(255,255,255,0)_82%)] blur-[0.2px] sm:top-[108px] sm:h-12 sm:w-40 dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.34)_0%,rgba(125,211,252,0.24)_36%,rgba(125,211,252,0.1)_60%,rgba(255,255,255,0)_78%)]" />

                  <div className="relative z-10 flex h-[148px] w-full max-w-[176px] flex-col items-center justify-center rounded-2xl border border-red-500/20 bg-card/94 px-3 py-4 text-center shadow-[0_18px_34px_-24px_rgba(239,68,68,0.45)] dark:border-red-500/20 dark:bg-zinc-900/94">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10">
                      <Flame className="h-5 w-5 text-red-500" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
                      Decks pendentes
                    </p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{pendingDeckCount}</p>
                  </div>
                </div>

                  <div className="relative flex min-h-[184px] flex-col items-center justify-center">
                  <div className="pointer-events-none absolute top-1 h-3 w-3 rounded-full border border-border/70 bg-background/90 shadow-[0_0_18px_rgba(255,255,255,0.18)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_0_18px_rgba(255,255,255,0.08)]" />
                  <div className="pointer-events-none absolute left-1/2 top-[110px] h-12 w-36 -translate-x-1/2 rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,1)_0%,rgba(255,250,235,1)_26%,rgba(254,249,195,0.94)_46%,rgba(253,230,138,0.38)_64%,rgba(255,255,255,0)_82%)] blur-[0.2px] sm:top-[108px] sm:h-12 sm:w-40 dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.34)_0%,rgba(125,211,252,0.24)_36%,rgba(125,211,252,0.1)_60%,rgba(255,255,255,0)_78%)]" />

                  <div className="relative z-10 flex h-[148px] w-full max-w-[176px] flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-card/94 px-3 py-4 text-center shadow-[0_18px_34px_-24px_rgba(16,185,129,0.42)] dark:border-emerald-500/20 dark:bg-zinc-900/94">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">
                      <BookOpenCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
                      Revisados hoje
                    </p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{reviewedDecksToday}</p>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
};

const ContinueWhereLeftOffCard = ({
  document,
  detail,
  stats,
  progressPercentage,
  lastActivityAt,
  onContinue,
}: {
  document: Document;
  detail: Document | null;
  stats: DeckStats | null;
  progressPercentage: number;
  lastActivityAt?: string | null;
  onContinue: () => void;
}) => {
  const displayName = formatDocumentTitle(document.file_path, document.title);
  const totalQuestions = detail?.quiz?.questions?.length ?? 0;
  const hasQuizAvailable = document.has_quiz && totalQuestions > 0;

  return (
    <section className="flex w-full flex-col">
      <div className="mb-4 xl:min-h-[72px]">
        <div>
          <h3 className="text-xl font-bold text-foreground lg:text-2xl">Continue de onde parou</h3>
          <p className="text-sm text-muted-foreground">Seu último deck com atividade recente.</p>
        </div>
      </div>

      <Card
        role="button"
        tabIndex={0}
        onClick={onContinue}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onContinue();
          }
        }}
        className="relative flex justify-center overflow-hidden rounded-[1.7rem] border border-border/70 bg-card/95 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FACC15]/40 hover:shadow-[0_18px_40px_-26px_rgba(250,204,21,0.38)] dark:border-zinc-700/80 dark:bg-[#2a2e38] dark:hover:border-[#FACC15]/25 dark:hover:shadow-[0_18px_40px_-26px_rgba(250,204,21,0.2)] sm:p-4 xl:h-[214px]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,rgba(250,204,21,0),rgba(250,204,21,0.85),rgba(72,207,234,0.85),rgba(72,207,234,0))]" />
        <div className="grid w-full gap-3 sm:grid-cols-[122px_minmax(0,1fr)_auto] sm:items-center">
          <div className="relative mx-auto w-full max-w-[150px]">
            <div className="relative aspect-[4/5] overflow-visible bg-transparent">
              <div className="pointer-events-none absolute bottom-1.5 left-1/2 h-4 w-[58%] -translate-x-1/2 rounded-[999px] bg-black/18 blur-md dark:bg-black/35" />
              <Image
                src="/flashinho_mobile.png"
                alt="Ilustração destacando o último deck"
                fill
                className="scale-[1.12] object-cover object-center drop-shadow-[0_10px_18px_rgba(15,23,42,0.12)] dark:drop-shadow-[0_14px_22px_rgba(0,0,0,0.3)] sm:hidden"
                sizes="150px"
                priority={false}
              />
              <Image
                src="/flashinho.png"
                alt="Ilustração destacando o último deck"
                fill
                className="hidden scale-[1.08] object-cover object-center drop-shadow-[0_10px_18px_rgba(15,23,42,0.12)] dark:drop-shadow-[0_14px_22px_rgba(0,0,0,0.3)] sm:block"
                sizes="(max-width: 640px) 150px, 122px"
                priority={false}
              />
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="space-y-1.5">
              <h4 className="text-xl font-semibold leading-tight text-foreground sm:text-[1.55rem]">
                {displayName}
              </h4>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground sm:text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  {document.total_flashcards > 0 ? "Flashcards disponíveis" : "Sem flashcards"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4" />
                  {hasQuizAvailable ? "Quiz disponível" : "Sem quiz"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <History className="h-4 w-4" />
                  {lastActivityAt ? (
                    <>
                      Última revisão <TimeAgo date={lastActivityAt} />
                    </>
                  ) : (
                    "Pronto para continuar"
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px] sm:text-sm">
                <span className="font-medium text-muted-foreground">Progresso</span>
                <span className="font-semibold text-foreground">{progressPercentage}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted/70 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[#FACC15] transition-all duration-500"
                  style={{ width: `${Math.max(progressPercentage, 8)}%` }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onContinue();
            }}
            aria-label={`Continuar no deck ${displayName}`}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#FACC15]/65 bg-[#FACC15] text-black transition-all hover:bg-[#FACC15]/92 hover:shadow-[0_10px_24px_-16px_rgba(250,204,21,0.95)] dark:border-[#FACC15]/45 dark:bg-[#FACC15] sm:mx-0"
          >
            <ArrowRight className="h-4.5 w-4.5" />
          </button>
        </div>
      </Card>
    </section>
  );
};

const StreakCalendarCard = ({
  weekSummary,
  monthSummary,
  viewMode,
  onToggleViewMode,
  onPrevious,
  onNext,
  canGoNext,
  isLoading,
  className,
}: {
  weekSummary: StreakCalendarRangeSummary | null;
  monthSummary: StreakCalendarSummary | null;
  viewMode: "week" | "month";
  onToggleViewMode: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
  isLoading: boolean;
  className?: string;
}) => {
  const monthLeadingEmptyDays = monthSummary?.days?.[0]?.weekday ?? 0;
  const currentSummary = viewMode === "week" ? weekSummary : monthSummary;
  const weekDays = weekSummary?.days ?? [];
  const monthDays = monthSummary?.days ?? [];
  const calendarTitle =
    viewMode === "week"
      ? weekSummary
        ? formatWeekLabel(weekSummary.start_date, weekSummary.end_date)
        : "Carregando semana"
      : monthSummary
        ? formatCalendarMonth(monthSummary.month, monthSummary.year)
        : "Carregando calendário";

  return (
    <section className={cn("flex h-full w-full flex-col", className)}>
      <div className="mb-4 flex items-start justify-between gap-3 xl:min-h-[72px]">
        <div>
          <h3 className="text-xl font-bold text-foreground lg:text-2xl">Calendário da ofensiva</h3>
          <p className="max-w-[360px] text-sm text-muted-foreground">
            Mantenha o ritmo ativo. Dia perdido, ofensiva reiniciada.
          </p>
        </div>
        {currentSummary && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FACC15]/30 bg-[#FACC15]/10 px-2.5 py-1 text-xs font-medium text-foreground dark:border-[#FACC15]/20 dark:bg-[#FACC15]/10 sm:text-sm">
            <Flame className="h-3.5 w-3.5 text-[#FACC15]" />
            {currentSummary?.current_streak ?? 0} {(currentSummary?.current_streak ?? 0) === 1 ? "dia em sequência" : "dias em sequência"}
          </div>
        )}
      </div>

      <Card
        className="relative flex h-full flex-1 overflow-hidden rounded-[1.7rem] border border-border/70 bg-card/95 p-3.5 shadow-sm dark:border-zinc-700/80 dark:bg-[#2a2e38] sm:p-4"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,rgba(250,204,21,0),rgba(250,204,21,0.85),rgba(72,207,234,0.85),rgba(72,207,234,0))]" />

        <div className="relative flex h-full w-full flex-col space-y-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onPrevious}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:text-foreground dark:border-zinc-700/70 dark:bg-zinc-900/40"
              aria-label={viewMode === "week" ? "Semana anterior" : "Mês anterior"}
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>

            <div className="text-center">
              <p className="text-sm font-semibold text-foreground sm:text-base">
                {calendarTitle}
              </p>
              {currentSummary && (
                <p className="text-xs text-muted-foreground">
                  {viewMode === "week"
                    ? "Visão principal da sua ofensiva"
                    : `${monthSummary?.active_days ?? 0} ${(monthSummary?.active_days ?? 0) === 1 ? "dia com atividade" : "dias com atividade"} neste mês`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleViewMode}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground dark:border-zinc-700/70 dark:bg-zinc-900/40"
                aria-label={viewMode === "week" ? "Expandir para o mês inteiro" : "Voltar para a semana atual"}
              >
                <Expand className="h-3.5 w-3.5" />
                {viewMode === "week" ? "Ver mês" : "Ver semana"}
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!canGoNext}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700/70 dark:bg-zinc-900/40"
                aria-label={viewMode === "week" ? "Próxima semana" : "Próximo mês"}
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-muted-foreground sm:text-xs">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          {isLoading || !currentSummary ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: viewMode === "week" ? 7 : 35 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-2xl bg-[#48cfea]/10 animate-pulse dark:bg-[#48cfea]/8"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {viewMode === "month" &&
                Array.from({ length: monthLeadingEmptyDays }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}

              {(viewMode === "week" ? weekDays : monthDays).map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-xl text-xs font-semibold transition-colors sm:text-sm",
                    day.status === "before" && "bg-transparent text-muted-foreground/30",
                    day.status === "upcoming" && "bg-[#48cfea]/10 text-[#3f546e] dark:bg-[#48cfea]/10 dark:text-[#86a6be]",
                    day.status === "today" && "bg-[#48cfea] text-black shadow-[0_10px_24px_-16px_rgba(72,207,234,0.9)]",
                    day.status === "active" && "bg-[#FACC15] text-black shadow-[0_10px_24px_-16px_rgba(250,204,21,0.92)]",
                    day.status === "missed" && "bg-[#48cfea]/12 text-foreground/80 dark:bg-[#48cfea]/8 dark:text-foreground/70"
                  )}
                  >
                    <span>{day.day}</span>
                  {day.status === "missed" && (
                    <span className="pointer-events-none absolute right-1 top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/12 text-red-500 dark:bg-red-500/15 dark:text-red-400">
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
};

const calculateContinueProgress = (
  document: Document,
  detail: Document | null,
  stats: DeckStats | null,
) => {
  const progressParts: number[] = [];

  if (document.total_flashcards > 0) {
    const studiedFlashcards = stats?.flashcards.known ?? document.studied_flashcards ?? 0;
    const flashcardsPending = Math.min(document.flashcards_pending ?? 0, studiedFlashcards);
    const flashcardsProgress = document.srs_enabled
      ? Math.max(0, ((studiedFlashcards - flashcardsPending) / document.total_flashcards) * 100)
      : stats?.flashcards.progress_percentage ??
        Math.min(100, (studiedFlashcards / document.total_flashcards) * 100);

    progressParts.push(Math.min(100, flashcardsProgress));
  }

  if (document.has_quiz) {
    const totalQuestions = detail?.quiz?.questions?.length ?? 0;
    const totalAttempts = stats?.quiz?.total_attempts ?? 0;
    let quizProgress = 0;

    if (document.srs_enabled) {
      if (totalAttempts > 0) {
        if (totalQuestions > 0) {
          const questionsPending = Math.min(document.questions_pending ?? 0, totalQuestions);
          quizProgress = ((totalQuestions - questionsPending) / totalQuestions) * 100;
        } else {
          quizProgress = (document.questions_pending ?? 0) === 0 ? 100 : 0;
        }
      }
    } else {
      quizProgress = totalAttempts > 0 ? 100 : 0;
    }

    progressParts.push(Math.min(100, quizProgress));
  }

  if (progressParts.length === 0) return null;
  return Math.round(progressParts.reduce((sum, value) => sum + value, 0) / progressParts.length);
};

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [recentCarouselIndex, setRecentCarouselIndex] = useState(0);
  const [recentVisibleCards, setRecentVisibleCards] = useState(3);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [dailySummary, setDailySummary] = useState<DashboardSummary | null>(null);
  const [continueDocument, setContinueDocument] = useState<Document | null>(null);
  const [continueDetail, setContinueDetail] = useState<Document | null>(null);
  const [continueStats, setContinueStats] = useState<DeckStats | null>(null);
  const [continueProgressPercentage, setContinueProgressPercentage] = useState<number | null>(null);
  const [streakCalendar, setStreakCalendar] = useState<StreakCalendarSummary | null>(null);
  const [streakWeek, setStreakWeek] = useState<StreakCalendarRangeSummary | null>(null);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<"week" | "month">("week");
  const [calendarAnchorDate, setCalendarAnchorDate] = useState(() => startOfWeekSunday(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => new Date().getMonth() + 1);
  const [visibleYear, setVisibleYear] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const fetchRecent = async () => {
    try {
      const [allDocs, summary] = await Promise.all([
        apiClient.getDocuments(),
        apiClient.getDashboardSummary().catch(() => null),
      ]);
      setAllDocuments(allDocs);
      setDailySummary(summary);
      const sortedDocs = allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentDocuments(sortedDocs.slice(0, 5));
    } catch (error) {
      console.error("Falha ao buscar decks recentes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchRecent();
    }
  }, [user]);

  useEffect(() => {
    const updateVisibleCards = () => {
      if (window.innerWidth >= 1280) {
        setRecentVisibleCards(3);
      } else if (window.innerWidth >= 640) {
        setRecentVisibleCards(2);
      } else {
        setRecentVisibleCards(1);
      }
    };

    updateVisibleCards();
    window.addEventListener("resize", updateVisibleCards);

    return () => window.removeEventListener("resize", updateVisibleCards);
  }, []);

  useEffect(() => {
    const loadStreakCalendar = async () => {
      if (!user) return;
      setIsCalendarLoading(true);
      try {
        if (calendarViewMode === "week") {
          const weekData = await apiClient.getStreakCalendarRange(toLocalIsoDate(calendarAnchorDate), 7);
          setStreakWeek(weekData);
        } else {
          const calendarData = await apiClient.getStreakCalendar(visibleMonth, visibleYear);
          setStreakCalendar(calendarData);
        }
      } catch {
        if (calendarViewMode === "week") {
          setStreakWeek(null);
        } else {
          setStreakCalendar(null);
        }
      } finally {
        setIsCalendarLoading(false);
      }
    };

    loadStreakCalendar();
  }, [user, calendarViewMode, calendarAnchorDate, visibleMonth, visibleYear]);

  const handleDocumentSelect = (doc: Document) => {
    router.push(`/deck/${doc.id}`);
  };

  const handleDelete = async (deletedId: number) => {
    try {
      await apiClient.deleteDocument(deletedId);
      toast.success("Deck excluído com sucesso!");
      setRecentDocuments(currentDocs => 
        currentDocs.filter(doc => doc.id !== deletedId)
      );
      setAllDocuments(currentDocs => 
        currentDocs.filter(doc => doc.id !== deletedId)
      );
    } catch (error: any) {
      toast.error("Falha ao excluir o deck", { description: error.message });
    }
  };

  // Calcular pendências de revisão globais
  const pendingReviewDocs = allDocuments.filter(
    d => d.srs_enabled !== false && d.status === 'COMPLETED' && 
    ((d.flashcards_pending || 0) + (d.questions_pending || 0)) > 0
  );
  const totalPending = pendingReviewDocs.reduce(
    (sum, d) => sum + (d.flashcards_pending || 0) + (d.questions_pending || 0), 0
  );
  const hasDecks = allDocuments.length > 0;
  const prioritizedContinueCandidates = useMemo(() => {
    const candidates: Document[] = [];
    const seen = new Set<number>();

    const pushUnique = (doc: Document | null | undefined) => {
      if (!doc || seen.has(doc.id)) return;
      seen.add(doc.id);
      candidates.push(doc);
    };

    pushUnique(allDocuments.find((doc) => doc.id === dailySummary?.last_active_document_id));
    recentDocuments.forEach((doc) => pushUnique(doc));

    return candidates;
  }, [allDocuments, recentDocuments, dailySummary?.last_active_document_id]);

  const recentCarouselItems = [...recentDocuments, null];
  const visibleRecentCarouselItems = recentCarouselItems.slice(
    recentCarouselIndex,
    recentCarouselIndex + recentVisibleCards
  );
  const recentCarouselItemsCount = recentCarouselItems.length;
  const maxRecentCarouselIndex = Math.max(0, recentCarouselItemsCount - recentVisibleCards);

  useEffect(() => {
    setRecentCarouselIndex((currentIndex) => Math.min(currentIndex, maxRecentCarouselIndex));
  }, [maxRecentCarouselIndex]);

  useEffect(() => {
    let cancelled = false;

    const resolveContinueDeckContext = async () => {
      if (prioritizedContinueCandidates.length === 0) {
        if (!cancelled) {
          setContinueDocument(null);
          setContinueDetail(null);
          setContinueStats(null);
          setContinueProgressPercentage(null);
        }
        return;
      }

      let fallback: {
        document: Document;
        detail: Document;
        stats: DeckStats;
        progress: number;
      } | null = null;

      for (const candidate of prioritizedContinueCandidates) {
        try {
          const [detailData, statsData] = await Promise.all([
            apiClient.getDocument(candidate.id),
            apiClient.getDocumentStats(candidate.id),
          ]);
          const progress = calculateContinueProgress(candidate, detailData, statsData);

          if (progress === null) {
            continue;
          }

          if (!fallback) {
            fallback = {
              document: candidate,
              detail: detailData,
              stats: statsData,
              progress,
            };
          }

          if (progress < 100) {
            if (!cancelled) {
              setContinueDocument(candidate);
              setContinueDetail(detailData);
              setContinueStats(statsData);
              setContinueProgressPercentage(progress);
            }
            return;
          }
        } catch {
          continue;
        }
      }

      if (!cancelled && fallback) {
        setContinueDocument(fallback.document);
        setContinueDetail(fallback.detail);
        setContinueStats(fallback.stats);
        setContinueProgressPercentage(fallback.progress);
        return;
      }

      if (!cancelled) {
        setContinueDocument(null);
        setContinueDetail(null);
        setContinueStats(null);
        setContinueProgressPercentage(null);
      }
    };

    resolveContinueDeckContext();

    return () => {
      cancelled = true;
    };
  }, [prioritizedContinueCandidates]);

  const showContinueCard = !!continueDocument && continueProgressPercentage !== null;
  const canGoToNextMonth = (() => {
    const now = new Date();
    return visibleYear < now.getFullYear() || (visibleYear === now.getFullYear() && visibleMonth < now.getMonth() + 1);
  })();
  const canGoToNextWeek = startOfWeekSunday(shiftDateByDays(calendarAnchorDate, 7)) <= startOfWeekSunday(new Date());

  return (
    <div className="space-y-12">
      {loading ? (
        <section>
          <Card className="relative overflow-hidden border-[2.5px] border-border/80 bg-[#fbfbfe] shadow-sm dark:border-zinc-800 dark:bg-[#1c1d20]">
            <CardContent className="flex min-h-[220px] items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </section>
      ) : hasDecks ? (
        <DailyTasksBanner
          username={user?.username}
          pendingDeckCount={pendingReviewDocs.length}
          totalPending={totalPending}
          reviewedDecksToday={dailySummary?.reviewed_decks_today ?? 0}
          onPrimaryAction={() => {
            router.push("/library");
          }}
        />
      ) : (
        <CarouselSection onCreateClick={() => startTransition(() => router.push("/create"))} />
      )}

      {(hasDecks || recentDocuments.length > 0) && (
        <div className="space-y-8">
          {hasDecks && (
            <section
              className={cn(
                "grid gap-6 items-start",
                showContinueCard
                  ? "xl:grid-cols-2"
                  : "grid-cols-1"
              )}
            >
              {showContinueCard && continueDocument && continueProgressPercentage !== null && (
                <ContinueWhereLeftOffCard
                  document={continueDocument}
                  detail={continueDetail}
                  stats={continueStats}
                  progressPercentage={continueProgressPercentage}
                  lastActivityAt={dailySummary?.last_activity_at}
                  onContinue={() => handleDocumentSelect(continueDocument)}
                />
              )}

              <StreakCalendarCard
                weekSummary={streakWeek}
                monthSummary={streakCalendar}
                viewMode={calendarViewMode}
                onToggleViewMode={() => {
                  if (calendarViewMode === "week") {
                    setVisibleMonth(calendarAnchorDate.getMonth() + 1);
                    setVisibleYear(calendarAnchorDate.getFullYear());
                    setCalendarViewMode("month");
                  } else {
                    setCalendarAnchorDate(startOfWeekSunday(new Date()));
                    setCalendarViewMode("week");
                  }
                }}
                isLoading={isCalendarLoading}
                onPrevious={() => {
                  if (calendarViewMode === "week") {
                    setCalendarAnchorDate((currentDate) => startOfWeekSunday(shiftDateByDays(currentDate, -7)));
                  } else {
                    const previousMonthDate = shiftDateByMonths(new Date(visibleYear, visibleMonth - 1, 1), -1);
                    setVisibleMonth(previousMonthDate.getMonth() + 1);
                    setVisibleYear(previousMonthDate.getFullYear());
                  }
                }}
                onNext={() => {
                  if (calendarViewMode === "week") {
                    if (!canGoToNextWeek) return;
                    setCalendarAnchorDate((currentDate) => startOfWeekSunday(shiftDateByDays(currentDate, 7)));
                  } else {
                    if (!canGoToNextMonth) return;
                    const nextMonthDate = shiftDateByMonths(new Date(visibleYear, visibleMonth - 1, 1), 1);
                    setVisibleMonth(nextMonthDate.getMonth() + 1);
                    setVisibleYear(nextMonthDate.getFullYear());
                  }
                }}
                canGoNext={calendarViewMode === "week" ? canGoToNextWeek : canGoToNextMonth}
              />
            </section>
          )}

          {/* Seção de Decks Recentes */}
          {recentDocuments.length > 0 && (
            <section className="relative pt-4">
              <div className="max-w-5xl mx-auto">
                <Separator className="pointer-events-none absolute inset-x-0 top-0 bg-border" />
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <h3 className="text-xl lg:text-2xl font-bold text-foreground">Decks recentes</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRecentCarouselIndex((currentIndex) => Math.max(0, currentIndex - 1))}
                      disabled={recentCarouselIndex === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700/70 dark:bg-zinc-900/40"
                      aria-label="Ver decks anteriores"
                    >
                      <ChevronLeft className="h-4.5 w-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRecentCarouselIndex((currentIndex) => Math.min(maxRecentCarouselIndex, currentIndex + 1))
                      }
                      disabled={recentCarouselIndex >= maxRecentCarouselIndex}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700/70 dark:bg-zinc-900/40"
                      aria-label="Ver próximos decks"
                    >
                      <ChevronRight className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleRecentCarouselItems.map((item, index) =>
                        item ? (
                          <div key={item.id} className="min-w-0">
                          <RecentDocumentCard
                            document={item}
                            onSelect={() => handleDocumentSelect(item)}
                            onDelete={() => handleDelete(item.id)} 
                            onUpdate={fetchRecent}
                          />
                          </div>
                        ) : (
                          <div key={`library-card-${recentCarouselIndex + index}`} className="min-w-0">
                            <Card
                              className="flex h-[280px] w-full cursor-pointer flex-col items-center justify-center hover:shadow-lg transition-shadow"
                              onClick={() => router.push("/library")}
                            >
                              <CardHeader className="text-center p-6">
                                <Library className="w-10 h-10 mx-auto text-primary mb-2" />
                                <CardTitle>Acessar à Biblioteca</CardTitle>
                                <CardDescription>Ver todos os seus decks</CardDescription>
                              </CardHeader>
                            </Card>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
