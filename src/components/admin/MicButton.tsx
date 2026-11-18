"use client";

import React, { useState, useEffect, useRef } from "react";
import { Microphone, Check, X } from "@phosphor-icons/react";
import { copy } from "@/lib/copy";
import { useLang } from "@/context/LanguageContext";

interface MicButtonProps {
  onResult: (text: string) => void;
  className?: string;
}

export function MicButton({ onResult, className = "" }: MicButtonProps) {
  const { mode } = useLang();
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [heardText, setHeardText] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
      }
    }
  }, []);

  const startListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Default to Tamil (India) or English depending on language mode
      recognition.lang = mode === "en" ? "en-IN" : "ta-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setHeardText(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setHeardText(transcript);
          onResult(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  if (!isSupported) {
    // Hide if API unavailable as per spec rule 27
    return null;
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={startListening}
        title={
          isListening
            ? "Listening... Tap to stop"
            : copy.admin.voice.tapToSearch.en
        }
        aria-label="Search by voice"
        className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
          isListening
            ? "bg-red-500 text-white animate-pulse shadow-md ring-4 ring-red-200"
            : "bg-page text-muted hover:text-leaf hover:bg-leaf-light"
        }`}
      >
        <Microphone size={18} weight={isListening ? "fill" : "bold"} />
      </button>

      {/* Heard text popover pill */}
      {heardText && !isListening && (
        <div className="absolute right-0 top-10 z-50 bg-surface border border-border shadow-lg rounded-xl px-3 py-2 flex items-center gap-2 whitespace-nowrap text-xs animate-in fade-in slide-in-from-top-1">
          <span className="text-muted font-medium">I heard:</span>
          <span className="font-bold text-ink">&ldquo;{heardText}&rdquo;</span>
          <button
            type="button"
            onClick={() => setHeardText(null)}
            className="text-muted hover:text-ink p-0.5 rounded"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

