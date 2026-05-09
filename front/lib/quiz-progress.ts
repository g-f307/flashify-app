"use client";

export interface QuizProgress {
  currentQuestionIndex: number;
  totalQuestions: number;
  correctAnswersCount: number;
  questionResults: Record<number, boolean>;
  startedAt: string;
  lastUpdatedAt: string;
}

const getStorageKey = (documentId: number) => `flashify_quiz_progress_${documentId}`;

export const quizProgressManager = {
  save(documentId: number, progress: QuizProgress) {
    localStorage.setItem(getStorageKey(documentId), JSON.stringify(progress));
  },

  get(documentId: number): QuizProgress | null {
    const stored = localStorage.getItem(getStorageKey(documentId));
    if (!stored) return null;

    try {
      return JSON.parse(stored) as QuizProgress;
    } catch {
      localStorage.removeItem(getStorageKey(documentId));
      return null;
    }
  },

  clear(documentId: number) {
    localStorage.removeItem(getStorageKey(documentId));
  },
};
