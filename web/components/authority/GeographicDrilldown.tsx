"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home, MapPin, ShieldAlert } from "lucide-react";

export interface GeoDistrict {
  id: string;
  name: string;
  blocks: Array<{
    id: string;
    name: string;
    villages: Array<{
      id: string;
      name: string;
      alerts: Array<{ id: string; diseaseName: string | null; caseCount: number }>;
      farms: Array<{
        id: string;
        name: string;
        herds: Array<{
          id: string;
          name: string;
          species: string;
          animals: Array<{
            id: string;
            tag: string;
            cases: Array<{ id: string; status: string; reportedAt: Date }>;
          }>;
        }>;
      }>;
    }>;
  }>;
}

interface GeographicDrilldownProps {
  districts: GeoDistrict[];
}

export function GeographicDrilldown({ districts }: GeographicDrilldownProps) {
  const t = useTranslations("authority");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);

  if (districts.length === 0) {
    return (
      <div className="liquid-glass-card p-8 text-center text-xs text-[#1D1C14]/60 rounded-3xl">
        {t("noGeoSurveillanceData")}
      </div>
    );
  }

  const district = districts[0];
  const selectedBlock = district.blocks.find((b) => b.id === selectedBlockId) || district.blocks[0];
  const selectedVillage = selectedBlock?.villages.find((v) => v.id === selectedVillageId) || selectedBlock?.villages[0];

  return (
    <div className="liquid-glass-card rounded-3xl overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_32px_rgba(30,58,43,0.08)]">
      <div className="p-5 sm:p-6 border-b border-[#1E3A2B]/8 bg-white/30 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#1E3A2B] flex items-center gap-2 font-display">
              <MapPin className="h-4 w-4 text-[#3F6B4A]" />
              <span>{t("geoHierarchyTitle")}</span>
            </h2>
            <p className="text-xs text-[#1D1C14]/70 mt-0.5">
              {t("geoHierarchySub")}
            </p>
          </div>

          <Badge className="text-xs font-semibold text-[#1E3A2B] border-white/80 bg-white/70 shadow-xs px-3 py-1 rounded-full w-fit">
            {t("districtBadge", { name: district.name })}
          </Badge>
        </div>

        {/* Breadcrumb Navigation Bar */}
        <div className="flex items-center gap-1.5 text-xs text-[#1D1C14]/70 mt-4 bg-white/60 p-2 rounded-2xl border border-white/80 overflow-x-auto shadow-xs">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs rounded-full font-semibold text-[#1E3A2B] hover:text-[#1E3A2B] hover:bg-white/80 cursor-pointer"
            onClick={() => {
              setSelectedBlockId(null);
              setSelectedVillageId(null);
            }}
          >
            <Home className="h-3 w-3 mr-1 text-[#3F6B4A]" />
            {district.name}
          </Button>

          {selectedBlock && (
            <>
              <ChevronRight className="h-3 w-3 text-[#1E3A2B]/40 shrink-0" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs rounded-full font-semibold text-[#1E3A2B] hover:text-[#1E3A2B] hover:bg-white/80 cursor-pointer"
                onClick={() => setSelectedVillageId(null)}
              >
                {t("blockPrefix", { name: selectedBlock.name })}
              </Button>
            </>
          )}

          {selectedVillage && (
            <>
              <ChevronRight className="h-3 w-3 text-[#1E3A2B]/40 shrink-0" />
              <span className="font-bold text-[#1E3A2B] px-2 bg-white/80 py-1 rounded-full border border-white/70 shadow-2xs">
                {t("villagePrefix", { name: selectedVillage.name })}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Block Selection Grid */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#1E3A2B] uppercase tracking-wider">{t("selectBlockSubDistrict")}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {district.blocks.map((block) => (
              <button
                key={block.id}
                className={`flex items-center justify-between text-xs py-2 px-3.5 rounded-full font-semibold transition-all cursor-pointer border ${
                  selectedBlock?.id === block.id
                    ? "bg-[#1E3A2B] text-white border-[#1E3A2B] shadow-sm"
                    : "bg-white/60 text-[#1D1C14] border-white/80 hover:bg-white/90 shadow-2xs"
                }`}
                onClick={() => {
                  setSelectedBlockId(block.id);
                  setSelectedVillageId(null);
                }}
              >
                <span>{block.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedBlock?.id === block.id ? "bg-white/20 text-white" : "bg-[#1E3A2B]/10 text-[#1E3A2B]"}`}>
                  {t("villagesCount", { count: block.villages.length })}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Village Selection Grid */}
        {selectedBlock && (
          <div className="space-y-3 pt-4 border-t border-[#1E3A2B]/10">
            <label className="text-xs font-semibold text-[#1E3A2B] uppercase tracking-wider">{t("villagesIn", { name: selectedBlock.name })}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {selectedBlock.villages.map((village) => (
                <div
                  key={village.id}
                  onClick={() => setSelectedVillageId(village.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-xs backdrop-blur-md ${
                    selectedVillage?.id === village.id
                      ? "bg-[#3F6B4A]/12 border-[#3F6B4A]/50 text-[#1E3A2B] shadow-md ring-1 ring-[#3F6B4A]/30"
                      : "bg-white/60 border-white/80 hover:bg-white/90 text-[#1D1C14]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-sm text-[#1E3A2B]">{village.name}</h5>
                    {village.alerts.length > 0 && (
                      <Badge className="text-[10px] gap-1 bg-[#C1622D]/15 text-[#C1622D] border-[#C1622D]/30 font-bold px-2 py-0.5 rounded-full">
                        <ShieldAlert className="h-3 w-3" />
                        {t("activeAlertBadge")}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-[#1D1C14]/70 mt-3 flex justify-between font-medium">
                    <span>{t("farmsCount", { count: village.farms.length })}</span>
                    <span className="font-bold text-[#1E3A2B]">
                      {t("totalAnimals")}:{" "}
                      {village.farms.reduce(
                        (sum, f) => sum + f.herds.reduce((hSum, h) => hSum + h.animals.length, 0),
                        0
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Farm & Herd Inspection for Selected Village */}
        {selectedVillage && (
          <div className="space-y-3 pt-4 border-t border-[#1E3A2B]/10">
            <h4 className="text-xs font-bold text-[#1E3A2B] uppercase tracking-wider">
              {t("farmsAndAnimalsIn", { name: selectedVillage.name })}
            </h4>

            {selectedVillage.farms.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/50 border border-white/70 text-xs text-[#1D1C14]/60">
                {t("noFarmsInVillage")}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedVillage.farms.map((farm) => (
                  <div key={farm.id} className="p-4 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#1E3A2B]">{farm.name}</span>
                      <Badge variant="outline" className="text-[10px] font-semibold text-[#1E3A2B] border-white/80 bg-white/70 rounded-full px-2.5 py-0.5">
                        {t("herdsCount", { count: farm.herds.length })}
                      </Badge>
                    </div>

                    <div className="space-y-2 pl-2">
                      {farm.herds.map((herd) => (
                        <div key={herd.id} className="p-3 rounded-xl bg-white/80 border border-white/90 text-xs flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="text-[#1E3A2B] font-semibold">{herd.name || herd.species}</span>
                            <span className="text-[#1D1C14]/60 ml-2 font-mono">({herd.species})</span>
                          </div>
                          <span className="text-[#3F6B4A] font-bold font-mono">{t("animalsCount", { count: herd.animals.length })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
