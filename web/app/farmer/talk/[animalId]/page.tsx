"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Loader2, Bot, User, AlertTriangle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimalContextPacket } from "@/lib/ai/farmer-talk";

interface Message {
  role: "user" | "assistant";
  content: string;
  riskNotice?: string | null;
  suggestedNextStep?: string;
}

interface PageProps {
  params: Promise<{ animalId: string }>;
}

export default function FarmerTalkPage({ params }: PageProps) {
  const { animalId } = use(params);
  const t = useTranslations("farmer");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi" | "bn" | "mr">("en");

  // Context packet retrieved for the active animal tag
  const animalContextPacket: AnimalContextPacket = {
    animalIdentity: {
      tag: animalId,
      species: "Cow",
      breed: "Gir",
      ageMonths: 24,
    },
    location: {
      farmName: "Green Dairy Farm",
      villageName: "Bidhannagar",
      blockName: "Rajarhat",
      districtName: "North 24 Parganas",
    },
    recentCases: [
      {
        caseNumber: "CASE-2026-829995",
        status: "PENDING_REVIEW",
        reportedAt: "2026-09-12T12:26:00Z",
        symptoms: ["Skin Lesions"],
        durationDays: 3,
        affectedCount: 1,
        mortalityCount: 0,
        overallRiskLevel: "LOW",
        suspectedCondition: "No strong disease signal",
        vetDiagnosis: null,
        vetAction: null,
        sanitizedVetNotes: null,
      },
    ],
    vaccinations: [
      {
        vaccineName: "FMD Vaccine",
        dateGiven: "2026-03-15",
        nextDueDate: "2026-09-15",
      },
    ],
    treatments: [],
    samples: [],
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    const updatedHistory: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const apiHistory = updatedHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/farmer/talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animalContext: animalContextPacket,
          conversationHistory: apiHistory,
          userMessage: userText,
          preferredLanguage: language,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      setMessages([
        ...updatedHistory,
        {
          role: "assistant",
          content: data.answer,
          riskNotice: data.risk_notice,
          suggestedNextStep: data.suggested_next_step,
        },
      ]);
    } catch (err) {
      console.error("[Talk Component Error]:", err);
      setMessages([
        ...updatedHistory,
        {
          role: "assistant",
          content:
            "I am currently unable to fetch live AI advice. For clinical assistance regarding your animal, please consult your local veterinarian.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 text-[#1D1C14]">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1E3A2B]/10 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/farmer/talk">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-full border-white/80 bg-white/60 hover:bg-white text-[#1E3A2B] shadow-xs cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A2B] tracking-tight font-display">
              Maitri AI Assistant — {animalId}
            </h1>
            <p className="text-xs text-[#1D1C14]/70 mt-0.5">
              {t("informationalSupport")}
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-1 bg-white/60 backdrop-blur-md border border-white/80 rounded-full p-1 text-xs shadow-xs">
          {(["en", "hi", "bn", "mr"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1 rounded-full uppercase text-[10px] font-bold transition-all cursor-pointer ${
                language === lang
                  ? "bg-[#1E3A2B] text-white shadow-xs"
                  : "text-[#1D1C14]/70 hover:bg-white/80"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="liquid-glass-card flex flex-col rounded-3xl overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_32px_rgba(30,58,43,0.08)] min-h-[520px]">
        <div className="bg-white/40 backdrop-blur-md border-b border-[#1E3A2B]/8 py-3.5 px-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3A2B]">
            <ShieldCheck className="h-4 w-4 text-[#3F6B4A]" />
            <span>{t("clinicalGuardrailsActive")}</span>
          </div>
          <span className="text-[11px] font-medium text-[#1D1C14]/60 bg-white/60 px-3 py-1 rounded-full border border-white/70">
            {animalContextPacket.recentCases.length} Health Record(s) Linked
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 min-h-[380px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-[#1D1C14]/60">
              <div className="w-14 h-14 rounded-2xl bg-[#3F6B4A]/12 flex items-center justify-center text-[#3F6B4A] shadow-xs">
                <Bot className="h-7 w-7" />
              </div>
              <p className="text-xs max-w-sm leading-relaxed text-[#1D1C14]/70">
                Ask any question regarding health records, recent vaccinations, or general care for ear tag{" "}
                <strong className="text-[#1E3A2B]">{animalId}</strong>.
              </p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${
                  m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs shrink-0 shadow-2xs ${
                    m.role === "user" ? "bg-[#1E3A2B] text-white" : "bg-white/80 text-[#3F6B4A] border border-white/90"
                  }`}
                >
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div className="space-y-2">
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-[#1E3A2B] text-white shadow-md rounded-tr-xs"
                        : "bg-white/70 backdrop-blur-md border border-white/80 text-[#1D1C14] shadow-xs rounded-tl-xs"
                    }`}
                  >
                    {m.content}
                  </div>

                  {m.riskNotice && (
                    <div className="bg-[#C1622D]/12 border border-[#C1622D]/30 rounded-xl p-2.5 text-[11px] text-[#C1622D] flex items-start gap-1.5 font-medium">
                      <AlertTriangle className="h-4 w-4 text-[#C1622D] shrink-0 mt-0.5" />
                      <span>{m.riskNotice}</span>
                    </div>
                  )}

                  {m.suggestedNextStep && (
                    <div className="text-[10px] text-[#1D1C14]/60 font-semibold pl-1">
                      Suggested Action: <span className="text-[#3F6B4A] font-bold">{m.suggestedNextStep}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#1E3A2B] bg-white/70 backdrop-blur-md p-3 rounded-full w-fit border border-white/80 shadow-xs">
              <Loader2 className="h-4 w-4 animate-spin text-[#3F6B4A]" />
              <span>{t("checkingHealthContext")}</span>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3.5 bg-white/40 backdrop-blur-md border-t border-[#1E3A2B]/8 flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask about ${animalId}'s health or symptoms...`}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="bg-white/80 border-white/80 text-xs min-h-[44px] rounded-full px-4 focus-visible:ring-[#3F6B4A] shadow-xs"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="liquid-button-primary min-h-[44px] px-5 rounded-full shadow-md cursor-pointer"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
