"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BrainCircuit,
  Check,
  Clock3,
  Layers,
  ListChecks,
  RotateCcw,
  Sparkles,
  Target,
  TimerReset,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const reviewTimings = [
  {
    title: "Errei",
    flashcards: "30 minutos",
    quiz: "30 minutos",
    tone: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400",
  },
  {
    title: "Quase acertei",
    flashcards: "1 hora",
    quiz: "Não se aplica",
    tone: "border-[#FACC15]/30 bg-[#FACC15]/10 text-[#8a6400] dark:text-[#FACC15]",
  },
  {
    title: "Acertei",
    flashcards: "2 horas",
    quiz: "1 hora",
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
];

const behaviorCards = [
  {
    icon: Target,
    title: "Prioridade por dificuldade",
    description:
      "Itens errados aparecem primeiro, depois os quase acertados e, por último, os que você já domina melhor.",
  },
  {
    icon: TimerReset,
    title: "Intervalos dinâmicos",
    description:
      "Depois das primeiras revisões, o intervalo cresce conforme seu desempenho e o fator de facilidade de cada item.",
  },
  {
    icon: Sparkles,
    title: "Integração com o deck",
    description:
      "Os cards do dashboard mostram quando existem revisões pendentes antes de você entrar no estudo.",
  },
];

const tips = [
  {
    title: "Revise quando aparecer pendência",
    description:
      "A revisão inteligente funciona melhor quando você retorna nos momentos sugeridos pelo sistema.",
  },
  {
    title: "Use o feedback com honestidade",
    description:
      "Marcar 'errei', 'quase acertei' ou 'acertei' corretamente ajuda o app a calcular a próxima revisão.",
  },
  {
    title: "Não precisa revisar tudo de uma vez",
    description:
      "Priorize os itens pendentes. Eles já representam o que precisa de atenção naquele momento.",
  },
];

interface SpacedRepetitionGuideProps {
  backHref: string;
  backLabel: string;
}

export function SpacedRepetitionGuide({ backHref, backLabel }: SpacedRepetitionGuideProps) {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Link>
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-[#48cfea]/10 dark:bg-[#48cfea]/20">
            <BrainCircuit className="w-8 h-8 text-[#48cfea]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Revisão inteligente</h1>
            <p className="text-sm text-muted-foreground">
              Entenda como a repetição espaçada ajuda você a revisar no momento certo.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Como funciona?
            </CardTitle>
            <CardDescription>
              O sistema acompanha seu desempenho e agenda novas revisões para reforçar o que ainda está instável.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50 dark:bg-zinc-900/50 border border-border dark:border-zinc-800">
              <p className="text-sm leading-relaxed">
                A repetição espaçada evita que todos os conteúdos apareçam com a mesma urgência.
                Quando você interage com um flashcard ou responde um quiz, o Flashify calcula
                quando aquele item deve voltar e reorganiza o deck de acordo com a dificuldade.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {behaviorCards.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.08 }}
                    className="h-full"
                  >
                    <Card className="h-full border-border dark:border-zinc-800">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-[#48cfea]/10 dark:bg-[#48cfea]/20">
                            <Icon className="w-5 h-5 text-[#48cfea]" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold">{item.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock3 className="w-5 h-5 text-primary" />
              Quando as revisões aparecem?
            </CardTitle>
            <CardDescription>
              Estes são os primeiros intervalos usados hoje. Depois disso, o intervalo cresce conforme seu desempenho.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {reviewTimings.map((item) => (
                <Card key={item.title} className="border-border dark:border-zinc-800">
                  <CardHeader className="pb-3">
                    <Badge variant="outline" className={item.tone}>
                      {item.title}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#FACC15]/25 bg-[#FACC15]/10 p-3 dark:border-[#FACC15]/20">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Layers className="w-4 h-4 text-[#FACC15]" />
                        Flashcards
                      </div>
                      <span className="text-sm font-semibold">{item.flashcards}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#48cfea]/25 bg-[#48cfea]/10 p-3 dark:border-[#48cfea]/20">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ListChecks className="w-4 h-4 text-[#48cfea]" />
                        Quiz
                      </div>
                      <span className="text-sm font-semibold">{item.quiz}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RotateCcw className="w-5 h-5 text-primary" />
              Como usar melhor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tips.map((tip) => (
                <div
                  key={tip.title}
                  className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 dark:bg-zinc-900/50 border border-border dark:border-zinc-800"
                >
                  <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20 flex-shrink-0">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">{tip.title}</p>
                    <p className="text-sm text-muted-foreground">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            <div className="rounded-lg border border-[#48cfea]/25 bg-[#48cfea]/10 p-4 dark:border-[#48cfea]/20">
              <p className="text-sm leading-relaxed">
                Quando a revisão inteligente está desativada em um deck, o Flashify deixa de
                mostrar pendências para aquele conteúdo. Você ainda pode estudar normalmente,
                mas perde a organização automática por prioridade.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
