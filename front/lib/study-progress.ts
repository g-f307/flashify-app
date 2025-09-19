// lib/study-progress.ts

export interface StudyProgress {
  documentId: number;
  currentCardIndex: number;
  totalCards: number;
  studiedCards: number[];
  lastStudiedAt: string;
  sessionData: {
    flashcardId: number;
    accuracy: number;
    timestamp: string;
  }[];
}

export interface StudyProgressManager {
  saveProgress: (documentId: number, progress: Partial<StudyProgress>) => void;
  getProgress: (documentId: number) => StudyProgress | null;
  clearProgress: (documentId: number) => void;
  hasProgress: (documentId: number) => boolean;
  getAllProgress: () => Record<string, StudyProgress>;
}

class LocalStorageStudyProgressManager implements StudyProgressManager {
  private getStorageKey(documentId: number): string {
    return `flashify_study_progress_${documentId}`;
  }

  saveProgress(documentId: number, progress: Partial<StudyProgress>): void {
    try {
      const existingProgress = this.getProgress(documentId);
      const updatedProgress: StudyProgress = {
        documentId,
        currentCardIndex: progress.currentCardIndex ?? existingProgress?.currentCardIndex ?? 0,
        totalCards: progress.totalCards ?? existingProgress?.totalCards ?? 0,
        studiedCards: progress.studiedCards ?? existingProgress?.studiedCards ?? [],
        lastStudiedAt: new Date().toISOString(),
        sessionData: progress.sessionData ?? existingProgress?.sessionData ?? [],
        ...progress
      };

      localStorage.setItem(
        this.getStorageKey(documentId),
        JSON.stringify(updatedProgress)
      );
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
  }

  getProgress(documentId: number): StudyProgress | null {
    try {
      const stored = localStorage.getItem(this.getStorageKey(documentId));
      if (!stored) return null;
      
      const progress = JSON.parse(stored) as StudyProgress;
      
      // Verifica se o progresso não é muito antigo (mais de 7 dias)
      const lastStudied = new Date(progress.lastStudiedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 7) {
        this.clearProgress(documentId);
        return null;
      }
      
      return progress;
    } catch (error) {
      console.error('Erro ao recuperar progresso:', error);
      return null;
    }
  }

  clearProgress(documentId: number): void {
    try {
      localStorage.removeItem(this.getStorageKey(documentId));
    } catch (error) {
      console.error('Erro ao limpar progresso:', error);
    }
  }

  hasProgress(documentId: number): boolean {
    return this.getProgress(documentId) !== null;
  }

  getAllProgress(): Record<string, StudyProgress> {
    const allProgress: Record<string, StudyProgress> = {};
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('flashify_study_progress_')) {
          const documentId = key.replace('flashify_study_progress_', '');
          const progress = this.getProgress(parseInt(documentId));
          if (progress) {
            allProgress[documentId] = progress;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao recuperar todos os progressos:', error);
    }
    
    return allProgress;
  }
}

// Instância singleton do gerenciador de progresso
export const studyProgressManager: StudyProgressManager = new LocalStorageStudyProgressManager();

// Utilitários para trabalhar com progresso
export const StudyProgressUtils = {
  /**
   * Calcula a porcentagem de progresso no deck
   */
  calculateProgressPercentage(progress: StudyProgress): number {
    if (progress.totalCards === 0) return 0;
    return Math.round((progress.currentCardIndex / progress.totalCards) * 100);
  },

  /**
   * Verifica se o deck foi completado
   */
  isCompleted(progress: StudyProgress): boolean {
    return progress.currentCardIndex >= progress.totalCards - 1;
  },

  /**
   * Formata o tempo desde a última sessão
   */
  formatTimeSinceLastStudy(progress: StudyProgress): string {
    const lastStudied = new Date(progress.lastStudiedAt);
    const now = new Date();
    const diffMs = now.getTime() - lastStudied.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'agora mesmo';
    }
  },

  /**
   * Gera uma mensagem de resumo do progresso
   */
  getProgressSummary(progress: StudyProgress): string {
    const percentage = this.calculateProgressPercentage(progress);
    const remaining = progress.totalCards - progress.currentCardIndex;
    
    if (percentage === 0) {
      return `${progress.totalCards} cards para estudar`;
    } else if (percentage >= 100) {
      return 'Deck concluído!';
    } else {
      return `${remaining} cards restantes (${percentage}% concluído)`;
    }
  }
};
