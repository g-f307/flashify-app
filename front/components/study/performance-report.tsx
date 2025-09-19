"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, BookOpen, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CircularProgress } from './circular-progress';
import { StatsBadge } from './stats-badge';
import { 
  PerformanceStats, 
  MotivationalMessage, 
  getMotivationalMessage, 
  getActionRecommendations 
} from '@/lib/performance-utils';

interface PerformanceReportResponsiveProps {
  stats: PerformanceStats;
  totalCards: number;
  onRestart: () => void;
  onContinueReview: () => void;
  onPracticeQuestions: () => void;
  onBack: () => void;
}

export function PerformanceReportResponsive({
  stats,
  totalCards,
  onRestart,
  onContinueReview,
  onPracticeQuestions,
  onBack
}: PerformanceReportResponsiveProps) {
  const message = getMotivationalMessage(stats.performanceLevel, stats.accuracyPercentage);
  const recommendations = getActionRecommendations(stats);

  return (
    <div className="min-h-screen bg-background">
      {/* Container principal que considera a sidebar */}
      <div className="lg:ml-64 p-4 pt-4 md:pt-8">
        <div className="max-w-4xl mx-auto">
          {/* Card principal do relatório - centralizado na área principal */}
          <Card className="p-6 md:p-8 lg:p-12 glow-on-hover mt-4 md:mt-8">
            {/* Header integrado com botão de voltar e contador */}
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <Button
                onClick={onBack}
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="text-muted-foreground text-sm font-medium">
                {totalCards} / {totalCards}
              </div>
              
              <div className="w-10 h-10"></div> {/* Spacer para centralizar */}
            </div>

            {/* Layout melhorado - ícone centralizado acima da frase motivacional */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
              
              {/* Coluna esquerda - Cabeçalho motivacional com ícone centralizado acima */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center lg:col-span-1 flex flex-col items-center"
              >
                {/* Ícone decorativo - centralizado acima do texto */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    duration: 0.6,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }}
                  className="mb-6 flex justify-center"
                >
                  <div className="relative inline-flex items-center justify-center">
                    {/* Elementos decorativos usando cores do sistema */}
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-secondary rounded-full opacity-80"></div>
                    <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-primary rounded-full opacity-60"></div>
                    <div className="absolute top-3 -left-2 w-2 h-2 bg-secondary rounded-full opacity-70"></div>
                    <div className="absolute -top-1 left-4 w-2 h-2 bg-primary rounded-full opacity-80"></div>
                    
                    {/* Ícone principal com cor primária - tamanho maior para desktop */}
                    <div className="bg-primary p-4 lg:p-5 rounded-2xl shadow-lg relative z-10">
                      <span className="text-2xl lg:text-3xl">{message.emoji}</span>
                    </div>
                    
                    {/* Elementos decorativos adicionais */}
                    <div className="absolute -bottom-2 right-1 w-3 h-3 bg-secondary rounded-full opacity-60"></div>
                    <div className="absolute top-1 right-3 w-2 h-2 bg-primary rounded-full opacity-70"></div>
                  </div>
                </motion.div>

                {/* Título principal - centralizado */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 text-center"
                >
                  {message.title}
                </motion.h1>

                {/* Subtítulo - centralizado */}
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="text-muted-foreground text-base md:text-lg leading-relaxed text-center max-w-xs"
                >
                  {message.subtitle}
                </motion.p>
              </motion.div>

              {/* Coluna central - Progresso circular */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col items-center lg:col-span-1"
              >
                <h2 className="text-foreground text-lg font-semibold mb-6 text-center">
                  Seu progresso
                </h2>
                
                <div className="flex justify-center mb-4">
                  <CircularProgress
                    percentage={stats.accuracyPercentage}
                    correctCount={stats.correctCards}
                    partialCount={stats.partialCards}
                    totalCount={stats.totalCards}
                    size={200}
                    strokeWidth={12}
                  />
                </div>
              </motion.div>

              {/* Coluna direita - Estatísticas e ações */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-col items-center lg:col-span-1"
              >
                {/* Estatísticas */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="flex flex-col gap-4 mb-8 w-full max-w-xs"
                >
                  <StatsBadge
                    label="Sabe"
                    count={stats.correctCards}
                    variant="success"
                    delay={0.1}
                  />
                  <StatsBadge
                    label="Ainda aprendendo"
                    count={stats.partialCards + stats.incorrectCards}
                    variant="warning"
                    delay={0.2}
                  />
                </motion.div>

                {/* Botões de ação - organizados verticalmente */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  className="flex flex-col gap-4 w-full max-w-xs"
                >
                  {/* Botão de revisar cards (se disponível) */}
                  {recommendations.showReviewOption && (
                    <Button
                      onClick={onContinueReview}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-lg text-base font-medium shadow-lg glow-on-hover"
                      size="lg"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {recommendations.secondaryAction}
                    </Button>
                  )}

                  {/* Link de reiniciar */}
                  <button
                    onClick={onRestart}
                    className="text-muted-foreground hover:text-foreground text-sm underline transition-colors duration-200 flex items-center justify-center gap-1 py-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reiniciar Deck
                  </button>
                </motion.div>
              </motion.div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}