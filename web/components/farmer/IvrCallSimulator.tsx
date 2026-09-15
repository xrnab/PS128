"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  Send,
  Sparkles,
} from "lucide-react";
import {
  processIvrTurn,
  IvrState,
  IvrTurnResult,
} from "@/lib/actions/ivr";
import { useSpeechRecognition, mapAppLocaleToSpeechLang } from "@/lib/hooks/useSpeechRecognition";

interface TurnHistoryItem {
  id: string;
  sender: "system" | "user";
  text: string;
  options?: { key: string; label: string }[];
  result?: IvrTurnResult["result"];
}

export function IvrCallSimulator() {
  const t = useTranslations("ivr");
  const locale = useLocale();
  const isMr = locale === "mr";

  const [isPending, startTransition] = useTransition();
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const [state, setState] = useState<IvrState | null>(null);
  const [turns, setTurns] = useState<TurnHistoryItem[]>([]);
  const [currentOptions, setCurrentOptions] = useState<{ key: string; label: string }[]>([]);
  const [allowCustomInput, setAllowCustomInput] = useState<boolean>(false);
  const [customInputText, setCustomInputText] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const {
    isSupported: speechRecSupported,
    isListening,
    startListening,
    stopListening,
  } = useSpeechRecognition();

  // Scroll transcript to bottom on new turns
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTo({
        top: transcriptScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [turns, isPending]);

  // Call duration timer
  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callActive]);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Text-to-speech synthesis
  const speakText = useCallback(
    (text: string) => {
      if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isMr ? "mr-IN" : "en-IN";
      utterance.rate = 0.95; // Calm, clear pacing for farmers

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [voiceEnabled, isMr]
  );

  // Stop TTS when voice is muted or call ends
  useEffect(() => {
    if (!voiceEnabled || !callActive) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  }, [voiceEnabled, callActive]);

  // Handle a user turn (either by tapping an option key or speaking/typing)
  const submitTurn = useCallback(
    (inputVal: string, displayLabel?: string) => {
      if (!callActive || isPending) return;

      const userText = displayLabel || inputVal;
      setErrorMessage(null);
      setCustomInputText("");

      // Append user's turn
      setTurns((prev) => [
        ...prev,
        {
          id: `usr_${Date.now()}`,
          sender: "user",
          text: userText,
        },
      ]);

      startTransition(async () => {
        try {
          const res = await processIvrTurn(state, inputVal, locale);

          setTurns((prev) => [
            ...prev,
            {
              id: `sys_${Date.now()}`,
              sender: "system",
              text: res.reply,
              options: res.options,
              result: res.result,
            },
          ]);

          setCurrentOptions(res.options || []);
          setState(res.newState);
          setAllowCustomInput(Boolean(res.allowCustomInput));

          // Speak reply if voice readout is enabled
          speakText(res.reply);

          if (res.done) {
            // Call completed branch
            setAllowCustomInput(false);
          }
        } catch (err) {
          const errText = err instanceof Error ? err.message : "Unexpected error";
          setErrorMessage(errText);
          speakText(isMr ? "त्रुटी आली आहे, कृपया पुन्हा प्रयत्न करा." : "An error occurred, please try again.");
        }
      });
    },
    [callActive, isPending, state, locale, isMr, speakText]
  );

  // Start initial call
  const startCall = useCallback(() => {
    setCallActive(true);
    setTurns([]);
    setState(null);
    setErrorMessage(null);
    setAllowCustomInput(false);

    startTransition(async () => {
      try {
        const initialRes = await processIvrTurn(null, "", locale);
        setTurns([
          {
            id: `sys_${Date.now()}`,
            sender: "system",
            text: initialRes.reply,
            options: initialRes.options,
          },
        ]);
        setCurrentOptions(initialRes.options || []);
        setState(initialRes.newState);
        setAllowCustomInput(Boolean(initialRes.allowCustomInput));

        speakText(initialRes.reply);
      } catch (err) {
        const errText = err instanceof Error ? err.message : "Failed to initialize call";
        setErrorMessage(errText);
      }
    });
  }, [locale, speakText]);

  const endCall = useCallback(() => {
    setCallActive(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    if (isListening) {
      stopListening();
    }
  }, [isListening, stopListening]);

  // Voice dictation capture handler
  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening({
        locale: mapAppLocaleToSpeechLang(locale),
        onTranscript: (spokenText) => {
          if (!spokenText.trim()) return;
          stopListening();

          // Check if spoken text matches an option key or label
          const matchedOpt = currentOptions.find(
            (opt) =>
              spokenText.includes(opt.key) ||
              opt.label.toLowerCase().includes(spokenText.toLowerCase())
          );

          if (matchedOpt) {
            submitTurn(matchedOpt.key, matchedOpt.label);
          } else {
            submitTurn(spokenText.trim());
          }
        },
      });
    }
  };

  // Auto-start call on mount
  useEffect(() => {
    startCall();
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [startCall]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Call Telephony Console */}
      <div className="liquid-glass-card p-4 sm:p-6 rounded-3xl border border-white/80 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, #3F6B4A 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: "radial-gradient(circle, #D9A441 0%, transparent 70%)" }}
        />

        {/* Status Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              {callActive && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              )}
              <div
                className={`w-3 h-3 rounded-full ${
                  callActive ? "bg-emerald-600" : "bg-neutral-400"
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold tracking-wide text-neutral-800 dark:text-neutral-100">
                  {callActive ? t("callStatusActive") : t("callStatusEnded")}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200/80 dark:bg-white/10 font-mono text-neutral-600 dark:text-neutral-300">
                  {formatTimer(callDuration)}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {t("subtitle")}
              </p>
            </div>
          </div>

          {/* Call Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border ${
                voiceEnabled
                  ? "bg-white/70 dark:bg-neutral-800/70 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-neutral-200/60 dark:bg-neutral-800/50 text-neutral-500 border-transparent"
              }`}
              title={voiceEnabled ? t("mute") : t("unmute")}
              aria-label={voiceEnabled ? t("mute") : t("unmute")}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {voiceEnabled ? t("mute") : t("unmute")}
              </span>
            </button>

            {callActive ? (
              <button
                type="button"
                onClick={endCall}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                <span>{t("endCall")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startCall}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t("reconnect")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Avatar / Speaking Visualizer */}
        <div className="py-4 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Breathing outer wave when speaking */}
            {isSpeaking && (
              <div className="absolute w-24 h-24 rounded-full bg-emerald-500/20 animate-ping pointer-events-none" />
            )}
            {/* Breathing wave when listening */}
            {isListening && (
              <div className="absolute w-24 h-24 rounded-full bg-amber-500/30 animate-pulse pointer-events-none" />
            )}

            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all border-2 ${
                isSpeaking
                  ? "bg-gradient-to-br from-emerald-800 to-emerald-950 text-emerald-200 border-emerald-400 scale-105"
                  : isListening
                  ? "bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 border-amber-300 scale-105"
                  : "bg-gradient-to-br from-neutral-800 to-neutral-950 text-neutral-200 border-white/30"
              }`}
            >
              {isSpeaking ? (
                <Volume2 className="w-7 h-7 animate-pulse" />
              ) : isListening ? (
                <Mic className="w-7 h-7 animate-bounce text-amber-200" />
              ) : (
                <Phone className="w-6 h-6 text-white" />
              )}
            </div>
          </div>

          <div className="mt-2 text-center">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {isSpeaking
                ? isMr
                  ? "मैत्री व्हॉइस लाइन बोलत आहे..."
                  : "Maitri Voice speaking..."
                : isListening
                ? t("listening")
                : isPending
                ? t("processing")
                : t("speakPrompt")}
            </span>
          </div>
        </div>

        {/* Conversational Transcript / Interaction Stream */}
        <div
          ref={transcriptScrollRef}
          tabIndex={0}
          aria-label="Conversation Transcript"
          className="max-h-[380px] min-h-[220px] overflow-y-auto px-2 py-3 space-y-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        >
          {turns.map((item) => (
            <div
              key={item.id}
              className={`flex flex-col ${
                item.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  item.sender === "user"
                    ? "bg-emerald-800 text-emerald-50 rounded-br-none"
                    : "liquid-glass-card text-neutral-800 dark:text-neutral-100 rounded-bl-none border border-white/60 dark:border-white/10"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">
                  {item.sender === "user" ? (
                    <span>{isMr ? "आपण (शेतकरी)" : "You (Farmer)"}</span>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>Maitri Voice System</span>
                    </>
                  )}
                </div>
                <p className="leading-relaxed whitespace-pre-line">{item.text}</p>
              </div>

              {/* Action Result Card Embedded in the Turn */}
              {item.result && (
                <div className="mt-2 w-full max-w-[90%]">
                  {item.result.kind === "REPORT" && (
                    <div className="liquid-glass-card p-4 rounded-2xl border border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/40 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>
                          {isMr
                            ? `केस क्रमांक #${item.result.caseNumber || "नोंदवली"}`
                            : `Case Report #${item.result.caseNumber || "Filed"}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-white/60 dark:bg-black/30 border border-black/5 dark:border-white/10">
                          <span className="text-neutral-500 block">
                            {isMr ? "जोखीम पातळी" : "Risk Assessment"}
                          </span>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">
                            {item.result.riskLevel || "NORMAL"} (
                            {item.result.riskScore ?? "--"}/100)
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/60 dark:bg-black/30 border border-black/5 dark:border-white/10">
                          <span className="text-neutral-500 block">
                            {isMr ? "नियुक्त पशुवैद्यक" : "Assigned Veterinarian"}
                          </span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate block">
                            {item.result.assignedVeterinarian || "Clinical Officer"}
                          </span>
                        </div>
                      </div>
                      {item.result.advisorySummary && (
                        <div className="p-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/30 text-xs text-emerald-950 dark:text-emerald-200">
                          <span className="font-semibold block mb-0.5">
                            {isMr ? "वैद्यकीय सल्ला (Advisory):" : "Immediate Advisory:"}
                          </span>
                          {item.result.advisorySummary}
                        </div>
                      )}
                    </div>
                  )}

                  {item.result.kind === "ASSISTANCE" && (
                    <div className="liquid-glass-card p-4 rounded-2xl border border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/40 space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold text-sm">
                        <UserCheck className="w-5 h-5 text-amber-600" />
                        <span>
                          {isMr
                            ? `मदत विनंती #${item.result.requestId?.slice(0, 8) || "नोंदवली"}`
                            : `Assistance Request #${item.result.requestId?.slice(0, 8) || "Logged"}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-white/60 dark:bg-black/30 border border-black/5 dark:border-white/10">
                          <span className="text-neutral-500 block">
                            {isMr ? "फील्ड एजंट" : "Assigned Agent"}
                          </span>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                            {item.result.assignedFieldAgent || "Local Field Agent"}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/60 dark:bg-black/30 border border-black/5 dark:border-white/10">
                          <span className="text-neutral-500 block">
                            {isMr ? "मार्ग स्तर" : "Routing Tier"}
                          </span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                            {item.result.assignmentLevel || "VILLAGE"} Level
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isPending && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 italic p-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>{t("processing")}</span>
            </div>
          )}
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/40 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Persistent Bottom Safe Area Interactive Dock */}
      <div className="liquid-glass-card p-4 rounded-3xl border border-white/80 shadow-lg space-y-3">
        {/* If Custom Input Mode is Active (Option 4 / HELP_REASON_CUSTOM) */}
        {allowCustomInput && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customInputText.trim().length >= 5) {
                submitTurn(customInputText.trim());
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={customInputText}
              onChange={(e) => setCustomInputText(e.target.value)}
              placeholder={isMr ? "भेटीचे कारण टाइप करा (किमान ५ अक्षरे)..." : "Type reason description (min 5 characters)..."}
              className="flex-1 px-4 py-2.5 text-sm rounded-2xl bg-white/80 dark:bg-black/30 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={customInputText.trim().length < 5 || isPending}
              className="px-4 py-2.5 rounded-2xl bg-emerald-800 text-white hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{t("submitCustomReason")}</span>
            </button>
          </form>
        )}

        {/* Numbered Pill Tap Targets */}
        {currentOptions.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-1">
              {isMr ? "उपलब्ध पर्याय (टॅप करा किंवा क्रमांक बोला):" : "Available Options (Tap or Speak):"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={!callActive || isPending}
                  onClick={() => submitTurn(opt.key, opt.label)}
                  className="group flex items-center gap-3 p-3 text-left rounded-2xl bg-white/70 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-black/5 dark:border-white/10 shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-emerald-800 text-white font-bold flex items-center justify-center text-sm shadow-sm group-hover:bg-emerald-900 transition-colors">
                    {opt.key}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-100 flex-1 leading-snug">
                    {opt.label.replace(/^\d+\.\s*/, "")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mic & Voice Dictation Control Bar */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-black/5 dark:border-white/5">
          <div className="text-xs text-neutral-500">
            {speechRecSupported ? (
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {isListening ? t("listening") : t("speakPrompt")}
                </span>
              </span>
            ) : (
              <span className="text-[11px] text-neutral-400">
                {t("voiceNotSupported")}
              </span>
            )}
          </div>

          {speechRecSupported && callActive && (
            <button
              type="button"
              onClick={handleMicToggle}
              disabled={isPending}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
                isListening
                  ? "bg-amber-600 hover:bg-amber-700 text-white animate-pulse"
                  : "bg-emerald-800 hover:bg-emerald-900 text-white"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>{isMr ? "माइक बंद करा" : "Stop Mic"}</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>{isMr ? "बोला (माइक)" : "Speak"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
