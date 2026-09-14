"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCheck, Stethoscope, Building2, CheckCircle2, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { completeOnboardingAction } from "@/lib/actions/auth";
import { getDistricts, getBlocks, getVillages } from "@/lib/actions/geo";
import { LocationSearch, SelectedLocationData } from "@/components/geo/LocationSearch";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Locale } from "@/lib/i18n";
import { useTranslations } from "next-intl";

interface GeoItem {
  id: string;
  name: string;
}

export default function OnboardingPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { locale } = useLocale();

  const [selectedRole, setSelectedRole] = useState<"FARMER" | "FIELD_AGENT" | "VETERINARIAN" | "DISTRICT_AUTHORITY">("FARMER");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [language] = useState<Locale>(locale);

  const [districts, setDistricts] = useState<GeoItem[]>([]);
  const [blocks, setBlocks] = useState<GeoItem[]>([]);
  const [villages, setVillages] = useState<GeoItem[]>([]);

  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocationData | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load districts on mount
  useEffect(() => {
    getDistricts().then((res) => setDistricts(res));
  }, []);

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrict(districtId);
    setSelectedBlock("");
    setVillages([]);
    setSelectedVillage("");
    if (districtId) {
      getBlocks(districtId).then((res) => setBlocks(res));
    } else {
      setBlocks([]);
    }
  };

  const handleBlockChange = (blockId: string) => {
    setSelectedBlock(blockId);
    setSelectedVillage("");
    if (blockId) {
      getVillages(blockId).then((res) => setVillages(res));
    } else {
      setVillages([]);
    }
  };

  const handleLocationSearchResult = (loc: SelectedLocationData) => {
    setSelectedLocation(loc);
    if (loc.districtId) {
      setSelectedDistrict(loc.districtId);
      getBlocks(loc.districtId).then((nextBlocks) => {
        setBlocks(nextBlocks);
        if (loc.blockId) {
          setSelectedBlock(loc.blockId);
          getVillages(loc.blockId).then((nextVillages) => {
            setVillages(nextVillages);
            if (loc.villageId) {
              setSelectedVillage(loc.villageId);
            } else {
              setSelectedVillage("");
            }
          });
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (selectedRole !== "FARMER" && !selectedDistrict) {
      setErrorMessage("Please detect or select a district before submitting an officer account.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await completeOnboardingAction({
        role: selectedRole,
        name: fullName,
        phone,
        preferredLanguage: language,
        districtId: selectedDistrict || null,
        blockId: selectedBlock || null,
        villageId: selectedVillage || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to complete registration.");
        setSubmitting(false);
        return;
      }

      if (res.redirectUrl) {
        router.push(res.redirectUrl);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected server error occurred.";
      setErrorMessage(errorMsg);
      setSubmitting(false);
    }
  };

  const roles = [
    {
      id: "FARMER",
      title: "Farmer / Livestock Owner",
      badge: "Instant Access (Auto-Approved)",
      icon: UserCheck,
      description: "Ear-tag registration, symptom reporting, AI health assistant, and veterinary guidance.",
    },
    {
      id: "FIELD_AGENT",
      title: "Pashu Sakhi / Field Agent",
      badge: "Verification Required",
      icon: ShieldCheck,
      description: "Village-level farm visits, photo & GPS intake, offline field inspection, and farmer assistance.",
    },
    {
      id: "VETERINARIAN",
      title: "Veterinary Officer",
      badge: "Verification Required",
      icon: Stethoscope,
      description: "Case triage, clinical diagnosis, prescription management, and diagnostic lab sampling.",
    },
    {
      id: "DISTRICT_AUTHORITY",
      title: "District Authority / Admin",
      badge: "Verification Required",
      icon: Building2,
      description: "District disease outbreak surveillance, cluster mapping, emergency alerts, and approvals.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 space-y-8 text-[#1D1C14]">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
        <div className="text-center flex flex-col items-center gap-2">
          <Badge className="border-white/80 text-[#3F6B4A] bg-[#3F6B4A]/12 text-xs px-3.5 py-1 rounded-full font-semibold">
            {t("onboardingSetup")}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display">
            {t("selectRole")}
          </h1>
          <p className="text-[#4A3324]/75 text-xs sm:text-sm max-w-md">
            {t("onboardingDesc")}
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl border border-[#C1622D]/25 bg-[#C1622D]/10 text-[#C1622D] text-xs flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[#C1622D] flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id as "FARMER" | "FIELD_AGENT" | "VETERINARIAN" | "DISTRICT_AUTHORITY")}
                className={`relative cursor-pointer rounded-3xl border p-5 transition-all flex flex-col justify-between gap-4 ${
                  isSelected
                    ? "border-[#3F6B4A] bg-white/90 shadow-md ring-2 ring-[#3F6B4A]/25"
                    : "liquid-glass-card hover:bg-white/80"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                        isSelected
                          ? "bg-[#1E3A2B] text-white shadow-xs"
                          : "bg-white/80 text-[#3F6B4A] border border-white/80 shadow-xs"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1E3A2B] text-sm">{role.title}</h3>
                      <Badge
                        className={`text-[10px] mt-0.5 ${
                          role.id === "FARMER"
                            ? "bg-[#3F6B4A]/15 text-[#3F6B4A] border border-[#3F6B4A]/30 font-semibold"
                            : "bg-[#D9A441]/15 text-[#8F6612] border border-white/60 font-semibold"
                        }`}
                      >
                        {role.badge}
                      </Badge>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-[#3F6B4A] flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-[#4A3324]/75 leading-relaxed">{role.description}</p>
              </div>
            );
          })}
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit}>
          <Card className="liquid-glass-card rounded-3xl overflow-hidden p-6 space-y-6">
            <div className="border-b border-[#1E3A2B]/8 pb-4">
              <div className="text-base text-[#1E3A2B] font-bold font-display">{t("profileJurisdiction")}</div>
              <p className="text-xs text-[#4A3324]/70 mt-0.5">
                {t("profileJurisdictionDesc")}
              </p>
            </div>
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-xs text-stone-700 font-medium">Full Name *</Label>
                  <Input
                    id="name"
                    required
                    placeholder={t("fullNamePlaceholder")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-[#FAF8F3] border-[#D9D3C7] text-xs text-[#191F1C]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="phone" className="text-xs text-stone-700 font-medium">Mobile Number (SMS / Alerts) *</Label>
                  <Input
                    id="phone"
                    required
                    placeholder="+91 98220 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-[#FAF8F3] border-[#D9D3C7] text-xs text-[#191F1C]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="language" className="text-xs text-stone-700 font-medium">{t("preferredLang")}</Label>
                <select
                  id="language"
                  value="en"
                  disabled
                  className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 opacity-80 min-h-[44px]"
                >
                  <option value="en">English (Default)</option>
                </select>
              </div>

              {/* Geographic Hierarchy & Location Search */}
              <div className="border-t border-[#E5E0D8] pt-4 space-y-4">
                <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  {t("assignedJurisdiction")}
                </h4>

                <div className="space-y-4">
                  <LocationSearch
                    label="Search Operating Village / Block / District"
                    required={selectedRole !== "FARMER"}
                    value={selectedLocation}
                    onLocationSelect={handleLocationSearchResult}
                    showMapPreview={true}
                  />

                  {/* Administrative Hierarchy Dropdowns (Verified / Refined) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#E5E0D8]/60">
                    {/* District Select */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="district" className="text-xs text-stone-700">District *</Label>
                      <select
                        id="district"
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none min-h-[44px]"
                      >
                        <option value="">{t("selectDistrict")}</option>
                        {districts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Block Select */}
                    {(selectedRole === "FIELD_AGENT" || selectedRole === "VETERINARIAN") && (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="block" className="text-xs text-stone-700">{t("block")}</Label>
                        <select
                          id="block"
                          disabled={!selectedDistrict}
                          value={selectedBlock}
                          onChange={(e) => handleBlockChange(e.target.value)}
                          className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none disabled:opacity-50 min-h-[44px]"
                        >
                          <option value="">{t("selectBlock")}</option>
                          {blocks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Village Select */}
                    {selectedRole === "FIELD_AGENT" && (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="village" className="text-xs text-stone-700">{t("village")}</Label>
                        <select
                          id="village"
                          disabled={!selectedBlock}
                          value={selectedVillage}
                          onChange={(e) => setSelectedVillage(e.target.value)}
                          className="bg-[#FAF8F3] border border-[#D9D3C7] text-xs text-[#191F1C] rounded-xl p-2.5 focus:border-emerald-600 focus:outline-none disabled:opacity-50 min-h-[44px]"
                        >
                          <option value="">{t("selectVillage")}</option>
                          {villages.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center border-t border-[#1E3A2B]/8 pt-5 pb-1 gap-4">
              <span className="text-xs text-[#4A3324]/70">
                {selectedRole === "FARMER"
                  ? "Farmer accounts are activated immediately upon registration."
                  : "Officer accounts require district authority approval."}
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="gap-2 liquid-button-primary text-white text-xs font-bold px-6 py-3 rounded-full shadow-md cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-center disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("savingReg")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("completeReg")}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
