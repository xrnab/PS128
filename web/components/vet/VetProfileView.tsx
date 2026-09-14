"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  VetProfileData,
  updateVetProfileAction,
} from "@/lib/actions/vet";
import { getBlocks, getVillages } from "@/lib/actions/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  Globe,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  X,
  ShieldCheck,
  Calendar,
  Award,
} from "lucide-react";

interface DistrictOption {
  id: string;
  name: string;
}

interface BlockOption {
  id: string;
  name: string;
  districtId: string;
}

interface VillageOption {
  id: string;
  name: string;
  blockId: string;
}

interface VetProfileViewProps {
  initialProfile: VetProfileData;
  districts: DistrictOption[];
}

export function VetProfileView({
  initialProfile,
  districts,
}: VetProfileViewProps) {
  const t = useTranslations("vet");
  const router = useRouter();
  const [profile, setProfile] = useState<VetProfileData>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState(initialProfile.name);
  const [phone, setPhone] = useState(initialProfile.phone);
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "hi" | "mr" | "bn">(
    (initialProfile.preferredLanguage as "en" | "hi" | "mr" | "bn") || "en"
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(
    initialProfile.districtId || (districts.length > 0 ? districts[0].id : "")
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    initialProfile.blockId || ""
  );
  const [selectedVillageId, setSelectedVillageId] = useState<string>(
    initialProfile.villageId || ""
  );

  // Dynamic dropdown lists for Location Hierarchy
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [villages, setVillages] = useState<VillageOption[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // Initial load of blocks and villages for the current profile
  useEffect(() => {
    let active = true;
    async function loadInitialLocations() {
      if (initialProfile.districtId) {
        setLoadingBlocks(true);
        try {
          const loadedBlocks = await getBlocks(initialProfile.districtId);
          if (active) {
            setBlocks(loadedBlocks);
            if (initialProfile.blockId) {
              setLoadingVillages(true);
              const loadedVillages = await getVillages(initialProfile.blockId);
              if (active) {
                setVillages(loadedVillages);
              }
            }
          }
        } catch (e) {
          console.error("Failed to load initial blocks/villages:", e);
        } finally {
          if (active) {
            setLoadingBlocks(false);
            setLoadingVillages(false);
          }
        }
      }
    }
    loadInitialLocations();
    return () => {
      active = false;
    };
  }, [initialProfile.districtId, initialProfile.blockId]);

  // Handle District Change
  const handleDistrictChange = async (newDistrictId: string) => {
    setSelectedDistrictId(newDistrictId);
    setSelectedBlockId("");
    setSelectedVillageId("");
    setVillages([]);

    if (!newDistrictId) {
      setBlocks([]);
      return;
    }

    setLoadingBlocks(true);
    try {
      const loadedBlocks = await getBlocks(newDistrictId);
      setBlocks(loadedBlocks);
    } catch (e) {
      console.error("Failed to load blocks for district:", e);
    } finally {
      setLoadingBlocks(false);
    }
  };

  // Handle Block Change
  const handleBlockChange = async (newBlockId: string) => {
    setSelectedBlockId(newBlockId);
    setSelectedVillageId("");

    if (!newBlockId) {
      setVillages([]);
      return;
    }

    setLoadingVillages(true);
    try {
      const loadedVillages = await getVillages(newBlockId);
      setVillages(loadedVillages);
    } catch (e) {
      console.error("Failed to load villages for block:", e);
    } finally {
      setLoadingVillages(false);
    }
  };

  // Reset Edit Form
  const handleCancel = () => {
    setName(profile.name);
    setPhone(profile.phone);
    setPreferredLanguage((profile.preferredLanguage as "en" | "hi" | "mr" | "bn") || "en");
    setSelectedDistrictId(profile.districtId || (districts.length > 0 ? districts[0].id : ""));
    setSelectedBlockId(profile.blockId || "");
    setSelectedVillageId(profile.villageId || "");
    setIsEditing(false);
    setErrorMessage(null);
  };

  // Save Profile
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic Validation
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage("Please enter a valid full name (at least 2 characters).");
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid phone number (at least 10 digits).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateVetProfileAction({
        name: name.trim(),
        phone: cleanPhone,
        preferredLanguage,
        districtId: selectedDistrictId || null,
        blockId: selectedBlockId || null,
        villageId: selectedVillageId || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update profile.");
      } else {
        setSuccessMessage("Profile updated successfully.");
        setIsEditing(false);

        // Update local state
        const selectedDistObj = districts.find((d) => d.id === selectedDistrictId);
        const selectedBlockObj = blocks.find((b) => b.id === selectedBlockId);
        const selectedVillageObj = villages.find((v) => v.id === selectedVillageId);

        setProfile((prev) => ({
          ...prev,
          name: name.trim(),
          phone: cleanPhone,
          preferredLanguage,
          districtId: selectedDistrictId || null,
          districtName: selectedDistObj ? selectedDistObj.name : prev.districtName,
          blockId: selectedBlockId || null,
          blockName: selectedBlockObj ? selectedBlockObj.name : prev.blockName,
          villageId: selectedVillageId || null,
          villageName: selectedVillageObj ? selectedVillageObj.name : prev.villageName,
        }));

        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const getLanguageLabel = (code: string) => {
    switch (code) {
      case "hi":
      case "mr":
      case "bn":
        return "English";
      default:
        return "English";
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50/80 backdrop-blur-md border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 h-6 w-6 rounded-full hover:bg-red-100/50 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 text-[#1E3A2B] text-xs flex items-center justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_2px_8px_rgba(30,58,43,0.06)] animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-[#3F6B4A] shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-[#3F6B4A] hover:text-[#1E3A2B] h-6 w-6 rounded-full hover:bg-white flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary & Avatar Card */}
        <div className="space-y-6">
          <div className="liquid-glass-card rounded-3xl border border-white/80 p-6 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.8),0_16px_36px_rgba(30,58,43,0.06)] flex flex-col items-center text-center space-y-4">
            <div className="relative">
              {profile.imageUrl ? (
                <Image
                  src={profile.imageUrl}
                  alt={profile.name}
                  width={96}
                  height={96}
                  className="rounded-full border-2 border-white/90 shadow-[0_8px_20px_rgba(30,58,43,0.12)] object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/90 border border-white/95 flex items-center justify-center text-[#1E3A2B] text-2xl font-bold font-display shadow-[0_8px_20px_rgba(30,58,43,0.08)]">
                  {profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "DR"}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#1E3A2B] text-[#F4EEE1] border-2 border-white shadow-xs">
                <Stethoscope className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="space-y-1.5 w-full">
              <h2 className="text-2xl font-bold text-[#1E3A2B] tracking-tight font-display">
                {profile.name}
              </h2>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[11px] font-bold text-[#1E3A2B] tracking-wider uppercase">
                  <ShieldCheck className="h-3 w-3 text-[#3F6B4A]" />
                  {profile.role}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[11px] font-bold text-[#3F6B4A] tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3F6B4A] animate-pulse" />
                  {profile.status}
                </span>
              </div>
            </div>

            <div className="w-full rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 p-3.5 space-y-2.5 text-xs text-left shadow-2xs">
              <div className="flex items-center justify-between text-[#4A3324]/75">
                <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-[#1E3A2B]/60">
                  <Mail className="h-3.5 w-3.5 text-[#3F6B4A]" />
                  Email
                </span>
                <span className="font-semibold text-[#1E3A2B] truncate max-w-[155px]" title={profile.email || "Not linked"}>
                  {profile.email || "Not linked"}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#4A3324]/75">
                <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-[#1E3A2B]/60">
                  <Phone className="h-3.5 w-3.5 text-[#3F6B4A]" />
                  Phone
                </span>
                <span className="font-semibold text-[#1E3A2B]">{profile.phone}</span>
              </div>

              <div className="flex items-center justify-between text-[#4A3324]/75">
                <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-[#1E3A2B]/60">
                  <Globe className="h-3.5 w-3.5 text-[#3F6B4A]" />
                  Language
                </span>
                <span className="font-semibold text-[#1E3A2B]">
                  {getLanguageLabel(profile.preferredLanguage)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#4A3324]/75">
                <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-[#1E3A2B]/60">
                  <Calendar className="h-3.5 w-3.5 text-[#3F6B4A]" />
                  {t("registered")}
                </span>
                <span className="font-semibold text-[#1E3A2B]">
                  {formatDate(profile.createdAt)}
                </span>
              </div>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="h-9 w-full text-xs bg-[#1E3A2B] text-[#F4EEE1] hover:bg-[#3F6B4A] font-semibold rounded-full gap-2 shadow-[0_4px_10px_rgba(30,58,43,0.18),inset_0_1px_1px_rgba(255,255,255,0.35)] inline-flex items-center justify-center cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>{t("editProfile")}</span>
              </button>
            )}
          </div>

          {/* Clinical Activity KPI Card */}
          <div className="liquid-glass-card rounded-3xl border border-white/80 p-5 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.8),0_8px_24px_rgba(30,58,43,0.04)] space-y-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#3F6B4A] uppercase tracking-widest">
              <Award className="h-3.5 w-3.5" />
              <span>{t("clinicalRecordMetrics")}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
              <div className="p-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(30,58,43,0.03)] flex flex-col justify-between">
                <span className="text-[9px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("activeQueueMetric")}</span>
                <span className="text-2xl font-bold font-display text-[#3F6B4A] mt-1 block">
                  {profile.assignedActiveCasesCount}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(30,58,43,0.03)] flex flex-col justify-between">
                <span className="text-[9px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("reportsMetric")}</span>
                <span className="text-2xl font-bold font-display text-[#1E3A2B] mt-1 block">
                  {profile.authoredReportsCount}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(30,58,43,0.03)] flex flex-col justify-between">
                <span className="text-[9px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("reviewedMetric")}</span>
                <span className="text-2xl font-bold font-display text-[#1E3A2B] mt-1 block">
                  {profile.reviewedCasesCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed View / Edit Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="liquid-glass-card rounded-3xl border border-white/80 p-6 sm:p-7 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.8),0_16px_36px_rgba(30,58,43,0.06)] space-y-6">
            <div className="flex items-center justify-between border-b border-[#1E3A2B]/8 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#1E3A2B] font-display">
                  {isEditing ? "Edit Veterinary Profile" : "Veterinarian Account & Jurisdiction"}
                </h3>
                <p className="text-xs text-[#4A3324]/70 mt-0.5">
                  {isEditing
                    ? "Update your personal details, preferred language, and clinical service area."
                    : "Official credential details and authorized geographical service boundaries."}
                </p>
              </div>

              {isEditing && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[10px] font-bold text-[#8F6612] tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441] animate-pulse" />
                  {t("editingMode")}
                </span>
              )}
            </div>

            {isEditing ? (
              /* EDIT FORM */
              <form onSubmit={handleSave} className="space-y-6 text-xs">
                <div className="space-y-5">
                  {/* Personal Contact Details Section */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-[#3F6B4A] uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-[#3F6B4A]" />
                      <span>{t("personalContactDetailsStep")}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="vet-name" className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A2B]/70">
                          Full Name *
                        </Label>
                        <Input
                          id="vet-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={submitting}
                          placeholder="Dr. Full Name"
                          className="bg-white/80 backdrop-blur-md border-white/90 text-xs text-[#1E3A2B] rounded-2xl h-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="vet-phone" className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A2B]/70">
                          Phone Number *
                        </Label>
                        <Input
                          id="vet-phone"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={submitting}
                          placeholder="+91 9876543210"
                          className="bg-white/80 backdrop-blur-md border-white/90 text-xs text-[#1E3A2B] rounded-2xl h-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="vet-email" className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A2B]/70">
                          Email (Managed via Authentication Identity)
                        </Label>
                        <Input
                          id="vet-email"
                          value={profile.email || "No email linked"}
                          disabled
                          className="bg-white/40 border-white/60 text-xs text-[#1E3A2B]/50 rounded-2xl h-10 cursor-not-allowed shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]"
                        />
                        <p className="text-[10px] text-[#4A3324]/60">
                          {t("emailAuthDisclaimer")}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="vet-language" className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A2B]/70">
                          {t("preferredLanguageHeader")}
                        </Label>
                        <select
                          id="vet-language"
                          value={preferredLanguage}
                          onChange={(e) =>
                            setPreferredLanguage(e.target.value as "en" | "hi" | "mr" | "bn")
                          }
                          disabled={submitting}
                          className="w-full bg-white/80 backdrop-blur-md border border-white/90 text-xs text-[#1E3A2B] rounded-2xl h-10 px-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-[#1E3A2B]/20"
                        >
                          <option value="en">{t("english")}</option>
                          <option value="mr">मराठी (Marathi)</option>
                          <option value="hi">हिन्दी (Hindi)</option>
                          <option value="bn">বাংলা (Bengali)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Professional & Role Constraints Notice */}
                  <div className="p-3.5 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 text-[11px] text-[#4A3324]/80 flex items-start gap-2.5 shadow-2xs">
                    <ShieldCheck className="h-4 w-4 text-[#3F6B4A] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#1E3A2B] block font-semibold">Security & Role Authorization:</strong>
                      <span>
                        Clinical role (<span className="font-mono text-[#1E3A2B] font-bold">VETERINARIAN</span>) and account status are strictly managed by system governance and cannot be modified directly.
                      </span>
                    </div>
                  </div>

                  {/* Location & Service Jurisdiction Hierarchy */}
                  <div className="space-y-3 pt-3 border-t border-[#1E3A2B]/8">
                    <h4 className="font-bold text-[#3F6B4A] uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#3F6B4A]" />
                      <span>{t("serviceLocationJurisdictionStep")}</span>
                    </h4>
                    <p className="text-[11px] text-[#4A3324]/70">
                      {t("serviceJurisdictionDisclaimer")}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* District Selector */}
                      <div className="space-y-1.5">
                        <Label htmlFor="vet-district" className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A2B]/70">
                          District *
                        </Label>
                        <select
                          id="vet-district"
                          value={selectedDistrictId}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          disabled={submitting}
                          className="w-full bg-white/80 backdrop-blur-md border border-white/90 text-xs text-[#1E3A2B] rounded-2xl h-10 px-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-[#1E3A2B]/20"
                        >
                          <option value="">-- {t("selectDistrict")} --</option>
                          {districts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Block Selector */}
                      <div className="space-y-1.5">
                        <Label htmlFor="vet-block" className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A2B]/70 flex items-center justify-between">
                          <span>{t("blockTaluka")}</span>
                          {loadingBlocks && <Loader2 className="h-3 w-3 animate-spin text-[#3F6B4A]" />}
                        </Label>
                        <select
                          id="vet-block"
                          value={selectedBlockId}
                          onChange={(e) => handleBlockChange(e.target.value)}
                          disabled={submitting || !selectedDistrictId || loadingBlocks}
                          className="w-full bg-white/80 backdrop-blur-md border border-white/90 text-xs text-[#1E3A2B] rounded-2xl h-10 px-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-[#1E3A2B]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Select Block --</option>
                          {blocks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Village Selector */}
                      <div className="space-y-1.5">
                        <Label htmlFor="vet-village" className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A2B]/70 flex items-center justify-between">
                          <span>{t("villageLocality")}</span>
                          {loadingVillages && <Loader2 className="h-3 w-3 animate-spin text-[#3F6B4A]" />}
                        </Label>
                        <select
                          id="vet-village"
                          value={selectedVillageId}
                          onChange={(e) => setSelectedVillageId(e.target.value)}
                          disabled={submitting || !selectedBlockId || loadingVillages}
                          className="w-full bg-white/80 backdrop-blur-md border border-white/90 text-xs text-[#1E3A2B] rounded-2xl h-10 px-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-[#1E3A2B]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Select Village --</option>
                          {villages.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1E3A2B]/8">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={submitting}
                    className="h-9 px-4 text-xs font-semibold border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all"
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    <span>{t("cancel")}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-9 px-5 text-xs bg-[#1E3A2B] hover:bg-[#3F6B4A] text-[#F4EEE1] font-semibold rounded-full shadow-[0_4px_10px_rgba(30,58,43,0.18),inset_0_1px_1px_rgba(255,255,255,0.35)] inline-flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        <span>{t("saving")}</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        <span>{t("saveChanges")}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* READONLY VIEW */
              <div className="space-y-6 text-xs">
                {/* Personal Information */}
                <div className="space-y-3">
                  <h4 className="font-bold text-[#3F6B4A] uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-[#3F6B4A]" />
                    <span>{t("personalInfo")}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(30,58,43,0.03)] hover:bg-white/85 transition-all">
                      <span className="text-[10px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("fullName")}</span>
                      <span className="text-sm font-bold text-[#1E3A2B] mt-1 block font-display">{profile.name}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(30,58,43,0.03)] hover:bg-white/85 transition-all">
                      <span className="text-[10px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("primaryPhone")}</span>
                      <span className="text-sm font-bold text-[#1E3A2B] mt-1 block font-display">{profile.phone}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(30,58,43,0.03)] hover:bg-white/85 transition-all">
                      <span className="text-[10px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("emailAddress")}</span>
                      <span className="text-xs font-semibold text-[#1E3A2B] mt-1 block">
                        {profile.email || "No email linked"}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(30,58,43,0.03)] hover:bg-white/85 transition-all">
                      <span className="text-[10px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">Language Preference</span>
                      <span className="text-xs font-semibold text-[#1E3A2B] mt-1 block">
                        {getLanguageLabel(profile.preferredLanguage)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Professional & Authorization Information */}
                <div className="space-y-3 pt-4 border-t border-[#1E3A2B]/8">
                  <h4 className="font-bold text-[#3F6B4A] uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-[#3F6B4A]" />
                    <span>{t("profInfoAuth")}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(30,58,43,0.03)] hover:bg-white/85 transition-all">
                      <span className="text-[10px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("clinicalRole")}</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[11px] font-bold text-[#1E3A2B] tracking-wider uppercase">
                          <ShieldCheck className="h-3 w-3 text-[#3F6B4A]" />
                          Veterinary Medical Officer ({profile.role})
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(30,58,43,0.03)] hover:bg-white/85 transition-all">
                      <span className="text-[10px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("accountVerificationStatus")}</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[11px] font-bold text-[#3F6B4A] tracking-wider uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3F6B4A]" />
                          {profile.status}
                        </span>
                        <span className="text-xs text-[#4A3324]/70 font-medium">Authorized Clinician</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Location Jurisdiction */}
                <div className="space-y-3 pt-4 border-t border-[#1E3A2B]/8">
                  <h4 className="font-bold text-[#3F6B4A] uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#3F6B4A]" />
                    <span>{t("registeredServiceJurisdiction")}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(30,58,43,0.03)] hover:bg-white/85 transition-all">
                      <span className="text-[10px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("district")}</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#3F6B4A] shrink-0" />
                        <span className="text-sm font-bold text-[#1E3A2B] truncate font-display">
                          {profile.districtName || "Unassigned District"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(30,58,43,0.03)] hover:bg-white/85 transition-all">
                      <span className="text-[10px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("blockTaluka")}</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#3F6B4A] shrink-0" />
                        <span className="text-sm font-bold text-[#1E3A2B] truncate font-display">
                          {profile.blockName || "All District Blocks"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_6px_rgba(30,58,43,0.03)] hover:bg-white/85 transition-all">
                      <span className="text-[10px] text-[#1E3A2B]/60 font-bold uppercase tracking-wider block">{t("villageLocality")}</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#3F6B4A] shrink-0" />
                        <span className="text-sm font-bold text-[#1E3A2B] truncate font-display">
                          {profile.villageName || "Block-wide Scope"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
