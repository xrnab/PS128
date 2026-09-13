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
    <div className="h-[520px] sm:h-[620px] w-full rounded-2xl bg-[#FAF8F3] border border-[#E5E0D8] flex flex-col items-center justify-center text-xs text-stone-600 gap-3">
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
  onRefreshMap?: () => void;
}

export function SurveillanceHeatmap({
  mapLayers,
  markers,
  districtName = "District Authority Scope",
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
    <Card className="border-[#E5E0D8] bg-white overflow-hidden shadow-xs rounded-3xl">
      {/* Top Header & Geospatial Toolbar */}
      <CardHeader className="pb-3 border-b border-[#E5E0D8] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2 text-[#191F1C] font-bold">
                <MapPin className="h-4 w-4 text-emerald-700" />
                <span>{t("gisMapTitle")}</span>
              </CardTitle>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                {districtName}
              </Badge>
            </div>
            <CardDescription className="text-xs text-stone-500 mt-0.5">
              {t("gisSubTitle", { count: totalPoints })}
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* User-Initiated GPS Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestUserLocation}
              disabled={isLocating}
              className={`h-8 px-3 text-xs rounded-xl border-[#D9D3C7] gap-1.5 transition-all ${
                userGps
                  ? "bg-blue-50 border-blue-300 text-blue-800 font-semibold"
                  : "bg-white text-stone-700 hover:text-stone-900"
              }`}
              title={t("gpsTitle")}
            >
              <Crosshair className={`h-3.5 w-3.5 ${isLocating ? "animate-spin text-blue-600" : "text-stone-600"}`} />
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
              className="h-8 px-3 text-xs rounded-xl border-[#D9D3C7] text-stone-700 hover:text-stone-900 bg-white gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5 text-stone-500" />
              <span>{t("resetMap")}</span>
            </Button>
          </div>
        </div>

        {gpsError && (
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Search & Layer Toggles Bar */}
        {/* Search & Layer Toggles Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <Input
              type="text"
              placeholder={t("searchGisPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-[#FAF8F3] border-[#D9D3C7] rounded-xl focus:border-emerald-700 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Layer Filter Toggles (horizontally swipeable on mobile/tablet) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto -mx-1 px-1 shrink-0">
            <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1 mr-1 shrink-0">
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{t("layers")}</span>
            </span>

            <button
              onClick={() => toggleLayer("heatmap")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                layers.heatmap
                  ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                  : "bg-white text-stone-500 border-[#E5E0D8] hover:bg-stone-50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>{t("layerHeatmap")} ({resolvedMapLayers.heatmapPoints.length})</span>
            </button>

            <button
              onClick={() => toggleLayer("farms")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                layers.farms
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold"
                  : "bg-white text-stone-500 border-[#E5E0D8] hover:bg-stone-50"
              }`}
            >
              <Home className="h-3 w-3 text-emerald-700" />
              <span>{t("layerFarms")} ({totalFarms})</span>
            </button>

            <button
              onClick={() => toggleLayer("cases")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                layers.cases
                  ? "bg-red-100 text-red-900 border-red-300 font-semibold"
                  : "bg-white text-stone-500 border-[#E5E0D8] hover:bg-stone-50"
              }`}
            >
              <ClipboardList className="h-3 w-3 text-red-700" />
              <span>{t("layerCases")} ({totalCases})</span>
            </button>

            <button
              onClick={() => toggleLayer("vets")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                layers.vets
                  ? "bg-purple-100 text-purple-900 border-purple-300 font-semibold"
                  : "bg-white text-stone-500 border-[#E5E0D8] hover:bg-stone-50"
              }`}
            >
              <Stethoscope className="h-3 w-3 text-purple-700" />
              <span>{t("layerVets")} ({totalVets})</span>
            </button>

            <button
              onClick={() => toggleLayer("agents")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                layers.agents
                  ? "bg-blue-100 text-blue-900 border-blue-300 font-semibold"
                  : "bg-white text-stone-500 border-[#E5E0D8] hover:bg-stone-50"
              }`}
            >
              <ShieldAlert className="h-3 w-3 text-blue-700" />
              <span>{t("layerAgents")} ({totalAgents})</span>
            </button>

            <button
              onClick={() => toggleLayer("visits")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                layers.visits
                  ? "bg-teal-100 text-teal-900 border-teal-300 font-semibold"
                  : "bg-white text-stone-500 border-[#E5E0D8] hover:bg-stone-50"
              }`}
            >
              <Footprints className="h-3 w-3 text-teal-700" />
              <span>{t("layerVisits")} ({totalVisits})</span>
            </button>

            <button
              onClick={() => toggleLayer("alerts")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap ${
                layers.alerts
                  ? "bg-rose-100 text-rose-900 border-rose-300 font-semibold"
                  : "bg-white text-stone-500 border-[#E5E0D8] hover:bg-stone-50"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-rose-600" />
              <span>{t("layerAlerts")} ({totalAlerts})</span>
            </button>
          </div>
        </div>
      </CardHeader>

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
          <div className="relative h-[520px] sm:h-[620px] w-full">
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
