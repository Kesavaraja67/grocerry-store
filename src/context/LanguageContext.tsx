"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { type BilingualString } from "@/lib/copy";

export type LanguageMode = "both" | "ta" | "en";

interface LanguageContextValue {
  mode: LanguageMode;
  setMode: (mode: LanguageMode) => void;
  /** Returns the string appropriate for the current mode.
   *  "both" = "English / Tamil", "ta" = Tamil only, "en" = English only */
  t: (s: BilingualString) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  mode: "both",
  setMode: () => {},
  t: (s) => s.en,
});

const STORAGE_KEY = "pandian-admin-lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<LanguageMode>("both");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ta" || saved === "en" || saved === "both") {
      setModeState(saved);
    }
  }, []);

  const setMode = useCallback((m: LanguageMode) => {
    setModeState(m);
    localStorage.setItem(STORAGE_KEY, m);
  }, []);

  const t = useCallback(
    (s: BilingualString): string => {
      if (mode === "ta") return s.ta;
      if (mode === "en") return s.en;
      // "both": show English primary, Tamil secondary
      return s.en;
    },
    [mode]
  );

  return (
    <LanguageContext.Provider value={{ mode, setMode, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Returns `{ mode, setMode, t }`. Must be inside <LanguageProvider>. */
export function useLang() {
  return useContext(LanguageContext);
}

/** Returns Tamil subtitle string when mode is "both" or "ta", otherwise null. */
export function useTamilSubtitle(s: BilingualString): string | null {
  const { mode } = useContext(LanguageContext);
  if (mode === "en") return null;
  return s.ta;
}

