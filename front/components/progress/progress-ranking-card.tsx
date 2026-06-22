"use client";

import { useEffect, useState } from "react";
import { Globe, Trophy, ExternalLink, Info, Loader2, Medal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiClient, type ProgressRanking, type ProgressRankingEntry, type ProgressRankingPageResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

const rankStyles: Record<number, string> = {
  1: "bg-[#fff0b8] text-[#d99000]",
  2: "bg-[#eceff4] text-[#6a7a92]",
  3: "bg-[#ffe0cf] text-[#d16c3f]",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function RankingRow({ entry }: { entry: ProgressRankingEntry }) {
  const isPodium = entry.rank <= 3;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[18px] border border-transparent px-3 py-3 transition-colors",
        entry.is_current_user
          ? "border-[#f3dfaa] bg-[#fff7e3] dark:border-[#5f4d22] dark:bg-[#3a3119]"
          : "bg-transparent hover:bg-[#f7f9fc] dark:hover:bg-white/[0.03]"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          isPodium
            ? rankStyles[entry.rank]
            : "bg-[#f5f7fb] text-[#2a3a52] dark:bg-[#303640] dark:text-[#eef2f7]"
        )}
      >
        {isPodium ? <Medal className="h-4 w-4" /> : entry.rank}
      </div>

      <Avatar className="h-9 w-9 border border-black/5 dark:border-zinc-700">
        <AvatarImage src={entry.avatar_url ?? undefined} alt={entry.display_name} />
        <AvatarFallback>{getInitials(entry.display_name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#2a3a52] dark:text-white/90">{entry.display_name}</p>
      </div>

      <div className={cn("text-sm font-semibold", entry.is_current_user ? "text-[#f2ab00]" : "text-[#2a3a52] dark:text-white/90")}>
        {new Intl.NumberFormat("pt-BR").format(entry.points)} pts
      </div>
    </div>
  );
}

interface ProgressRankingCardProps {
  ranking: ProgressRanking;
}

export function ProgressRankingCard({ ranking }: ProgressRankingCardProps) {
  const [open, setOpen] = useState(false);
  const [fullRanking, setFullRanking] = useState<ProgressRankingPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadAttempted, setLoadAttempted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasCompletePreview = ranking.entries.length >= ranking.total_participants;

  useEffect(() => {
    if (!open || fullRanking || loading || loadAttempted) return;

    if (hasCompletePreview) {
      setFullRanking({
        entries: ranking.entries,
        current_user_rank: ranking.current_user_rank,
        updated_at: ranking.updated_at,
        total_participants: ranking.total_participants,
        limit: ranking.entries.length,
        offset: 0,
      });
      setLoadAttempted(true);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 8000);

    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await apiClient.getProgressRanking(50, 0, controller.signal);
        if (!cancelled) setFullRanking(data);
      } catch (error: any) {
        if (!cancelled) {
          setLoadError(
            error?.name === "AbortError"
              ? "O ranking completo demorou demais para responder. Exibindo a versão disponível."
              : error?.message || "Não foi possível carregar o ranking completo agora."
          );
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) {
          setLoading(false);
          setLoadAttempted(true);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [open, fullRanking, loading, loadAttempted, hasCompletePreview, ranking]);

  useEffect(() => {
    if (!open) {
      setLoadAttempted(false);
      setLoadError(null);
      setFullRanking(null);
    }
  }, [open]);

  return (
    <>
      <Card className="rounded-[24px] border border-[#e7edf3] bg-white p-6 shadow-[0_2px_8px_rgba(24,39,56,0.05)] dark:border-zinc-800 dark:bg-[#23262f]/95">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#4b6797] dark:bg-[#1b2330] dark:text-[#c8d8f6]">
            <Globe className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a96aa] dark:text-white/35">
              Competição da semana
            </p>
            <h3 className="mt-2 text-[1.45rem] font-semibold tracking-tight text-[#182738] dark:text-white">
              Ranking global
            </h3>
            <p className="mt-1 text-sm text-[#627089] dark:text-white/60">
              Estudantes em destaque esta semana
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[20px] border border-[#edf1f5] bg-[#f7f9fc] px-4 py-4 dark:border-zinc-700 dark:bg-[#2a2f38]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a96aa] dark:text-white/35">
            Sua posição nesta semana
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="text-[2.4rem] font-bold leading-none tracking-tight text-[#182738] dark:text-white">
              {ranking.current_user_rank ? `#${ranking.current_user_rank}` : "--"}
            </p>
            <p className="text-sm text-[#627089] dark:text-white/60">
              {new Intl.NumberFormat("pt-BR").format(ranking.total_participants)} participantes
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          {ranking.entries.map((entry) => (
            <RankingRow key={`${entry.rank}-${entry.display_name}`} entry={entry} />
          ))}
        </div>

        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 h-11 w-full rounded-2xl border border-[#fdbe0c]/15 bg-gradient-to-r from-[#fff3c8] to-[#ffefbe] text-[#2a3a52] hover:opacity-95 dark:border-[#fdbe0c]/10 dark:from-[#3e3521] dark:to-[#2f2918] dark:text-white"
          variant="ghost"
        >
          Ver ranking completo
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>

        <div className="mt-5 flex items-start gap-2 text-sm text-[#627089] dark:text-white/60">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Pontuação baseada em consistência, desempenho e conclusão de trilhas.</p>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden rounded-[28px] border border-[#e7edf3] bg-white p-0 sm:max-w-[720px] dark:border-zinc-800 dark:bg-[#131923]">
          <DialogHeader className="border-b border-[#edf1f5] px-6 py-5 dark:border-zinc-800">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-[#182738] dark:text-white">
              <Trophy className="h-6 w-6 text-[#fdbe0c] dark:text-[#ffd76e]" />
              Ranking global
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[calc(85vh-90px)] overflow-y-auto px-4 py-4 sm:px-6">
            {loading && !fullRanking ? (
              <div className="flex items-center justify-center py-16 text-[#627089] dark:text-white/60">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Carregando ranking...
              </div>
            ) : (
              <>
                {loadError ? (
                  <div className="mb-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                    {loadError}
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  {(fullRanking?.entries ?? ranking.entries).map((entry) => (
                    <RankingRow key={`dialog-${entry.rank}-${entry.display_name}`} entry={entry} />
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
