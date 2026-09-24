"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Stethoscope, Sparkles, CheckCircle2, ArrowRight, Eye, Camera, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function MotionWorkflowTimeline() {
  const t = useTranslations("landing.timeline");
  const tLanding = useTranslations("landing");
  const [activeStep, setActiveStep] = useState<number>(3); // Default highlighting Step 3: Vet Decision

  const steps = [
    {
      step: 1,
      title: tLanding("step1Title"),
      actor: tLanding("step1Actor"),
      tagColor: "bg-amber-50 text-amber-800 border-amber-200",
      icon: Camera,
    },
    {
      step: 2,
      title: tLanding("step2Title"),
      actor: tLanding("step2Actor"),
      tagColor: "bg-purple-50 text-purple-800 border-purple-200",
      icon: Sparkles,
    },
    {
      step: 3,
      title: tLanding("step3Title"),
      actor: tLanding("step3Actor"),
      tagColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: Stethoscope,
    },
    {
      step: 4,
      title: tLanding("step4Title"),
      actor: tLanding("step4Actor"),
      tagColor: "bg-blue-50 text-blue-800 border-blue-200",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Interactive Step Navigator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = activeStep === s.step;
          return (
            <button
              suppressHydrationWarning
              key={s.step}
              type="button"
              onClick={() => setActiveStep(s.step)}
              className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-white border-emerald-700 shadow-md ring-1 ring-emerald-700/20 -translate-y-0.5"
                  : "bg-stone-50 border-[#E5E0D8] hover:bg-white hover:border-stone-400 text-stone-600 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon className={`h-4 w-4 ${isActive ? "text-emerald-700" : "text-stone-400"}`} />
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  isActive ? "bg-emerald-100 text-emerald-800" : "bg-stone-200/70 text-stone-600"
                }`}>
                  0{s.step}
                </span>
              </div>
              <div className={`text-xs font-bold ${isActive ? "text-[#191F1C]" : "text-stone-700"}`}>{s.title}</div>
              <div className="text-[10px] text-stone-500 truncate mt-0.5">{s.actor}</div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Workflow Mockup Card */}
      <div className="rounded-3xl border border-[#E5E0D8] bg-white p-4 sm:p-6 md:p-8 shadow-sm transition-all duration-300">
        {/* Step 1: Field Evidence */}
        {activeStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
              <div>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {t("step1Badge")}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#191F1C] mt-1.5">{t("step1Title")}</h3>
              </div>
              <Badge variant="outline" className="text-stone-600 font-mono text-xs w-fit">TAG: MH-12-8492</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8]">
                <div className="font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-amber-700" />
                  <span>{t("symptomsTitle")}</span>
                </div>
                <ul className="text-stone-600 space-y-1 list-disc list-inside">
                  <li>{t("symptom1")}</li>
                  <li>{t("symptom2")}</li>
                  <li>{t("symptom3")}</li>
                </ul>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8]">
                <div className="font-semibold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-blue-700" />
                  <span>GPS & Herd Context</span>
                </div>
                <div className="text-stone-600 space-y-0.5">
                  <div>• Farm: Gauri Dairy, Khed</div>
                  <div>• Coordinates: 18.8512° N, 73.9142° E</div>
                  <div>• Herd: 12 cattle (2 symptomatic)</div>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-emerald-900 mb-1">Queue Status</div>
                  <div className="text-emerald-800 text-[11px]">Synced to Veterinary Workstation</div>
                </div>
                <Button size="sm" onClick={() => setActiveStep(2)} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 mt-2 rounded-lg gap-1">
                  <span>View AI Differential</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: AI Support */}
        {activeStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
              <div>
                <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Step 2 • AI Assistive Signal
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#191F1C] mt-1.5">Differential Probability Matrix (Advisory Only)</h3>
              </div>
              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-xs w-fit">Overall Risk: HIGH</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-2.5">
                <div className="font-bold text-stone-800">Top Differential Hypotheses</div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between font-semibold text-stone-700 mb-0.5">
                      <span>Lumpy Skin Disease (LSD)</span>
                      <span className="font-mono text-purple-700">88%</span>
                    </div>
                    <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: "88%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-semibold text-stone-700 mb-0.5">
                      <span>Bovine Papillomatosis</span>
                      <span className="font-mono text-stone-500">12%</span>
                    </div>
                    <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-stone-400 h-1.5 rounded-full" style={{ width: "12%" }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-purple-950 mb-1 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-700" />
                    <span>Clinical Assistant Note</span>
                  </div>
                  <p className="text-stone-600 text-xs leading-relaxed">
                    Lesion morphology and high fever pattern align with recent monsoon cluster reports in Pune district. Recommended for prompt clinical verification.
                  </p>
                </div>
                <Button size="sm" onClick={() => setActiveStep(3)} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8 mt-3 rounded-lg gap-1">
                  <span>Enter Veterinarian Assessment</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Vet Assessment (The Decision Authority) */}
        {activeStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Step 3 • Primary Decision Authority
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#191F1C] mt-1.5">Dr. K. S. Patil, B.V.Sc • Clinical Diagnosis</h3>
              </div>
              <Badge className="bg-emerald-700 text-white border-transparent text-xs font-bold w-fit">CONFIRMED DIAGNOSIS</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
              <div className="md:col-span-8 p-4 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8] space-y-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-emerald-700" />
                  <span className="font-bold text-[#191F1C] text-sm">Diagnosis: Suspected Lumpy Skin Disease (Moderate)</span>
                </div>
                <p className="text-stone-600 leading-relaxed">
                  Prescription: Immediate vector control with neem oil spray, isolate animal from herd, administer supportive antipyretics and wound dressing. Skin scab sample dispatched to Pune District Lab.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-md bg-white border border-[#E5E0D8] font-semibold text-stone-700">Action: ISOLATE</span>
                  <span className="px-2.5 py-1 rounded-md bg-white border border-[#E5E0D8] font-semibold text-stone-700">Sample: SKIN_SCAB</span>
                  <span className="px-2.5 py-1 rounded-md bg-white border border-[#E5E0D8] font-semibold text-stone-700">Follow-up: 48 Hours</span>
                </div>
              </div>
              <div className="md:col-span-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-emerald-950 mb-1">Clinical Authority Rule</div>
                  <p className="text-emerald-900 text-[11px] leading-relaxed">
                    AI differential is purely assistive. The registered veterinary practitioner confirms diagnosis and authorizes medical protocols.
                  </p>
                </div>
                <Button size="sm" onClick={() => setActiveStep(4)} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs h-8 mt-3 rounded-lg gap-1">
                  <span>View Follow-up Tracker</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Lab & Follow-up */}
        {activeStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E0D8] pb-3">
              <div>
                <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Step 4 • Lab & Village Follow-up
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#191F1C] mt-1.5">Lab Verification & Surveillance Continuity</h3>
              </div>
              <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-xs w-fit">PCR Test Dispatched</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8]">
                <div className="font-semibold text-stone-700 mb-1">Diagnostic Sample</div>
                <div className="text-stone-600 space-y-0.5">
                  <div>• Specimen: Skin Scab (LSD-PCR)</div>
                  <div>• Lab: Pune District Vet Poly-Clinic</div>
                  <div>• Status: IN_TRANSIT</div>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8]">
                <div className="font-semibold text-stone-700 mb-1">Pashusakhi Follow-up</div>
                <div className="text-stone-600 space-y-0.5">
                  <div>• Assigned: Sunita Tai (Pashusakhi)</div>
                  <div>• Next Visit: Tomorrow, 9:30 AM</div>
                  <div>• Checklist: Fever check, wound log</div>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-blue-950 mb-1">District Alert Trigger</div>
                  <div className="text-blue-900 text-[11px]">Geo-fenced cluster monitoring activated in Khed block.</div>
                </div>
                <Button size="sm" onClick={() => setActiveStep(1)} variant="outline" className="w-full bg-white border-blue-300 text-blue-900 text-xs h-8 mt-2 rounded-lg gap-1">
                  <span>Restart Flow from Step 1</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
