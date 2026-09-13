"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { User, ShieldCheck, Stethoscope, Building2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ActiveRoleKey = "farmer" | "agent" | "vet" | "authority" | null;

export function MotionRoleEcosystem() {
  const t = useTranslations("landing.ecosystem");
  const [hoveredRole, setHoveredRole] = useState<ActiveRoleKey>(null);

  const toggleRole = (role: ActiveRoleKey) => {
    setHoveredRole((prev) => (prev === role ? null : role));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center pt-2 sm:pt-4">
      {/* Left 2 Roles: Farmer & Pashusakhi */}
      <div className="lg:col-span-4 space-y-4 sm:space-y-6">
        {/* Farmer Card */}
        <Link
          href="/farmer"
          onPointerEnter={() => setHoveredRole("farmer")}
          onPointerLeave={() => setHoveredRole(null)}
          onClick={() => toggleRole("farmer")}
          className="group block touch-target"
        >
          <div
            className={`p-4 sm:p-5 md:p-6 rounded-2xl border transition-all duration-300 ${
              hoveredRole === "farmer"
                ? "border-emerald-600 bg-white shadow-md -translate-y-0.5 sm:-translate-y-1"
                : "border-[#E5E0D8] bg-[#FAF8F3] hover:border-emerald-600/60 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                  hoveredRole === "farmer" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"
                }`}>
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#191F1C] text-base group-hover:text-emerald-800 transition-colors">
                    {t("role1Title")}
                  </h3>
                  <span className="text-[11px] text-emerald-700 font-semibold">{t("role1Sub")}</span>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 text-stone-400 transition-transform ${hoveredRole === "farmer" ? "translate-x-1 text-emerald-700" : ""}`} />
            </div>
            <p className="text-stone-600 text-xs leading-relaxed">
              {t("role1Desc")}
            </p>
          </div>
        </Link>

        {/* Field Agent / Pashusakhi Card */}
        <Link
          href="/agent"
          onPointerEnter={() => setHoveredRole("agent")}
          onPointerLeave={() => setHoveredRole(null)}
          onClick={() => toggleRole("agent")}
          className="group block touch-target"
        >
          <div
            className={`p-4 sm:p-5 md:p-6 rounded-2xl border transition-all duration-300 ${
              hoveredRole === "agent"
                ? "border-amber-600 bg-white shadow-md -translate-y-0.5 sm:-translate-y-1"
                : "border-[#E5E0D8] bg-[#FAF8F3] hover:border-amber-600/60 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-2.5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  hoveredRole === "agent" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-800"
                }`}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#191F1C] text-sm sm:text-base group-hover:text-amber-800 transition-colors">
                    {t("role2Title")}
                  </h3>
                  <span className="text-[10px] sm:text-[11px] text-amber-700 font-semibold">{t("role2Sub")}</span>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 text-stone-400 transition-transform ${hoveredRole === "agent" ? "translate-x-1 text-amber-700" : ""}`} />
            </div>
            <p className="text-stone-600 text-xs leading-relaxed">
              {t("role2Desc")}
            </p>
          </div>
        </Link>
      </div>

      {/* Central Interactive Animal Hub (The connecting focal point) */}
      <div className="lg:col-span-4 flex flex-col items-center justify-center relative my-2 sm:my-0">
        <div className="relative w-full aspect-square max-w-[260px] sm:max-w-[300px] lg:max-w-[320px] rounded-3xl overflow-hidden border-2 border-[#E5E0D8] shadow-md bg-stone-100 group transition-all duration-500 hover:shadow-xl hover:border-emerald-600">
          <Image
            src="/images/buffalo_dairy_care.jpg"
            alt="Maharashtra Dairy Buffalo at the center of care"
            fill
            className={`object-cover transition-transform duration-700 ${hoveredRole ? "scale-105" : "scale-100"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />
          
          <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 text-center">
            <Badge className="bg-white/95 text-[#191F1C] border border-[#E5E0D8] font-mono text-[10px] sm:text-[11px] px-2.5 py-0.5 mb-1.5 shadow-xs">
              TAG: MH-14-1029 • Murrah
            </Badge>
            <div className="text-white text-xs font-semibold">{t("oneAnimalRecord")}</div>
            <div className="text-stone-300 text-[10px] mt-0.5">{t("sharedStakeholders")}</div>
          </div>
        </div>

        {/* Dynamic connection indicator pill */}
        <div className={`mt-3 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-300 text-center max-w-xs ${
          hoveredRole
            ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs"
            : "bg-stone-100 text-stone-600 border-stone-200"
        }`}>
          {hoveredRole === "farmer" && t("pillFarmer")}
          {hoveredRole === "agent" && t("pillAgent")}
          {hoveredRole === "vet" && t("pillVet")}
          {hoveredRole === "authority" && t("pillAuthority")}
          {!hoveredRole && t("hoverPrompt")}
        </div>
      </div>

      {/* Right 2 Roles: Veterinarian & District Officer */}
      <div className="lg:col-span-4 space-y-4 sm:space-y-6">
        {/* Veterinarian Card */}
        <Link
          href="/vet"
          onPointerEnter={() => setHoveredRole("vet")}
          onPointerLeave={() => setHoveredRole(null)}
          onClick={() => toggleRole("vet")}
          className="group block touch-target"
        >
          <div
            className={`p-4 sm:p-5 md:p-6 rounded-2xl border transition-all duration-300 ${
              hoveredRole === "vet"
                ? "border-blue-600 bg-white shadow-md -translate-y-0.5 sm:-translate-y-1"
                : "border-[#E5E0D8] bg-[#FAF8F3] hover:border-blue-600/60 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-2.5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  hoveredRole === "vet" ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-800"
                }`}>
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#191F1C] text-sm sm:text-base group-hover:text-blue-800 transition-colors">
                    {t("role3Title")}
                  </h3>
                  <span className="text-[10px] sm:text-[11px] text-blue-700 font-semibold">{t("role3Sub")}</span>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 text-stone-400 transition-transform ${hoveredRole === "vet" ? "translate-x-1 text-blue-700" : ""}`} />
            </div>
            <p className="text-stone-600 text-xs leading-relaxed">
              {t("role3Desc")}
            </p>
          </div>
        </Link>

        {/* District Authority Card */}
        <Link
          href="/authority"
          onPointerEnter={() => setHoveredRole("authority")}
          onPointerLeave={() => setHoveredRole(null)}
          onClick={() => toggleRole("authority")}
          className="group block touch-target"
        >
          <div
            className={`p-4 sm:p-5 md:p-6 rounded-2xl border transition-all duration-300 ${
              hoveredRole === "authority"
                ? "border-purple-600 bg-white shadow-md -translate-y-0.5 sm:-translate-y-1"
                : "border-[#E5E0D8] bg-[#FAF8F3] hover:border-purple-600/60 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-2.5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  hoveredRole === "authority" ? "bg-purple-700 text-white" : "bg-purple-100 text-purple-800"
                }`}>
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#191F1C] text-sm sm:text-base group-hover:text-purple-800 transition-colors">
                    {t("role4Title")}
                  </h3>
                  <span className="text-[10px] sm:text-[11px] text-purple-700 font-semibold">{t("role4Sub")}</span>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 text-stone-400 transition-transform ${hoveredRole === "authority" ? "translate-x-1 text-purple-700" : ""}`} />
            </div>
            <p className="text-stone-600 text-xs leading-relaxed">
              {t("role4Desc")}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
