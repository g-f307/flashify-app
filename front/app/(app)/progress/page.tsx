"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, HelpCircle, Layers3, LineChart, Map, Target } from "lucide-react";
import {
  apiClient,
  type ProgressDailyActivity,
  type ProgressMetric,
  type ProgressOverviewResponse,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressMetricCard } from "@/components/progress/progress-metric-card";
import { ProgressRankingCard } from "@/components/progress/progress-ranking-card";
import { ProgressWeeklyActivityCard } from "@/components/progress/progress-weekly-activity-card";
import { cn } from "@/lib/utils";

type ProgressTab = "overview" | "flashcards" | "quizzes" | "guided";
type ActivityKey = "flashcards" | "quizInteractions" | "guidedSteps" | "total";

const VALID_TABS: ProgressTab[] = ["overview", "flashcards", "quizzes", "guided"];

const tabItems: Array<{
  id: ProgressTab;
  label: string;
  icon: typeof LineChart;
}> = [
  { id: "overview", label: "Visão Geral", icon: LineChart },
  { id: "flashcards", label: "Flashcards", icon: Layers3 },
  { id: "quizzes", label: "Quizzes", icon: HelpCircle },
  { id: "guided", label: "Estudo Guiado", icon: Map },
];

function resolveTab(rawValue: string | null): ProgressTab {
  return VALID_TABS.includes(rawValue as ProgressTab) ? (rawValue as ProgressTab) : "overview";
}

function formatValue(metric: ProgressMetric, mode: "integer" | "percent") {
  if (metric.value === null || Number.isNaN(metric.value)) return "--";
  const rounded = Math.round(metric.value);
  return mode === "percent" ? `${rounded}%` : new Intl.NumberFormat("pt-BR").format(rounded);
}

function sumActivity(activity: ProgressDailyActivity[], key: ActivityKey) {
  return activity.reduce((total, row) => total + row[key], 0);
}

function countActiveDays(activity: ProgressDailyActivity[], key: ActivityKey) {
  return activity.filter((row) => row[key] > 0).length;
}

function averagePerDay(total: number, days = 7) {
  return total / days;
}

function bestDay(activity: ProgressDailyActivity[], key: ActivityKey) {
  const entry = activity.reduce<ProgressDailyActivity | null>((best, row) => {
    if (!best || row[key] > best[key]) return row;
    return best;
  }, null);

  if (!entry || entry[key] <= 0) return null;
  return `${entry.label} · ${entry[key]}`;
}

function truncateText(value: string, max = 34) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="h-20 rounded-[24px] bg-muted/50 animate-pulse" />
      <div className="h-14 rounded-[18px] bg-muted/40 animate-pulse" />
      <div className="grid gap-5 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[176px] rounded-[22px] bg-muted/40 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2.6fr)_minmax(360px,1fr)]">
        <div className="h-[470px] rounded-[24px] bg-muted/40 animate-pulse" />
        <div className="h-[470px] rounded-[24px] bg-muted/40 animate-pulse" />
      </div>
    </div>
  );
}

function HeaderCard() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-[#182738] dark:text-white lg:text-3xl">Seu Progresso</h1>
      <p className="max-w-2xl text-sm leading-6 text-[#627089] dark:text-white/65 md:text-[0.95rem]">
        Acompanhe sua jornada de estudos em todos os modos e evolua a cada dia.
      </p>
    </div>
  );
}

function InlineFacts({
  facts,
}: {
  facts: string[];
}) {
  return (
    <div className="space-y-2 text-sm text-[#516078] dark:text-white/70">
      {facts.map((fact) => (
        <p key={fact}>{fact}</p>
      ))}
    </div>
  );
}

function NeutralSummaryCard({
  eyebrow,
  title,
  description,
  value,
  caption,
  valueClassName,
  facts,
}: {
  eyebrow: string;
  title: string;
  description: string;
  value: string;
  caption: string;
  valueClassName: string;
  facts: string[];
}) {
  return (
    <Card className="rounded-[24px] border border-[#e7edf3] bg-white p-6 shadow-[0_2px_8px_rgba(24,39,56,0.05)] dark:border-zinc-800 dark:bg-[#23262f]/95">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a96aa] dark:text-white/35">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-[1.7rem] font-semibold tracking-tight text-[#182738] dark:text-white">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#627089] dark:text-white/65">{description}</p>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-[#edf1f5] pt-5 dark:border-zinc-700">
        <div>
          <p className={cn("text-[2.85rem] font-bold leading-none tracking-tight", valueClassName)}>{value}</p>
          <p className="mt-2 text-sm text-[#627089] dark:text-white/65">{caption}</p>
        </div>
        <InlineFacts facts={facts} />
      </div>
    </Card>
  );
}

function ActionPanel({
  eyebrow,
  title,
  description,
  meta,
  actionHref,
  actionLabel,
  buttonClassName,
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta?: string | null;
  actionHref?: string | null;
  actionLabel: string;
  buttonClassName: string;
}) {
  return (
    <Card className="rounded-[24px] border border-[#e7edf3] bg-white p-6 shadow-[0_2px_8px_rgba(24,39,56,0.05)] dark:border-zinc-800 dark:bg-[#23262f]/95">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a96aa] dark:text-white/35">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-2xl font-semibold text-[#182738] dark:text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#627089] dark:text-white/65">{description}</p>
      {meta ? <p className="mt-5 text-sm font-medium text-[#516078] dark:text-white/70">{meta}</p> : null}
      {actionHref ? (
        <Button asChild className={cn("mt-5 rounded-2xl", buttonClassName)}>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </Card>
  );
}

function EmptyBlock({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Card className="rounded-[24px] border border-dashed border-[#d7dfea] bg-white/80 p-6 shadow-none dark:border-zinc-700 dark:bg-[#23262f]/95">
      <p className="text-lg font-semibold text-[#182738] dark:text-white">{title}</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#627089] dark:text-white/65">{description}</p>
      {actionHref && actionLabel ? (
        <Button asChild className="mt-5 rounded-2xl bg-[#182738] hover:bg-[#182738]/90 dark:bg-white dark:text-[#182738]">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </Card>
  );
}

function OverviewPanel({ overview }: { overview: ProgressOverviewResponse }) {
  const quizQuestionsTotal = sumActivity(overview.activity, "quizInteractions");
  const weeklyStudyDays = countActiveDays(overview.activity, "total");
  const guidedPathLabel = overview.summary.guided.active_path_name
    ? truncateText(overview.summary.guided.active_path_name)
    : "Nenhuma trilha ativa";

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <ProgressMetricCard
          title="Flashcards (semana)"
          icon={Layers3}
          accent="flashcards"
          value={formatValue(overview.summary.flashcards, "integer")}
          subtitle={`${countActiveDays(overview.activity, "flashcards")} dias com revisão`}
          trend={overview.summary.flashcards.trend}
        />
        <ProgressMetricCard
          title="Quizzes (semana)"
          icon={Target}
          accent="quiz"
          value={formatValue(overview.summary.quizzes, "integer")}
          subtitle={`${quizQuestionsTotal} questões respondidas`}
          trend={overview.summary.quizzes.trend}
        />
        <ProgressMetricCard
          title="Estudo Guiado"
          icon={Map}
          accent="guided"
          value={formatValue(overview.summary.guided, "percent")}
          subtitle={guidedPathLabel}
          trend={overview.summary.guided.trend}
        />
        <ProgressMetricCard
          title="Desempenho médio"
          icon={LineChart}
          accent="performance"
          value={formatValue(overview.summary.performance, "percent")}
          subtitle={
            overview.summary.performance.value === null
              ? "Continue estudando para gerar sua média"
              : `${overview.summary.performance.series.filter((value) => value !== null).length} dias com base`
          }
          trend={overview.summary.performance.trend}
        />
      </div>

      <Card className="rounded-[24px] border border-[#e7edf3] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(24,39,56,0.05)] dark:border-zinc-800 dark:bg-[#23262f]/95">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a96aa] dark:text-white/35">
              Panorama da semana
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[#182738] dark:text-white">{overview.motivation.title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#627089] dark:text-white/65">{overview.motivation.message}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f7f9fc] px-3 py-1.5 text-xs font-semibold text-[#516078] dark:bg-white/[0.04] dark:text-white/70">
              {weeklyStudyDays} dias estudando
            </span>
            <span className="rounded-full bg-[#f7f9fc] px-3 py-1.5 text-xs font-semibold text-[#516078] dark:bg-white/[0.04] dark:text-white/70">
              ranking {overview.ranking.current_user_rank ? `#${overview.ranking.current_user_rank}` : "indefinido"}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2.25fr)_420px]">
        <ProgressWeeklyActivityCard activity={overview.activity} insight={overview.insight} />
        <ProgressRankingCard ranking={overview.ranking} />
      </div>
    </div>
  );
}

function FlashcardsPanel({ overview }: { overview: ProgressOverviewResponse }) {
  const flashcardsTotal = sumActivity(overview.activity, "flashcards");

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <NeutralSummaryCard
          eyebrow="Flashcards"
          title="Ritmo de revisão"
          description="O ganho aqui vem da constância, não do excesso pontual."
          value={formatValue(overview.summary.flashcards, "integer")}
          caption="cards estudados na semana"
          valueClassName="text-[#f2ab00] dark:text-[#fdbe0c]"
          facts={[
            `${countActiveDays(overview.activity, "flashcards")} dias com revisão`,
            `${formatDecimal(averagePerDay(flashcardsTotal))} cards por dia`,
            bestDay(overview.activity, "flashcards") ? `Pico em ${bestDay(overview.activity, "flashcards")}` : "Sem pico relevante",
          ]}
        />

        <ActionPanel
          eyebrow="Revisão inteligente"
          title={overview.recommendations.review.title}
          description={overview.recommendations.review.subtitle}
          meta={`${overview.recommendations.review.due_count} cards aguardando ação`}
          actionHref={overview.recommendations.review.action_url}
          actionLabel={overview.recommendations.review.action_label}
          buttonClassName="bg-[#fdbe0c] text-[#182738] hover:bg-[#fdbe0c]/90"
        />
      </div>

      <ProgressWeeklyActivityCard activity={overview.activity} insight={overview.insight} mode="flashcards" />
    </div>
  );
}

function QuizzesPanel({ overview }: { overview: ProgressOverviewResponse }) {
  const quizzesTotal = sumActivity(overview.activity, "quizInteractions");
  const completedQuizzes = Math.round(overview.summary.quizzes.value ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <NeutralSummaryCard
          eyebrow="Quizzes"
          title="Leitura de desempenho"
          description="Aqui o sinal principal é a qualidade das respostas, não só o volume."
          value={formatValue(overview.summary.performance, "percent")}
          caption="precisão média consolidada"
          valueClassName="text-[#2bacf2]"
          facts={[
            `${completedQuizzes} quizzes concluídos`,
            `${quizzesTotal} questões respondidas`,
            bestDay(overview.activity, "quizInteractions") ? `Pico em ${bestDay(overview.activity, "quizInteractions")}` : "Sem dia dominante",
          ]}
        />

        {overview.recommendations.quiz ? (
          <ActionPanel
            eyebrow="Próximo quiz"
            title={overview.recommendations.quiz.title}
            description={overview.recommendations.quiz.reason}
            meta={`${overview.recommendations.quiz.question_count} questões • ${overview.recommendations.quiz.difficulty_label}`}
            actionHref={overview.recommendations.quiz.action_url}
            actionLabel={overview.recommendations.quiz.action_label}
            buttonClassName="bg-[#2bacf2] text-black hover:bg-[#2bacf2]/90"
          />
        ) : (
          <ActionPanel
            eyebrow="Próximo quiz"
            title="Nenhum quiz disponível agora"
            description="Finalize um deck com quiz para receber recomendações mais assertivas nesta área."
            actionHref="/library"
            actionLabel="Abrir biblioteca"
            buttonClassName="bg-[#2bacf2] text-black hover:bg-[#2bacf2]/90"
          />
        )}
      </div>

      <ProgressWeeklyActivityCard activity={overview.activity} insight={overview.insight} mode="quizzes" />
    </div>
  );
}

function GuidedPanel({ overview }: { overview: ProgressOverviewResponse }) {
  const guidedSteps = sumActivity(overview.activity, "guidedSteps");

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <NeutralSummaryCard
          eyebrow="Estudo Guiado"
          title="Progresso da trilha ativa"
          description={
            overview.summary.guided.active_path_name
              ? `Você está avançando em ${truncateText(overview.summary.guided.active_path_name, 54)}.`
              : "Assim que uma trilha ficar disponível, esta área passa a mostrar sua evolução real."
          }
          value={formatValue(overview.summary.guided, "percent")}
          caption="da trilha ativa já percorrida"
          valueClassName="text-[#52ba6b]"
          facts={[
            `${guidedSteps} passos nesta semana`,
            `${countActiveDays(overview.activity, "guidedSteps")} dias de avanço`,
            bestDay(overview.activity, "guidedSteps") ? `Pico em ${bestDay(overview.activity, "guidedSteps")}` : "Sem pico relevante",
          ]}
        />

        {overview.recommendations.guided_path ? (
          <ActionPanel
            eyebrow="Próximo passo"
            title={overview.recommendations.guided_path.title}
            description={overview.recommendations.guided_path.step_label}
            meta={overview.recommendations.guided_path.progress_label}
            actionHref={overview.recommendations.guided_path.action_url}
            actionLabel={overview.recommendations.guided_path.action_label}
            buttonClassName="bg-[#52ba6b] text-black hover:bg-[#52ba6b]/90"
          />
        ) : (
          <EmptyBlock
            title="Estudo guiado ainda não liberado"
            description="Gere flashcards e quiz em um deck para destravar trilhas guiadas com progresso real."
            actionHref="/library"
            actionLabel="Abrir biblioteca"
          />
        )}
      </div>

      <ProgressWeeklyActivityCard activity={overview.activity} insight={overview.insight} mode="guided" />
    </div>
  );
}

export default function ProgressPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<ProgressOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeTab = useMemo(() => resolveTab(searchParams.get("tab")), [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getProgressOverview();
        if (!cancelled) setOverview(data);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Não foi possível carregar sua tela de progresso.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTabChange = (nextTab: string) => {
    const resolved = resolveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", resolved);
    startTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    });
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !overview) {
    return (
      <Card className="rounded-[28px] border border-red-500/20 bg-red-500/5 p-8 text-center dark:border-red-500/15 dark:bg-red-500/10">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h2 className="mt-4 text-2xl font-bold text-[#182738] dark:text-white">Não foi possível carregar seu progresso</h2>
        <p className="mt-2 text-sm text-[#627089] dark:text-white/65">{error || "Tente novamente em instantes."}</p>
        <Button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-2xl bg-[#182738] hover:bg-[#182738]/90 dark:bg-white dark:text-[#182738]"
        >
          Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 pb-8">
      <HeaderCard />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[18px] border border-[#e7edf3] bg-white/92 p-1.5 shadow-[0_1px_6px_rgba(24,39,56,0.04)] dark:border-zinc-800 dark:bg-[#23262f]/95 sm:grid-cols-4 sm:overflow-x-auto">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "min-w-0 justify-center gap-2 rounded-[14px] border border-transparent px-3 py-3 text-sm font-medium text-[#516078] transition-colors data-[state=active]:border-[#f3d78d] data-[state=active]:bg-[#fff6dd] data-[state=active]:text-[#182738] data-[state=active]:shadow-none dark:text-white/70 dark:data-[state=active]:border-[#5c4a21] dark:data-[state=active]:bg-[#2a2418] dark:data-[state=active]:text-white sm:min-w-fit sm:px-4 sm:py-2.5",
                  isPending && activeTab === tab.id ? "opacity-80" : ""
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewPanel overview={overview} />
        </TabsContent>

        <TabsContent value="flashcards" className="mt-6">
          <FlashcardsPanel overview={overview} />
        </TabsContent>

        <TabsContent value="quizzes" className="mt-6">
          <QuizzesPanel overview={overview} />
        </TabsContent>

        <TabsContent value="guided" className="mt-6">
          <GuidedPanel overview={overview} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
