"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SOUND_EFFECTS,
  SOUND_STORAGE_KEY,
  type SoundEffectKey,
} from "@/lib/sound-effects";

type PlaySoundOptions = {
  volume?: number;
  playbackRate?: number;
};

type SoundContextValue = {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  playSound: (key: SoundEffectKey, options?: PlaySoundOptions) => void;
};

const SoundContext = createContext<SoundContextValue | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const audioCacheRef = useRef<Map<SoundEffectKey, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedValue = window.localStorage.getItem(SOUND_STORAGE_KEY);
    if (storedValue === "false") {
      setSoundEnabledState(false);
    }

    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SOUND_STORAGE_KEY,
      soundEnabled ? "true" : "false"
    );
  }, [hasHydrated, soundEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextCache = new Map<SoundEffectKey, HTMLAudioElement>();

    (Object.entries(SOUND_EFFECTS) as Array<[SoundEffectKey, (typeof SOUND_EFFECTS)[SoundEffectKey]]>).forEach(
      ([key, effect]) => {
        const audio = new Audio(effect.src);
        audio.preload = "auto";
        nextCache.set(key, audio);
      }
    );

    audioCacheRef.current = nextCache;

    return () => {
      audioCacheRef.current.clear();
    };
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
  }, []);

  const playSound = useCallback(
    (key: SoundEffectKey, options?: PlaySoundOptions) => {
      if (!soundEnabled || typeof window === "undefined") {
        return;
      }

      const effect = SOUND_EFFECTS[key];
      const cachedAudio = audioCacheRef.current.get(key);
      const audio = cachedAudio
        ? (cachedAudio.cloneNode() as HTMLAudioElement)
        : new Audio(effect.src);

      audio.volume = options?.volume ?? effect.volume;
      audio.playbackRate = options?.playbackRate ?? effect.playbackRate ?? 1;
      audio.currentTime = 0;

      void audio.play().catch(() => {});
    },
    [soundEnabled]
  );

  const value = useMemo<SoundContextValue>(
    () => ({
      soundEnabled,
      setSoundEnabled,
      playSound,
    }),
    [playSound, setSoundEnabled, soundEnabled]
  );

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);

  if (!context) {
    throw new Error("useSound must be used within a SoundProvider");
  }

  return context;
}
