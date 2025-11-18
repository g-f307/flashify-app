// front/app/(app)/settings/ai-usage/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useGenerationLimit } from "@/contexts/generation-limit-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Clock,
  Cpu,
  FileStack,
  ListChecks,
  FilePlus2,
  Layers,
  HelpCircle as CircleHelp,
  ArrowLeft,
  Play,
  AlertCircle,
  Check,
  ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

const useCases = [
  {
    id: "create-deck",
    icon: FileStack,
    title: "Criar Novo Deck",
    description: "Ao fazer upload de um arquivo ou inserir texto para criar flashcards ou quiz",
    example: "Upload de PDF → Gera 10 flashcards",
    impact: "1 geração"
  },
  {
    id: "add-flashcards",
    icon: FilePlus2,
    title: "Adicionar Flashcards",
    description: "Quando você adiciona mais flashcards a um deck existente",
    example: "Adicionar +5 flashcards ao deck",
    impact: "1 geração"
  },
  {
    id: "add-questions",
    icon: ListChecks,
    title: "Adicionar Perguntas ao Quiz",
    description: "Ao expandir um quiz com novas perguntas geradas pela IA",
    example: "Adicionar +3 perguntas ao quiz",
    impact: "1 geração"
  },
  {
    id: "generate-quiz",
    icon: CircleHelp,
    title: "Criar Quiz para Deck",
    description: "Quando você gera um quiz pela primeira vez em um deck que só tinha flashcards",
    example: "Criar quiz com 10 perguntas",
    impact: "1 geração"
  },
  {
    id: "generate-flashcards",
    icon: Layers,
    title: "Criar Flashcards para Deck",
    description: "Quando você gera flashcards pela primeira vez em um deck que só tinha quiz",
    example: "Criar 10 flashcards",
    impact: "1 geração"
  }
];

const freeActions = [
  {
    icon: Play,
    title: "Estudar com Flashcards",
    description: "Revisar e estudar flashcards existentes não consome gerações"
  },
  {
    icon: ListChecks,
    title: "Fazer Quizzes",
    description: "Responder quizzes já criados é ilimitado"
  },
  {
    icon: Layers,
    title: "Editar Conteúdo",
    description: "Editar flashcards e organizar seus decks não gasta limite"
  }
];

export default function AIUsagePage() {
  const { limitInfo, loading } = useGenerationLimit();
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);

  const percentage = limitInfo ? (limitInfo.used / limitInfo.limit) * 100 : 0;
  
  const getStatusColor = () => {
    if (percentage >= 90) return "text-red-500 dark:text-red-400";
    if (percentage >= 70) return "text-orange-500 dark:text-orange-400";
    return "text-primary";
  };

  const getProgressColor = () => {
    if (percentage >= 90) return "[&>div]:bg-red-500 dark:[&>div]:bg-red-400";
    if (percentage >= 70) return "[&>div]:bg-orange-500 dark:[&>div]:bg-orange-400";
    return "[&>div]:bg-primary";
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary/20">
            <Cpu className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Consumo de IA</h1>
            <p className="text-sm text-muted-foreground">
              Entenda como funcionam as gerações com Inteligência Artificial
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                Seu Consumo Atual
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : limitInfo ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Gerações utilizadas hoje</span>
                    <span className={cn("font-semibold", getStatusColor())}>
                      {limitInfo.used} de {limitInfo.limit}
                    </span>
                  </div>
                  <Progress value={percentage} className={cn("h-3", getProgressColor())} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Próximo reset</span>
                  </div>
                  <span className="text-sm font-medium">
                    em {limitInfo.hours_until_reset}h
                  </span>
                </div>

                {percentage >= 90 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        Limite quase atingido!
                      </p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
                        Você tem apenas {limitInfo.remaining} geração(ões) restante(s). Continue estudando seus decks existentes!
                      </p>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Não foi possível carregar as informações de consumo.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Como Funciona?
            </CardTitle>
            <CardDescription className="text-sm">
              Cada interação com nossa IA generativa consome 1 geração do seu limite diário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/50 dark:bg-zinc-900/50 border border-border dark:border-zinc-800">
                <p className="text-sm leading-relaxed">
                  <strong className="text-foreground">💡 Limite Diário:</strong> Você pode fazer até{" "}
                  <span className="font-bold text-primary">10 gerações por dia</span> com nossa IA.
                  Este limite é resetado automaticamente a cada 24 horas, permitindo que você continue
                  criando e expandindo seus materiais de estudo.
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  O que conta como uma geração?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique em cada item para ver mais detalhes:
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  {useCases.map((useCase, index) => {
                    const Icon = useCase.icon;
                    const isSelected = selectedUseCase === useCase.id;

                    return (
                      <motion.div
                        key={useCase.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="h-full"
                      >
                        <Card
                          className={cn(
                            "cursor-pointer transition-all duration-300 border border-border dark:border-zinc-800 hover:shadow-md hover:border-primary/50 dark:hover:border-primary/30 h-full",
                            isSelected && "border-primary dark:border-primary/70 shadow-md"
                          )}
                          onClick={() =>
                            setSelectedUseCase(isSelected ? null : useCase.id)
                          }
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-sm leading-tight font-semibold">
                                    {useCase.title}
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-1">
                                    {useCase.description}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                  {useCase.impact}
                                </Badge>
                                <ChevronRight className={cn(
                                  "w-4 h-4 text-muted-foreground transition-transform duration-300",
                                  isSelected && "rotate-90"
                                )} />
                              </div>
                            </div>
                          </CardHeader>

                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <CardContent className="pt-0 border-t border-border dark:border-zinc-800">
                                <div className="p-3 rounded-lg bg-muted/50 dark:bg-zinc-900/50 border border-border dark:border-zinc-800 mt-3">
                                  <p className="text-xs text-muted-foreground font-medium mb-1">
                                    Exemplo prático:
                                  </p>
                                  <p className="text-sm font-medium">{useCase.example}</p>
                                </div>
                              </CardContent>
                            </motion.div>
                          )}
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  O que NÃO consome gerações?
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Estas ações são ilimitadas e podem ser feitas quantas vezes quiser:
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                  {freeActions.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <motion.div
                        key={action.title}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="h-full"
                      >
                        <Card className="border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/30 h-full">
                          <CardContent className="pt-6 h-full">
                            
                            {/*
                              * ==========================================================
                              * * DOCUMENTAÇÃO DA MUDANÇA
                              * * ==========================================================
                              * * Removida: A classe `min-h-[160px]`
                              * * Motivo: Esta classe forçava uma altura mínima de 160px.
                              * Ao removê-la, o card agora terá a altura natural 
                              * do seu conteúdo + padding, ficando mais compacto.
                              * As classes `h-full` e `justify-center` foram mantidas
                              * para centrar verticalmente o conteúdo e igualar 
                              * a altura dos cards na mesma linha.
                            */}
                            <div className="flex flex-col items-center text-center space-y-3 h-full justify-center">
                              <div className="p-2.5 rounded-lg bg-green-100 dark:bg-green-900/50">
                                <Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm mb-1">
                                  {action.title}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {action.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Dicas para Aproveitar Melhor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 dark:bg-zinc-900/50 border border-border dark:border-zinc-800">
                <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">Planeje suas gerações</p>
                  <p className="text-sm text-muted-foreground">
                    Crie decks completos de uma vez. É melhor fazer 1 deck com 20 flashcards
                    do que 2 decks com 10 cada (economiza 1 geração).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 dark:bg-zinc-900/50 border border-border dark:border-zinc-800">
                <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">Priorize o estudo</p>
                  <p className="text-sm text-muted-foreground">
                    Estudar com os flashcards e fazer quizzes é ilimitado. Foque em revisar
                    antes de criar novos conteúdos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 dark:bg-zinc-900/50 border border-border dark:border-zinc-800">
                <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm mb-1">Organize-se</p>
                  <p className="text-sm text-muted-foreground">
                    Use pastas para organizar seus decks. Editar e reorganizar não consome gerações!
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}