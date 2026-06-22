"use client";

import { CalendarDays, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ProgressDailyActivity, ProgressInsight } from "@/lib/api";
import { ChartContainer } from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const COLORS = {
  flashcards: "#fdbe0c",
  quizInteractions: "#2bacf2",
  guidedSteps: "#84cf92",
};

function ActivityTooltip({ active, payload, label, mode }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ProgressDailyActivity;
  if (!row) return null;

  return (
    <div className="min-w-[220px] rounded-2xl border border-[#e7edf3] bg-white px-4 py-3 text-sm shadow-xl dark:border-zinc-800 dark:bg-[#18191d]">
      <p className="font-semibold text-[#182738] dark:text-white">{label}</p>
      <div className="mt-2 space-y-1.5 text-[#46556d] dark:text-white/70">
        {mode === "all" ? (
          <>
            <p>{row.flashcards} flashcards revisados</p>
            <p>{row.quizInteractions} questões de quiz respondidas</p>
            <p>{row.guidedSteps} etapas guiadas concluídas</p>
            <p className="pt-1 font-semibold text-[#182738] dark:text-white">{row.total} interações de estudo</p>
          </>
        ) : mode === "flashcards" ? (
          <p className="font-semibold text-[#182738] dark:text-white">{row.flashcards} revisões concluídas</p>
        ) : mode === "quizzes" ? (
          <p className="font-semibold text-[#182738] dark:text-white">{row.quizInteractions} questões respondidas</p>
        ) : (
          <p className="font-semibold text-[#182738] dark:text-white">{row.guidedSteps} etapas concluídas</p>
        )}
      </div>
    </div>
  );
}

function TotalLabel(props: any) {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 10}
      textAnchor="middle"
      className="fill-[#182738] text-[12px] font-semibold dark:fill-white/90"
    >
      {value}
    </text>
  );
}

function SegmentLabel(props: any) {
  const { x, y, width, height, value } = props;
  if (!value || height < 24) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2 + 4}
      textAnchor="middle"
      className="fill-[#182738] text-[11px] font-semibold dark:fill-[#182738]"
    >
      {value}
    </text>
  );
}

interface ProgressWeeklyActivityCardProps {
  activity: ProgressDailyActivity[];
  insight: ProgressInsight;
  mode?: "all" | "flashcards" | "quizzes" | "guided";
  className?: string;
}

export function ProgressWeeklyActivityCard({
  activity,
  insight,
  mode = "all",
  className,
}: ProgressWeeklyActivityCardProps) {
  const config = {
    all: {
      title: "Atividade da semana",
      subtitle: "Seus estudos por dia e por modo",
      accentIcon: "bg-[#fdbe0c]/12 text-[#f2ab00] dark:bg-[#3c3213] dark:text-[#ffd76e]",
      insightWrap: "border-[#fdbe0c]/25 bg-[#fff7e3] dark:border-[#fdbe0c]/16 dark:bg-[#2b2415]",
      insightIcon: "bg-[#fdbe0c]/15 text-[#f2ab00] dark:bg-[#3c3213] dark:text-[#ffd76e]",
      bars: [
        { key: "flashcards", label: "Flashcards", color: COLORS.flashcards },
        { key: "quizInteractions", label: "Quizzes", color: COLORS.quizInteractions },
        { key: "guidedSteps", label: "Estudo Guiado", color: COLORS.guidedSteps },
      ] as const,
    },
    flashcards: {
      title: "Flashcards na semana",
      subtitle: "Sua atividade diária em revisões",
      accentIcon: "bg-[#fdbe0c]/12 text-[#f2ab00] dark:bg-[#3c3213] dark:text-[#ffd76e]",
      insightWrap: "border-[#fdbe0c]/25 bg-[#fff7e3] dark:border-[#fdbe0c]/16 dark:bg-[#2b2415]",
      insightIcon: "bg-[#fdbe0c]/15 text-[#f2ab00] dark:bg-[#3c3213] dark:text-[#ffd76e]",
      bars: [{ key: "flashcards", label: "Flashcards", color: COLORS.flashcards }] as const,
    },
    quizzes: {
      title: "Quizzes na semana",
      subtitle: "Sua atividade diária em questões respondidas",
      accentIcon: "bg-[#2bacf2]/12 text-[#2bacf2] dark:bg-[#162a36] dark:text-[#8ad8ff]",
      insightWrap: "border-[#2bacf2]/20 bg-[#f3fbff] dark:border-[#23485d] dark:bg-[#16202b]",
      insightIcon: "bg-[#2bacf2]/14 text-[#2bacf2] dark:bg-[#162a36] dark:text-[#8ad8ff]",
      bars: [{ key: "quizInteractions", label: "Quizzes", color: COLORS.quizInteractions }] as const,
    },
    guided: {
      title: "Estudo guiado na semana",
      subtitle: "Sua atividade diária em etapas concluídas",
      accentIcon: "bg-[#52ba6b]/12 text-[#52ba6b] dark:bg-[#1a3020] dark:text-[#9ed9aa]",
      insightWrap: "border-[#52ba6b]/20 bg-[#f4fbf6] dark:border-[#2f5a39] dark:bg-[#17231a]",
      insightIcon: "bg-[#52ba6b]/14 text-[#52ba6b] dark:bg-[#1a3020] dark:text-[#9ed9aa]",
      bars: [{ key: "guidedSteps", label: "Estudo Guiado", color: COLORS.guidedSteps }] as const,
    },
  }[mode];

  const chartData =
    mode === "all"
      ? activity
      : activity.map((row) => {
          const value = row[config.bars[0].key];
          return {
            ...row,
            total: value,
          };
        });

  return (
    <Card
      className={cn(
        "self-start rounded-[24px] border border-[#e7edf3] bg-white p-6 shadow-[0_2px_8px_rgba(24,39,56,0.05)] dark:border-zinc-800 dark:bg-[#23262f]/95",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn("mt-1 flex h-11 w-11 items-center justify-center rounded-2xl", config.accentIcon)}>
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[1.65rem] font-bold tracking-tight text-[#182738] dark:text-white">
              {config.title}
            </h3>
            <p className="mt-1 text-sm text-[#627089] dark:text-white/60">
              {config.subtitle}
            </p>
          </div>
        </div>

        {mode === "all" ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#627089] dark:text-white/65">
            {config.bars.map((bar) => (
              <div key={bar.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bar.color }} />
                {bar.label}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <ChartContainer className="h-[300px] rounded-[18px] dark:bg-white/[0.02] md:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={8}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(121,131,154,0.18)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#627089", fontSize: 13 }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#627089", fontSize: 12 }}
                width={32}
              />
              <Tooltip content={<ActivityTooltip mode={mode} />} cursor={{ fill: "rgba(24,39,56,0.04)" }} />
              {config.bars.map((bar, index) => (
                <Bar
                  key={bar.key}
                  dataKey={bar.key}
                  stackId={mode === "all" ? "study" : undefined}
                  radius={mode === "all" ? (index === config.bars.length - 1 ? [10, 10, 0, 0] : [0, 0, 0, 0]) : [10, 10, 0, 0]}
                  maxBarSize={34}
                >
                  <LabelList dataKey={bar.key} content={<SegmentLabel />} />
                  {index === config.bars.length - 1 ? <LabelList dataKey="total" content={<TotalLabel />} /> : null}
                  {chartData.map((item) => (
                    <Cell key={`${item.date}-${bar.key}`} fill={bar.color} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <table className="sr-only">
        <caption>Atividade de estudo da semana por dia e por modo</caption>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Flashcards</th>
            <th>Quizzes</th>
            <th>Estudo guiado</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {activity.map((row) => (
            <tr key={row.date}>
              <td>{row.label}</td>
              <td>{row.flashcards}</td>
              <td>{row.quizInteractions}</td>
              <td>{row.guidedSteps}</td>
              <td>{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={cn("mt-5 rounded-[20px] border px-4 py-4", config.insightWrap)}>
        <div className="flex items-start gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", config.insightIcon)}>
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#182738] dark:text-white">Insight da semana</p>
            <p className="mt-1 text-sm leading-relaxed text-[#627089] dark:text-white/70">{insight.text}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
