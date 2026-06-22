"use client";

export type SoundEffectKey =
  | "flashcardFlip"
  | "cardSlide"
  | "answerCorrect"
  | "answerIncorrect"
  | "sessionComplete"
  | "sessionCelebration"
  | "reward";

export type SoundEffectDefinition = {
  src: string;
  volume: number;
  playbackRate?: number;
};

export const SOUND_STORAGE_KEY = "flashify:sound-enabled";

export const SOUND_EFFECTS: Record<SoundEffectKey, SoundEffectDefinition> = {
  flashcardFlip: {
    src: "/sounds/mixkit-poker-card-flick-2002.wav",
    volume: 0.34,
  },
  cardSlide: {
    src: "/sounds/mixkit-paper-slide-1530.wav",
    volume: 0.22,
  },
  answerCorrect: {
    src: "/sounds/mixkit-correct-answer-tone-2870.wav",
    volume: 0.36,
  },
  answerIncorrect: {
    src: "/sounds/mixkit-wrong-answer-fail-notification-946.wav",
    volume: 0.3,
  },
  sessionComplete: {
    src: "/sounds/mixkit-game-level-completed-2059.wav",
    volume: 0.34,
  },
  sessionCelebration: {
    src: "/sounds/mixkit-game-success-alert-2039.wav",
    volume: 0.38,
  },
  reward: {
    src: "/sounds/mixkit-fairy-arcade-sparkle-866.wav",
    volume: 0.4,
  },
};
