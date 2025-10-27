"use client";

import { useEffect, useState } from 'react';
import { apiClient, ProgressStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Target, Trophy, Brain, TrendingUp, Calendar, Award, Layers, BrainCircuit } from "lucide-react";
import { WeeklyActivityChart } from '@/components/progress/weekly-activity-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
      <div className="h-4 w-4 bg-muted/50 rounded-full animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="h-8 w-16 bg-muted/50 rounded animate-pulse" />
      <div className="h-3 w-32 bg-muted/50 rounded mt-2 animate-pulse" />
    </CardContent>
  </Card>
);

export default function ProgressPage() {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'flashcards' | 'quizzes'>('overview');

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
    <div className="container mx-auto p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Seu Progresso</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Acompanhe seu desempenho em flashcards e quizzes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Flashcards</span>
            <span className="sm:hidden">Cards</span>
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BrainCircuit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Quizzes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {loading ? (
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          ) : error || !stats ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <p className="text-destructive text-center text-sm">{error || "Estatísticas não encontradas."}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="border-[#FACC15]/30 hover:border-[#FACC15] transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Sequência</CardTitle>
                    <div className="p-1.5 sm:p-2 bg-[#FACC15]/10 rounded-lg">
                      <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#FACC15]" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[#FACC15]">{stats.streak_days}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      dias consecutivos
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-[#FACC15]/30 hover:border-[#FACC15] transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Cards (Semana)</CardTitle>
                    <div className="p-1.5 sm:p-2 bg-[#FACC15]/10 rounded-lg">
                      <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#FACC15]" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[#FACC15]">{stats.cards_studied_week}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      flashcards estudados
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-[#48cfea]/30 hover:border-[#48cfea] transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Quizzes (Semana)</CardTitle>
                    <div className="p-1.5 sm:p-2 bg-[#48cfea]/10 rounded-lg">
                      <BrainCircuit className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#48cfea]" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[#48cfea]">{stats.quizzes_completed_week}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      quizzes completos
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-[#48cfea]/30 hover:border-[#48cfea] transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Performance</CardTitle>
                    <div className="p-1.5 sm:p-2 bg-[#48cfea]/10 rounded-lg">
                      <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#48cfea]" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[#48cfea]">
                      {((stats.flashcard_accuracy + stats.quiz_average_score) / 2).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      média geral
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#FACC15]" />
                    Atividade Semanal - Flashcards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <WeeklyActivityChart data={stats.flashcard_weekly_activity} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="flashcards" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          ) : error || !stats ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <p className="text-destructive text-center text-sm">{error || "Estatísticas não encontradas."}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Card className="border-[#FACC15]/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Cards Estudados</CardTitle>
                    <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#FACC15]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[#FACC15]">{stats.cards_studied_week}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      nos últimos 7 dias
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-[#FACC15]/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Precisão</CardTitle>
                    <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#FACC15]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[#FACC15]">{stats.flashcard_accuracy.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      média de acertos
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-[#FACC15]/20 bg-[#FACC15]/5 dark:bg-[#FACC15]/10">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-[#FACC15]" />
                    Insights de Flashcards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.streak_days >= 7 && (
                    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-[#FACC15]/30">
                      <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#FACC15] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Parabéns! 🎉</p>
                        <p className="text-xs text-muted-foreground">
                          Você manteve uma sequência de {stats.streak_days} dias. Continue assim!
                        </p>
                      </div>
                    </div>
                  )}
                  {stats.flashcard_accuracy >= 80 && (
                    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-[#FACC15]/30">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[#FACC15] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Excelente precisão!</p>
                        <p className="text-xs text-muted-foreground">
                          Sua taxa de acerto de {stats.flashcard_accuracy.toFixed(1)}% está ótima!
                        </p>
                      </div>
                    </div>
                  )}
                  {stats.cards_studied_week < 5 && (
                    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-[#FACC15]/30">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#FACC15] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Dica de estudo</p>
                        <p className="text-xs text-muted-foreground">
                          Tente estudar pelo menos 10 flashcards por dia para melhor retenção.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          ) : error || !stats ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <p className="text-destructive text-center text-sm">{error || "Estatísticas não encontradas."}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Card className="border-[#48cfea]/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Quizzes Completos</CardTitle>
                    <BrainCircuit className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#48cfea]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[#48cfea]">{stats.quizzes_completed_week}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      nos últimos 7 dias
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-[#48cfea]/30">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Pontuação Média</CardTitle>
                    <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#48cfea]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl sm:text-3xl font-bold text-[#48cfea]">{stats.quiz_average_score.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      em todos os quizzes
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[#48cfea]" />
                    Performance em Quizzes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs sm:text-sm font-medium">Pontuação Média</span>
                        <span className="text-xs sm:text-sm font-bold text-[#48cfea]">{stats.quiz_average_score.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5 sm:h-3 overflow-hidden">
                        <div 
                          className="h-full bg-[#48cfea] transition-all duration-500"
                          style={{ width: `${stats.quiz_average_score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#48cfea]/20 bg-[#48cfea]/5 dark:bg-[#48cfea]/10">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-[#48cfea]" />
                    Insights de Quizzes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.quiz_average_score >= 80 && (
                    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-[#48cfea]/30">
                      <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#48cfea] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Performance excelente! 🏆</p>
                        <p className="text-xs text-muted-foreground">
                          Sua pontuação média de {stats.quiz_average_score.toFixed(1)}% está acima de 80%!
                        </p>
                      </div>
                    </div>
                  )}
                  {stats.quiz_average_score >= 50 && stats.quiz_average_score < 80 && (
                    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-[#48cfea]/30">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[#48cfea] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">No caminho certo!</p>
                        <p className="text-xs text-muted-foreground">
                          Sua média de {stats.quiz_average_score.toFixed(1)}% é boa. Continue revisando.
                        </p>
                      </div>
                    </div>
                  )}
                  {stats.quiz_average_score < 50 && stats.quizzes_completed_week > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-[#48cfea]/30">
                      <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-[#48cfea] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Continue focado!</p>
                        <p className="text-xs text-muted-foreground">
                          Sua média de {stats.quiz_average_score.toFixed(1)}% mostra que há espaço para melhorar. A repetição é a chave.
                        </p>
                      </div>
                    </div>
                  )}
                  {stats.quizzes_completed_week === 0 && (
                    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-[#48cfea]/30">
                      <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-[#48cfea] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Experimente os quizzes!</p>
                        <p className="text-xs text-muted-foreground">
                          Os quizzes são uma ótima forma de testar seus conhecimentos.
                        </p>
                      </div>
                    </div>
                  )}
                  {stats.quizzes_completed_week > 0 && stats.quizzes_completed_week < 3 && (
                    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-[#48cfea]/30">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#48cfea] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Continue praticando!</p>
                        <p className="text-xs text-muted-foreground">
                          Fazer mais quizzes ajuda a consolidar o aprendizado.
                        </p>
                      </div>
                    </div>
                  )}
                  {stats.quizzes_completed_week >= 3 && (
                    <div className="flex items-start gap-3 p-3 bg-card rounded-lg border border-[#48cfea]/30">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#48cfea] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">Ótimo ritmo!</p>
                        <p className="text-xs text-muted-foreground">
                          Você completou {stats.quizzes_completed_week} quizzes esta semana. Mantenha a consistência!
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}