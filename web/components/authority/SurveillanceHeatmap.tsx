"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DistrictMapLayersData } from "@/lib/authority/metrics";
import { MapLayerVisibility } from "./SurveillanceHeatmapInternal";
import { MapMarkerData } from "./mapUtils";
import {
  Layers,
  MapPin,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Search,
  Crosshair,
  X,
  Stethoscope,
  Users,
  Eye,
  Home,
  ClipboardList,
  Footprints,
} from "lucide-react";
import { useTranslations } from "next-intl";

function HeatmapLoading() {
  const t = useTranslations("authority");
  return (
    <div className="h-130 sm:h-155 w-full rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex flex-col items-center justify-center text-xs text-stone-600 gap-3">
      <div className="h-7 w-7 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
      <span className="font-semibold">{t("loadingGis")}</span>
    </div>
  );
}

const DynamicHeatmap = dynamic(
  () => import("./SurveillanceHeatmapInternal"),
  {
    ssr: false,
    loading: () => <HeatmapLoading />,
  }
);

interface SurveillanceHeatmapProps {
  mapLayers?: DistrictMapLayersData;
  markers?: MapMarkerData[];
  districtName?: string;
  mapHeight?: string;
  onRefreshMap?: () => void;
}

export function SurveillanceHeatmap({
  mapLayers,
  markers,
  districtName = "District Authority Scope",
  mapHeight,
  onRefreshMap,
}: SurveillanceHeatmapProps) {
  const t = useTranslations("authority");
  const resolvedMapLayers: DistrictMapLayersData = mapLayers || {
    heatmapPoints: (markers || []).map((m) => ({
      lat: m.lat,
      lng: m.lng,
      weight: m.activeAlert ? 8 : Math.max(1, m.caseCount),
      caseCount: m.caseCount,
      riskLevel: m.activeAlert ? "CRITICAL" : m.highRiskCount > 0 ? "HIGH" : "LOW",
      locationName: m.name,
    })),
    farms: (markers || []).map((m) => ({
      id: m.id,
      name: `${m.name} Cluster`,
      villageName: m.name,
      blockName: m.blockName,
      farmerName: "Local Livestock Herd",
      lat: m.lat,
      lng: m.lng,
      animalCount: m.caseCount * 2,
      activeCaseCount: m.caseCount,
    })),
    cases: (markers || [])
      .filter((m) => m.caseCount > 0)
      .map((m) => ({
        id: `c-${m.id}`,
        caseNumber: `VIL-${m.id.slice(-4)}`,
        status: m.activeAlert ? "UNDER_EXAMINATION" : "PENDING_REVIEW",
        riskLevel: m.activeAlert ? "CRITICAL" : m.highRiskCount > 0 ? "HIGH" : "LOW",
        species: "Livestock",
        animalTag: "Monitored",
        farmName: `${m.name} Cluster`,
        villageName: m.name,
        blockName: m.blockName,
        farmerName: "Village Cluster",
        reportedAt: m.lastReportedDate || new Date().toISOString(),
        lat: m.lat,
        lng: m.lng,
      })),
    veterinarians: [],
    fieldAgents: [],
    fieldVisits: [],
    alerts: (markers || [])
      .filter((m) => m.activeAlert)
      .map((m) => ({
        id: `alert-${m.id}`,
        diseaseName: m.diseaseName || "Outbreak Alert",
        caseCount: m.caseCount,
        villageName: m.name,
        blockName: m.blockName,
        windowStart: new Date().toISOString(),
        windowEnd: new Date().toISOString(),
        active: true,
        lat: m.lat,
        lng: m.lng,
      })),
  };
  const [layers, setLayers] = useState<MapLayerVisibility>({
    heatmap: true,
    farms: true,
    cases: true,
    vets: true,
    agents: true,
    visits: true,
    alerts: true,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [userGps, setUserGps] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [focusCoord, setFocusCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; data: Record<string, unknown> } | null>(null);

  // Calculate total plotted records
  const totalFarms = resolvedMapLayers.farms.length;
  const totalCases = resolvedMapLayers.cases.length;
  const totalVets = resolvedMapLayers.veterinarians.length;
  const totalAgents = resolvedMapLayers.fieldAgents.length;
  const totalVisits = resolvedMapLayers.fieldVisits.length;
  const totalAlerts = resolvedMapLayers.alerts.length;
  const totalPoints = totalFarms + totalCases + totalVets + totalAgents + totalVisits + totalAlerts;

  // Handle User-Initiated GPS Geolocation (NEVER triggered automatically on load)
  const handleRequestUserLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserGps(coords);
        setFocusCoord(coords);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Location access was denied. Enable GPS in browser settings.");
        } else {
          setGpsError("Unable to retrieve current location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const toggleLayer = (layerKey: keyof MapLayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <Card className="liquid-glass-card rounded-3xl overflow-hidden p-0">
      {/* Top Header & Geospatial Toolbar */}
      <div className="p-6 border-b border-[#1E3A2B]/8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-base flex items-center gap-2 text-[#1E3A2B] font-bold font-display">
                <MapPin className="h-4 w-4 text-[#3F6B4A]" />
                <span>{t("gisMapTitle")}</span>
              </div>
              <Badge className="bg-[#3F6B4A]/12 text-[#1E3A2B] border border-white/60 text-[10px] font-semibold">
                {districtName}
              </Badge>
            </div>
            <p className="text-xs text-[#4A3324]/70 mt-0.5">
              {t("gisSubTitle", { count: totalPoints })}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            {/* User-Initiated GPS Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestUserLocation}
              disabled={isLocating}
              className={`h-8 px-3 text-xs rounded-full border border-white/80 gap-1.5 transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0 ${
                userGps
                  ? "bg-[#3F6B4A] border-[#3F6B4A] text-white font-semibold"
                  : "bg-white/80 text-[#1E3A2B] hover:bg-white"
              }`}
              title={t("gpsTitle")}
            >
              <Crosshair className={`h-3.5 w-3.5 ${isLocating ? "animate-spin text-[#3F6B4A]" : "text-[#1E3A2B]"}`} />
              <span>{isLocating ? t("locatingGps") : userGps ? t("gpsPinned") : t("useMyLocation")}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setUserGps(null);
                setFocusCoord(null);
                setSelectedEntity(null);
                setSearchQuery("");
                setResetCount((c) => c + 1);
                if (onRefreshMap) onRefreshMap();
              }}
              className="h-8 px-3 text-xs rounded-full border border-white/80 text-[#1E3A2B] hover:bg-white bg-white/80 gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#4A3324]/60" />
              <span>{t("resetMap")}</span>
            </Button>
          </div>
        </div>

        {gpsError && (
          <div className="p-3 rounded-2xl bg-[#C1622D]/10 border border-[#C1622D]/20 text-[#C1622D] text-xs flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-[#C1622D] shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Search & Layer Toggles Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-56 md:w-64 shrink-0">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#4A3324]/40" />
            <Input
              type="text"
              placeholder="Search locations or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8.5 pr-8 text-xs bg-white/80 border-white/80 rounded-full shadow-inner text-[#1E3A2B] placeholder:text-[#4A3324]/40 w-full"
            />
            {searchQuery && (
              <button
                suppressHydrationWarning
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Layer Filter Toggles (Unified Liquid Glass & Deep Pine) */}
          <div className="flex items-center gap-1.5 flex-wrap py-1">
            <span className="text-[11px] font-semibold text-[#4A3324]/60 flex items-center gap-1 mr-0.5 shrink-0">
              <Layers className="h-3.5 w-3.5" />
              <span>{t("layers")}</span>
            </span>

            <button
              suppressHydrationWarning
              onClick={() => toggleLayer("heatmap")}
              className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                layers.heatmap
                  ? "bg-[#1E3A2B] text-[#F4EEE1] border-[#1E3A2B] font-semibold shadow-xs"
                  : "bg-white/70 text-[#4A3324]/80 border-white/80 hover:bg-white hover:text-[#1E3A2B]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${layers.heatmap ? "bg-[#D9A441]" : "bg-stone-400"}`} />
              <span>{t("layerHeatmap")} ({resolvedMapLayers.heatmapPoints.length})</span>
            </button>

            <button
              suppressHydrationWarning
              onClick={() => toggleLayer("farms")}
              className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                layers.farms
                  ? "bg-[#1E3A2B] text-[#F4EEE1] border-[#1E3A2B] font-semibold shadow-xs"
                  : "bg-white/70 text-[#4A3324]/80 border-white/80 hover:bg-white hover:text-[#1E3A2B]"
              }`}
            >
              <Home className={`h-3 w-3 ${layers.farms ? "text-[#BDEEC5]" : "text-stone-400"}`} />
              <span>{t("layerFarms")} ({totalFarms})</span>
            </button>

            <button
              suppressHydrationWarning
              onClick={() => toggleLayer("cases")}
              className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                layers.cases
                  ? "bg-[#1E3A2B] text-[#F4EEE1] border-[#1E3A2B] font-semibold shadow-xs"
                  : "bg-white/70 text-[#4A3324]/80 border-white/80 hover:bg-white hover:text-[#1E3A2B]"
              }`}
            >
              <ClipboardList className={`h-3 w-3 ${layers.cases ? "text-[#FCA578]" : "text-stone-400"}`} />
              <span>{t("layerCases")} ({totalCases})</span>
            </button>

            <button
              suppressHydrationWarning
              onClick={() => toggleLayer("vets")}
              className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                layers.vets
                  ? "bg-[#1E3A2B] text-[#F4EEE1] border-[#1E3A2B] font-semibold shadow-xs"
                  : "bg-white/70 text-[#4A3324]/80 border-white/80 hover:bg-white hover:text-[#1E3A2B]"
              }`}
            >
              <Stethoscope className={`h-3 w-3 ${layers.vets ? "text-[#BDEEC5]" : "text-stone-400"}`} />
              <span>{t("layerVets")} ({totalVets})</span>
            </button>

            <button
              suppressHydrationWarning
              onClick={() => toggleLayer("agents")}
              className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                layers.agents
                  ? "bg-[#1E3A2B] text-[#F4EEE1] border-[#1E3A2B] font-semibold shadow-xs"
                  : "bg-white/70 text-[#4A3324]/80 border-white/80 hover:bg-white hover:text-[#1E3A2B]"
              }`}
            >
              <ShieldAlert className={`h-3 w-3 ${layers.agents ? "text-[#BDEEC5]" : "text-stone-400"}`} />
              <span>{t("layerAgents")} ({totalAgents})</span>
            </button>

            <button
              suppressHydrationWarning
              onClick={() => toggleLayer("visits")}
              className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                layers.visits
                  ? "bg-[#1E3A2B] text-[#F4EEE1] border-[#1E3A2B] font-semibold shadow-xs"
                  : "bg-white/70 text-[#4A3324]/80 border-white/80 hover:bg-white hover:text-[#1E3A2B]"
              }`}
            >
              <Footprints className={`h-3 w-3 ${layers.visits ? "text-[#BDEEC5]" : "text-stone-400"}`} />
              <span>{t("layerVisits")} ({totalVisits})</span>
            </button>

            <button
              suppressHydrationWarning
              onClick={() => toggleLayer("alerts")}
              className={`h-7 px-2.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                layers.alerts
                  ? "bg-[#1E3A2B] text-[#F4EEE1] border-[#1E3A2B] font-semibold shadow-xs"
                  : "bg-white/70 text-[#4A3324]/80 border-white/80 hover:bg-white hover:text-[#1E3A2B]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${layers.alerts ? "bg-[#C1622D] animate-pulse" : "bg-stone-400"}`} />
              <span>{t("layerAlerts")} ({totalAlerts})</span>
            </button>
          </div>
        </div>
      </div>

      <CardContent className="p-0 relative">
        {totalPoints === 0 ? (
          <div className="h-[480px] w-full flex flex-col items-center justify-center text-center p-6 bg-[#FAF8F3] space-y-3">
            <div className="h-12 w-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
              <MapPin className="h-6 w-6" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="font-bold text-stone-800 text-sm">{t("noGeoData")}</h3>
              <p className="text-xs text-stone-500">
                {t("noGeoDataDesc", { districtName })}
              </p>
            </div>
          </div>
        ) : (
          <div className={`relative ${mapHeight || "h-[480px] sm:h-[580px]"} w-full`}>
            <DynamicHeatmap
              key={resetCount}
              mapLayers={resolvedMapLayers}
              layerVisibility={layers}
              userGpsLocation={userGps}
              focusCoord={focusCoord}
              searchQuery={searchQuery}
              onSelectEntity={(type: string, data: unknown) => setSelectedEntity({ type, data: data as Record<string, unknown> })}
            />

            {/* Selected Location / Entity Inspector Drawer */}
            {selectedEntity && (
              <div className="absolute top-3 right-3 bottom-3 z-[400] w-72 sm:w-84 bg-white/98 backdrop-blur-md border border-[#E5E0D8] rounded-3xl p-4 shadow-2xl flex flex-col justify-between text-[#191F1C]">
                <div className="space-y-3 overflow-y-auto pr-1">
                  <div className="flex items-start justify-between border-b border-[#E5E0D8] pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-mono">
                        {selectedEntity.type} Inspector
                      </span>
                      <h3 className="text-sm font-bold text-[#191F1C] mt-0.5">
                        {String(selectedEntity.data.name || selectedEntity.data.caseNumber || "Entity Details")}
                      </h3>
                    </div>
                    <button
                      suppressHydrationWarning
                      onClick={() => setSelectedEntity(null)}
                      className="p-1 rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-900 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    {Object.entries(selectedEntity.data)
                      .filter(([key]) => !["id", "lat", "lng"].includes(key))
                      .map(([key, val]) => (
                        <div key={key} className="p-2 rounded-xl bg-[#FAF8F3] border border-[#E5E0D8] flex justify-between">
                          <span className="text-stone-500 capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                          <span className="font-semibold text-stone-900">{String(val || "N/A")}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E0D8]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedEntity(null)}
                    className="w-full text-xs rounded-xl border-[#D9D3C7]"
                  >
                    {t("closeInspector")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
