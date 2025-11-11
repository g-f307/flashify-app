// front/components/study/performance-report.tsx
"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CircularProgress } from './circular-progress';
import { StatsBadge } from './stats-badge';
import { AddContentModal } from './add-content-modal';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { 
  PerformanceStats, 
  getMotivationalMessage, 
  getActionRecommendations 
} from '@/lib/performance-utils';

interface PerformanceReportResponsiveProps {
  stats: PerformanceStats;
  totalCards: number;
  documentId: number;
  onRestart: () => void;
  onContinueReview: () => void;
  onPracticeQuestions: () => void;
  onBack: () => void;
  onContentAdded?: () => void;
}

const MAX_FLASHCARDS = 20;

export function PerformanceReportResponsive({
  stats,
  totalCards,
  documentId,
  onRestart,
  onContinueReview,
  onPracticeQuestions,
  onBack,
  onContentAdded
}: PerformanceReportResponsiveProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const message = getMotivationalMessage(stats.performanceLevel, stats.accuracyPercentage);
  const recommendations = getActionRecommendations(stats);

  const canAddMore = totalCards < MAX_FLASHCARDS;

  const handleAddFlashcards = async (quantity: number, difficulty: string) => {
    setIsAdding(true);
    try {
      await apiClient.addFlashcardsToDocument(documentId, quantity, difficulty);
      toast.success(`${quantity} novos flashcards foram adicionados!`);
      setIsAddModalOpen(false);
      
      if (onContentAdded) {
        onContentAdded();
      }
    } catch (error: any) {
      toast.error("Erro ao adicionar flashcards", {
        description: error.message
      });
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background p-4 pt-4 md:pt-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 md:p-8 lg:p-12 glow-on-hover mt-4 md:mt-8">
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
              
              <div className="w-10 h-10"></div> 
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
              
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center lg:col-span-1 flex flex-col items-center"
              >
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
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-secondary rounded-full opacity-80"></div>
                    <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-primary rounded-full opacity-60"></div>
                    <div className="absolute top-3 -left-2 w-2 h-2 bg-secondary rounded-full opacity-70"></div>
                    <div className="absolute -top-1 left-4 w-2 h-2 bg-primary rounded-full opacity-80"></div>
                    
                    <div className="bg-primary p-4 lg:p-5 rounded-2xl shadow-lg relative z-10">
                      <span className="text-2xl lg:text-3xl">{message.emoji}</span>
                    </div>
                    
                    <div className="absolute -bottom-2 right-1 w-3 h-3 bg-secondary rounded-full opacity-60"></div>
                    <div className="absolute top-1 right-3 w-2 h-2 bg-primary rounded-full opacity-70"></div>
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

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  className="flex flex-col gap-4 w-full max-w-xs"
                >
                  {recommendations.showReviewOption && (
                    <Button
                      onClick={onContinueReview}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-lg text-base font-medium shadow-lg glow-on-hover whitespace-normal break-words text-balance"
                      size="lg"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {recommendations.secondaryAction}
                    </Button>
                  )}

                  {canAddMore && (
                    <Button
                      onClick={() => setIsAddModalOpen(true)}
                      className="w-full bg-cyan-400 hover:bg-cyan-500 text-gray-900 py-4 rounded-lg text-base font-medium shadow-lg hover:shadow-cyan-400/50 transition-all duration-300"
                      size="lg"
                      disabled={isAdding}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Mais Flashcards
                    </Button>
                  )}

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

      <AddContentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onConfirm={handleAddFlashcards}
        contentType="flashcards"
        currentCount={totalCards}
        maxLimit={MAX_FLASHCARDS}
      />
    </>
  );
}