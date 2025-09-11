"use client";

import { useEffect, useState } from 'react';
import { apiClient, ProgressStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Target, Trophy } from "lucide-react";
import { WeeklyActivityChart } from '@/components/progress/weekly-activity-chart';

// Componente de Skeleton para os cards
const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">Carregando...</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-8 w-1/4 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-gray-200 rounded mt-2 animate-pulse" />
    </CardContent>
  </Card>
);


export default function ProgressPage() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getProgressStats();
        setStats(data);
      } catch (err) {
        setError("Não foi possível carregar as estatísticas.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-6">Seu Progresso</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : error || !stats ? (
          <p className="text-red-500 md:col-span-3">{error || "Estatísticas não encontradas."}</p>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cards estudados (semana)</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.cards_studied_week}</div>
                <p className="text-xs text-muted-foreground">
                  Total de flashcards revisados nos últimos 7 dias.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sequência de estudos</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.streak_days} dias</div>
                <p className="text-xs text-muted-foreground">
                  Dias consecutivos que você estudou.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Precisão geral</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(stats.general_accuracy * 100).toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">
                  Média de acertos em todos os flashcards.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="mt-8">
        {loading ? (
            <Card>
                <CardContent className="pt-6">
                    <div className="h-60 bg-gray-100 rounded-md animate-pulse" />
                </CardContent>
            </Card>
        ) : stats && !error && (
            <WeeklyActivityChart data={stats.weekly_activity} />
        )}
      </div>
    </div>
  );
}