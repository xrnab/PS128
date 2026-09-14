"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FarmerProfileData,
  updateFarmerProfileAction,
} from "@/lib/actions/farmer";
import { getBlocks, getVillages } from "@/lib/actions/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Globe,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  X,
  ShieldCheck,
  Calendar,
  Info,
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

interface FarmerProfileViewProps {
  initialProfile: FarmerProfileData;
  districts: DistrictOption[];
}

import { useTranslations } from "next-intl";

export function FarmerProfileView({
  initialProfile,
  districts,
}: FarmerProfileViewProps) {
  const t = useTranslations("farmer");
  const router = useRouter();
  const [profile, setProfile] = useState<FarmerProfileData>(initialProfile);
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

  const primaryFarm = initialProfile.farms[0] || null;
  const [primaryFarmName, setPrimaryFarmName] = useState<string>(
    primaryFarm ? primaryFarm.name : ""
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
          if (active) setBlocks(loadedBlocks);
        } catch (err) {
          console.error("Failed to load initial blocks:", err);
        } finally {
          if (active) setLoadingBlocks(false);
        }
      }

      if (initialProfile.blockId) {
        setLoadingVillages(true);
        try {
          const loadedVillages = await getVillages(initialProfile.blockId);
          if (active) setVillages(loadedVillages);
        } catch (err) {
          console.error("Failed to load initial villages:", err);
        } finally {
          if (active) setLoadingVillages(false);
        }
      }
    }

    loadInitialLocations();
    return () => {
      active = false;
    };
  }, [initialProfile.districtId, initialProfile.blockId]);

  const handleDistrictChange = async (distId: string) => {
    setSelectedDistrictId(distId);
    setSelectedBlockId("");
    setSelectedVillageId("");
    setVillages([]);

    if (!distId) {
      setBlocks([]);
      return;
    }

    setLoadingBlocks(true);
    try {
      const data = await getBlocks(distId);
      setBlocks(data);
      if (data.length > 0) {
        setSelectedBlockId(data[0].id);
        setLoadingVillages(true);
        const villData = await getVillages(data[0].id);
        setVillages(villData);
        if (villData.length > 0) {
          setSelectedVillageId(villData[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load blocks:", err);
    } finally {
      setLoadingBlocks(false);
      setLoadingVillages(false);
    }
  };

  const handleBlockChange = async (blkId: string) => {
    setSelectedBlockId(blkId);
    setSelectedVillageId("");

    if (!blkId) {
      setVillages([]);
      return;
    }

    setLoadingVillages(true);
    try {
      const data = await getVillages(blkId);
      setVillages(data);
      if (data.length > 0) {
        setSelectedVillageId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load villages:", err);
    } finally {
      setLoadingVillages(false);
    }
  };

  const handleCancelEdit = () => {
    setName(profile.name);
    setPhone(profile.phone);
    setPreferredLanguage((profile.preferredLanguage as "en" | "hi" | "mr" | "bn") || "en");
    setSelectedDistrictId(profile.districtId || "");
    setSelectedBlockId(profile.blockId || "");
    setSelectedVillageId(profile.villageId || "");
    setPrimaryFarmName(primaryFarm ? primaryFarm.name : "");
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage("Please enter a valid name (at least 2 characters).");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setErrorMessage("Please enter a valid 10-digit phone number.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await updateFarmerProfileAction({
        name: name.trim(),
        phone: phone.trim(),
        preferredLanguage,
        districtId: selectedDistrictId || null,
        blockId: selectedBlockId || null,
        villageId: selectedVillageId || null,
        primaryFarmId: primaryFarm?.id || null,
        primaryFarmName: primaryFarmName.trim() || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Unable to update profile. Please try again.");
      } else {
        setSuccessMessage("Profile updated successfully.");
        // Update local state to reflect changes
        const selectedDistObj = districts.find((d) => d.id === selectedDistrictId);
        const selectedBlockObj = blocks.find((b) => b.id === selectedBlockId);
        const selectedVillObj = villages.find((v) => v.id === selectedVillageId);

        setProfile((prev) => ({
          ...prev,
          name: name.trim(),
          phone: phone.trim(),
          preferredLanguage,
          districtId: selectedDistrictId || null,
          districtName: selectedDistObj?.name || prev.districtName,
          blockId: selectedBlockId || null,
          blockName: selectedBlockObj?.name || prev.blockName,
          villageId: selectedVillageId || null,
          villageName: selectedVillObj?.name || prev.villageName,
          farms: prev.farms.map((f, idx) =>
            idx === 0 && primaryFarmName.trim() ? { ...f, name: primaryFarmName.trim() } : f
          ),
        }));

        setIsEditing(false);
        router.refresh();
      }
    } catch (err: unknown) {
      console.error("[Profile Save Error]:", err);
      setErrorMessage("Unable to update profile right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const languageLabels: Record<string, string> = {
    en: "English",
    hi: "हिन्दी (Hindi)",
    mr: "मराठी (Marathi)",
    bn: "বাংলা (Bengali)",
  };

  const totalAnimals = profile.farms.reduce((acc, f) => acc + f.animalCount, 0);
  const formattedDate = formatDate(profile.createdAt);

  return (
    <div className="space-y-6">
      {/* SUCCESS / ERROR ALERTS */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-xs backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 dark:bg-red-950/40 border border-red-500/20 dark:border-red-800/50 text-red-900 dark:text-red-200 text-xs flex items-center justify-between shadow-xs backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-700 dark:text-red-400 hover:text-red-900 text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* APPLE LIQUID GLASS HERO STAGE */}
      <div className="relative p-7 sm:p-9 rounded-[32px] bg-white/80 dark:bg-[#0A1A12]/80 backdrop-blur-[24px] border border-white/80 dark:border-white/12 shadow-[0_12px_36px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#3F6B4A]/10 dark:bg-[#3F6B4A]/20 blur-3xl" />

        <div className="flex items-center gap-5 sm:gap-6 relative z-10">
          {/* Apple Circular Specular Avatar */}
          <div className="relative h-20 w-20 sm:h-22 sm:w-22 rounded-full overflow-hidden bg-gradient-to-br from-[#1E3A2B] via-[#2A4E3B] to-[#3F6B4A] dark:from-[#2A4E3B] dark:to-[#153424] text-[#F4EEE1] flex items-center justify-center font-display font-bold text-3xl shadow-[0_8px_20px_rgba(30,58,43,0.25),inset_0_1px_0_rgba(255,255,255,0.4)] border-2 border-white/90 dark:border-white/20 shrink-0">
            {profile.imageUrl ? (
              <Image
                src={profile.imageUrl}
                alt={profile.name}
                width={88}
                height={88}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span>{profile.name.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#15271E] dark:text-[#F4EEE1] font-display tracking-tight">
                {profile.name}
              </h2>
              <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[#EAF3EC] dark:bg-[#3F6B4A]/40 text-[#1E3A2B] dark:text-[#BDEEC5] border border-[#1E3A2B]/10 dark:border-white/15 shadow-2xs">
                {t("profileTitle")}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/5 dark:bg-white/10 text-stone-600 dark:text-stone-300 border border-black/5 dark:border-white/10">
                {profile.status}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-[#8EAA97] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-stone-400 dark:text-[#5C7A67]" />
              <span>Registered Member since {formattedDate}</span>
            </p>
          </div>
        </div>

        {/* Edit Button */}
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setSuccessMessage(null);
              setErrorMessage(null);
            }}
            className="px-5 py-2.5 rounded-full bg-[#1E3A2B] hover:bg-[#2A4E3B] dark:bg-white/15 dark:hover:bg-white/25 text-white text-xs font-semibold gap-2 shadow-[0_4px_16px_rgba(30,58,43,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border border-white/20 inline-flex items-center cursor-pointer transition-all hover:scale-102 active:scale-98 shrink-0 self-start md:self-auto relative z-10"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>{t("editProfile")}</span>
          </button>
        )}
      </div>

      {/* VIEW MODE */}
      {!isEditing ? (
        <div className="space-y-6">
          {/* INTEGRATED VITALS ROW (APPLE METRIC CAPSULES) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Registered Farms */}
            <div className="p-5 sm:p-6 rounded-[24px] bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_8px_24px_rgba(30,58,43,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between text-stone-500 dark:text-[#8EAA97]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {t("registeredFarms")}
                </span>
                <Building2 className="h-4 w-4 opacity-70" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-display text-[#15271E] dark:text-[#F4EEE1] mt-2">
                {profile.farms.length}
              </div>
              <span className="text-[11px] text-stone-400 dark:text-[#5C7A67] block mt-1">
                Active landholdings
              </span>
            </div>

            {/* 2. Total Livestock */}
            <div className="p-5 sm:p-6 rounded-[24px] bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_8px_24px_rgba(30,58,43,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between text-stone-500 dark:text-[#8EAA97]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {t("totalLivestock")}
                </span>
                <ShieldCheck className="h-4 w-4 text-[#2D5A3C] dark:text-[#8EE6A3]" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold font-display text-[#1E3A2B] dark:text-[#8EE6A3] mt-2">
                {totalAnimals}
              </div>
              <span className="text-[11px] text-stone-400 dark:text-[#5C7A67] block mt-1">
                Monitored herd count
              </span>
            </div>

            {/* 3. Assigned Territory */}
            <div className="p-5 sm:p-6 rounded-[24px] bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_8px_24px_rgba(30,58,43,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between text-stone-500 dark:text-[#8EAA97]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {t("assignedTerritory")}
                </span>
                <MapPin className="h-4 w-4 opacity-70" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-display text-[#15271E] dark:text-[#F4EEE1] mt-2 truncate">
                {profile.districtName || "Unassigned"}
              </div>
              <span className="text-[11px] text-[#2D5A3C] dark:text-[#BDEEC5] font-medium block mt-1">
                Veterinary jurisdiction
              </span>
            </div>

            {/* 4. Language */}
            <div className="p-5 sm:p-6 rounded-[24px] bg-white/75 dark:bg-[#0A1A12]/70 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_8px_24px_rgba(30,58,43,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-center justify-between text-stone-500 dark:text-[#8EAA97]">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {t("language")}
                </span>
                <Globe className="h-4 w-4 opacity-70" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-display text-[#15271E] dark:text-[#F4EEE1] mt-2">
                {languageLabels[profile.preferredLanguage] || profile.preferredLanguage}
              </div>
              <span className="text-[11px] text-stone-400 dark:text-[#5C7A67] block mt-1">
                Audio voice & UI
              </span>
            </div>
          </div>

          {/* DETAIL BENTO MODULES (2-COLUMN BALANCED SYSTEM) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MODULE 1: Personal Contact & Security */}
            <div className="p-6 sm:p-8 rounded-[28px] bg-white/75 dark:bg-[#0A1A12]/75 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_12px_36px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center justify-center text-[#1E3A2B] dark:text-[#8EE6A3] shadow-2xs">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#15271E] dark:text-[#F4EEE1] font-display">
                    {t("personalInformation")}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-[#8EAA97]">
                    Primary contact identity & authentication
                  </p>
                </div>
              </div>

              {/* Segmented Rows */}
              <div className="divide-y divide-black/5 dark:divide-white/8 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/8 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs text-stone-500 dark:text-[#8EAA97]">{t("fullNameLabel")}</span>
                  <span className="text-xs sm:text-sm font-semibold text-[#15271E] dark:text-[#F4EEE1]">{profile.name}</span>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs text-stone-500 dark:text-[#8EAA97]">{t("phoneLabel")}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs sm:text-sm font-medium text-[#15271E] dark:text-[#F4EEE1]">{profile.phone}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs text-stone-500 dark:text-[#8EAA97]">{t("emailLabel")}</span>
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-medium text-[#15271E] dark:text-[#F4EEE1]">
                      {profile.email || "Phone-authenticated profile"}
                    </span>
                    <span className="text-[10px] text-stone-400 dark:text-[#5C7A67] block">
                      {t("managedAuthDesc")}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs text-stone-500 dark:text-[#8EAA97]">{t("preferredLangLabel")}</span>
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                    <span className="text-xs sm:text-sm font-semibold text-[#15271E] dark:text-[#F4EEE1]">
                      {languageLabels[profile.preferredLanguage] || "English"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* MODULE 2: Administrative Jurisdiction & Farm Infrastructure */}
            <div className="p-6 sm:p-8 rounded-[28px] bg-white/75 dark:bg-[#0A1A12]/75 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_12px_36px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center justify-center text-[#B87A1E] dark:text-[#E5A93C] shadow-2xs">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#15271E] dark:text-[#F4EEE1] font-display">
                    {t("adminLocation")}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-[#8EAA97]">
                    State governance hierarchy & farm infrastructure
                  </p>
                </div>
              </div>

              {/* Cascading Geographic Breadcrumb Path */}
              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/8 space-y-3">
                <span className="text-[10px] font-bold text-stone-500 dark:text-[#8EAA97] uppercase tracking-wider block">
                  Jurisdiction Hierarchy
                </span>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#15271E] dark:text-[#F4EEE1]">
                  <span className="px-3 py-1 rounded-xl bg-white/80 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-2xs">
                    {profile.districtName || "District"}
                  </span>
                  <span className="text-stone-400">→</span>
                  <span className="px-3 py-1 rounded-xl bg-white/80 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-2xs">
                    {profile.blockName || "Block"}
                  </span>
                  <span className="text-stone-400">→</span>
                  <span className="px-3 py-1 rounded-xl bg-[#EAF3EC] dark:bg-[#3F6B4A]/30 text-[#1E3A2B] dark:text-[#BDEEC5] border border-[#1E3A2B]/10 dark:border-white/15 font-semibold shadow-2xs">
                    {profile.villageName || "Village"}
                  </span>
                </div>
              </div>

              {/* Surveillance Guarantee Banner */}
              <div className="p-4 rounded-2xl bg-[#EAF3EC]/60 dark:bg-[#072417]/60 border border-[#1E3A2B]/10 dark:border-white/10 text-xs text-[#15271E] dark:text-[#BDEEC5] space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-[#1E3A2B] dark:text-[#8EE6A3]">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>{t("surveillanceArea")}</span>
                </span>
                <p className="text-stone-600 dark:text-[#8EAA97] text-[11px]">
                  {t("serviceAreaDesc")}
                </p>
              </div>

              {/* Farm Infrastructure Sub-List */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-[#15271E] dark:text-[#F4EEE1] flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                  <span>{t("farmInfrastructure")}</span>
                </span>

                {profile.farms.length > 0 ? (
                  profile.farms.map((farm) => (
                    <div
                      key={farm.id}
                      className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/8 space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#15271E] dark:text-[#F4EEE1] text-xs">
                          {farm.name}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#EAF3EC] dark:bg-[#3F6B4A]/40 text-[#1E3A2B] dark:text-[#BDEEC5] border border-[#1E3A2B]/10 dark:border-white/15 text-[10px] font-bold">
                          {t("animalsBadge", { count: farm.animalCount })}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 dark:text-[#8EAA97] block">
                        {farm.villageName}, {farm.blockName}, {farm.districtName}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 block">
                        GPS: {farm.latitude.toFixed(4)}, {farm.longitude.toFixed(4)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/8 text-center text-stone-500 dark:text-stone-400 text-xs">
                    {t("noFarmRecorded")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* APPLE LIQUID GLASS EDIT FORM */
        <form
          onSubmit={handleSaveProfile}
          className="p-7 sm:p-9 rounded-[32px] bg-white/85 dark:bg-[#0A1A12]/85 backdrop-blur-2xl border border-white/90 dark:border-white/14 shadow-[0_16px_48px_rgba(30,58,43,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] space-y-7"
        >
          <div className="flex items-center justify-between border-b border-black/8 dark:border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center justify-center text-[#1E3A2B] dark:text-[#8EE6A3]">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#15271E] dark:text-[#F4EEE1] font-display">
                  {t("editProfile")}
                </h3>
                <p className="text-xs text-stone-500 dark:text-[#8EAA97]">
                  {t("editProfileDesc")}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#EAF3EC] dark:bg-[#3F6B4A]/40 text-[#1E3A2B] dark:text-[#BDEEC5] border border-[#1E3A2B]/10 dark:border-white/15 text-xs font-semibold">
              {t("editing")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-800 dark:text-[#F4EEE1] flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                <span>Full Name *</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t("placeholderRamesh")}
                className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/15 text-xs sm:text-sm text-[#15271E] dark:text-[#F4EEE1] rounded-xl min-h-[44px] focus:ring-2 focus:ring-[#2D5A3C]/20"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-800 dark:text-[#F4EEE1] flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                <span>Phone Number *</span>
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder={t("placeholderPhone")}
                className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/15 text-xs sm:text-sm text-[#15271E] dark:text-[#F4EEE1] rounded-xl min-h-[44px] focus:ring-2 focus:ring-[#2D5A3C]/20"
              />
            </div>

            {/* Preferred Language */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-800 dark:text-[#F4EEE1] flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                <span>{t("language")}</span>
              </Label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value as "en" | "hi" | "mr" | "bn")}
                className="w-full bg-black/5 dark:bg-[#0A1A12] border border-black/10 dark:border-white/15 text-xs sm:text-sm text-[#15271E] dark:text-[#F4EEE1] rounded-xl p-3 focus:border-[#2D5A3C] dark:focus:border-[#8EE6A3] focus:outline-none min-h-[44px]"
              >
                <option value="en">English</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="bn">বাংলা (Bengali)</option>
              </select>
            </div>

            {/* Primary Farm Name */}
            {primaryFarm && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-800 dark:text-[#F4EEE1] flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                  <span>{t("primaryFarmName")}</span>
                </Label>
                <Input
                  value={primaryFarmName}
                  onChange={(e) => setPrimaryFarmName(e.target.value)}
                  placeholder={t("placeholderPatilFarm")}
                  className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/15 text-xs sm:text-sm text-[#15271E] dark:text-[#F4EEE1] rounded-xl min-h-[44px] focus:ring-2 focus:ring-[#2D5A3C]/20"
                />
              </div>
            )}
          </div>

          {/* Location Hierarchy Selectors */}
          <div className="p-5 sm:p-6 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/8 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/8 pb-2.5">
              <span className="text-xs font-bold text-[#15271E] dark:text-[#F4EEE1] flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                <span>{t("adminHierarchy")}</span>
              </span>
              <span className="text-[10px] text-stone-500 dark:text-[#8EAA97]">
                {t("routingDesc")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. District */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-stone-700 dark:text-[#F4EEE1]">District *</Label>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  required
                  className="w-full bg-black/5 dark:bg-[#0A1A12] border border-black/10 dark:border-white/15 text-xs sm:text-sm text-[#15271E] dark:text-[#F4EEE1] rounded-xl p-2.5 focus:border-[#2D5A3C] dark:focus:border-[#8EE6A3] focus:outline-none min-h-[40px]"
                >
                  <option value="">{t("selectDistrict")}</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Block */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-stone-700 dark:text-[#F4EEE1] flex items-center gap-1">
                  <span>{t("blockLabel")}</span>
                  {loadingBlocks && <Loader2 className="h-3 w-3 animate-spin text-[#2D5A3C] dark:text-[#8EE6A3]" />}
                </Label>
                <select
                  value={selectedBlockId}
                  onChange={(e) => handleBlockChange(e.target.value)}
                  disabled={loadingBlocks || blocks.length === 0}
                  className="w-full bg-black/5 dark:bg-[#0A1A12] border border-black/10 dark:border-white/15 text-xs sm:text-sm text-[#15271E] dark:text-[#F4EEE1] rounded-xl p-2.5 focus:border-[#2D5A3C] dark:focus:border-[#8EE6A3] focus:outline-none min-h-[40px] disabled:opacity-50"
                >
                  <option value="">{blocks.length === 0 ? "No blocks found" : t("selectBlock")}</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Village */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-stone-700 dark:text-[#F4EEE1] flex items-center gap-1">
                  <span>{t("villageLabel")}</span>
                  {loadingVillages && <Loader2 className="h-3 w-3 animate-spin text-[#2D5A3C] dark:text-[#8EE6A3]" />}
                </Label>
                <select
                  value={selectedVillageId}
                  onChange={(e) => setSelectedVillageId(e.target.value)}
                  disabled={loadingVillages || villages.length === 0}
                  className="w-full bg-black/5 dark:bg-[#0A1A12] border border-black/10 dark:border-white/15 text-xs sm:text-sm text-[#15271E] dark:text-[#F4EEE1] rounded-xl p-2.5 focus:border-[#2D5A3C] dark:focus:border-[#8EE6A3] focus:outline-none min-h-[40px] disabled:opacity-50"
                >
                  <option value="">{villages.length === 0 ? "No villages found" : t("selectVillage")}</option>
                  {villages.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/30 rounded-2xl border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p>{t("modifyLocationNotice")}</p>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={submitting}
              className="h-10 px-5 text-xs font-semibold rounded-full border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-stone-700 dark:text-[#AECEB9] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <X className="h-3.5 w-3.5" />
              <span>{t("cancel")}</span>
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-6 text-xs font-semibold rounded-full bg-[#1E3A2B] hover:bg-[#2A4E3B] dark:bg-[#3F6B4A] dark:hover:bg-[#4E7E5A] text-white shadow-[0_4px_16px_rgba(30,58,43,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] inline-flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-102 active:scale-98"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t("savingChanges")}</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{t("saveChanges")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
