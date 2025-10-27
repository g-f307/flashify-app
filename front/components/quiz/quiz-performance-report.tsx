// front/components/quiz/quiz-performance-report.tsx

"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CircularProgress } from '@/components/study/circular-progress';
import { StatsBadge } from '@/components/study/stats-badge';

// Função de mensagem motivacional específica para o quiz
const getQuizMotivationalMessage = (score: number) => {
    if (score >= 90) {
        return { emoji: "🏆", title: "Excelente!", subtitle: "Você dominou este quiz. Ótimo trabalho!" };
    }
    if (score >= 70) {
        return { emoji: "🎉", title: "Muito bem!", subtitle: "Ótimo resultado! Continue assim." };
    }
    if (score >= 50) {
        return { emoji: "👍", title: "Bom esforço", subtitle: "Você está no caminho certo. Continue a revisar." };
    }
    return { emoji: "📚", title: "Continue a estudar", subtitle: "A repetição é a chave. Não desista!" };
};

interface QuizPerformanceReportProps {
  score: number;
  correctAnswersCount: number;
  totalQuestions: number;
  onRestart: () => void;
  onBack: () => void;
}

export function QuizPerformanceReport({
  score,
  correctAnswersCount,
  totalQuestions,
  onRestart,
  onBack
}: QuizPerformanceReportProps) {
  
  const incorrectAnswersCount = totalQuestions - correctAnswersCount;
  const message = getQuizMotivationalMessage(score);

  return (
    <div className="min-h-screen bg-background p-4 pt-4 md:pt-8">
      <div className="max-w-4xl mx-auto">
        <Card className="border border-transparent p-6 md:p-8 lg:p-12 glow-on-hover mt-4 md:mt-8 animate-in fade-in-50 duration-500">
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
              {totalQuestions} / {totalQuestions}
            </div>
            
            <div className="w-10 h-10"></div> 
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-8 items-start">
            
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:col-span-1 flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 15 }}
                className="mb-6 flex justify-center"
              >
                <div className="relative inline-flex items-center justify-center">
                  <div className="bg-primary p-4 lg:p-5 rounded-2xl shadow-lg relative z-10">
                    <span className="text-2xl lg:text-3xl">{message.emoji}</span>
                  </div>
                </div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 text-center"
              >
                {message.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-muted-foreground text-base md:text-lg leading-relaxed text-center max-w-xs"
              >
                {message.subtitle}
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col items-center lg:col-span-1"
            >
              <h2 className="text-foreground text-lg font-semibold mb-6 text-center">
                Sua pontuação
              </h2>
              <div className="flex justify-center mb-4">
                <CircularProgress
                  percentage={score}
                  correctCount={correctAnswersCount}
                  partialCount={0} 
                  totalCount={totalQuestions}
                  size={200}
                  strokeWidth={12}
                  showPercentage={true}
                  unitLabel="perguntas" 
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col items-center lg:col-span-1"
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="flex flex-col gap-4 mb-8 w-full max-w-xs"
              >
                <StatsBadge
                  label="Corretas"
                  count={correctAnswersCount}
                  variant="success"
                  delay={0.1}
                />
                <StatsBadge
                  label="Incorretas"
                  count={incorrectAnswersCount}
                  variant="warning"
                  delay={0.2}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                className="flex flex-col gap-4 w-full max-w-xs"
              >
                <Button
                  onClick={onRestart}
                  className="w-full py-4 rounded-lg text-base font-medium shadow-lg"
                  size="lg"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                <button
                  onClick={onBack}
                  className="text-muted-foreground hover:text-foreground text-sm underline transition-colors duration-200 flex items-center justify-center gap-1 py-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Deck
                </button>
              </motion.div>
            </motion.div>
          </div>
        </Card>
      </div>
    </div>
  );
}