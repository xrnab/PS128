import React from "react";
import { getVetSamplesAction } from "@/lib/actions/vet";
import { SampleTrackerTable } from "@/components/vet/SampleTrackerTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FlaskConical } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function VetSamplesPage() {
  const samples = await getVetSamplesAction();
  const t = await getTranslations("vet");

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-8 text-[#1D1C14]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1E3A2B]/8 pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 backdrop-blur-md border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_3px_rgba(30,58,43,0.06)] text-[11px] font-bold text-[#8F6612] tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441]" />
            {t("labSampleRegistry")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display mt-2">
            {t("livestockDiagnosticSamples")}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A3324]/75 mt-1">
            {t("samplesLead")}
          </p>
        </div>

        <div>
          <a
            href="/vet"
            className="h-9 px-4 text-xs font-semibold border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] gap-1.5 rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all"
          >
            <span>&larr;</span>
            <span>{t("triageQueue")}</span>
          </a>
        </div>
      </div>

      <Card className="liquid-glass-card rounded-3xl overflow-hidden p-6 sm:p-7 space-y-6 border border-white/80 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.8),0_16px_36px_rgba(30,58,43,0.06)]">
        <div className="flex items-center justify-between border-b border-[#1E3A2B]/8 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/80 border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] text-[#8F6612]">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E3A2B] font-display">
                {t("labSampleRegistry")}
              </h2>
              <p className="text-[11px] text-[#4A3324]/70">
                Official diagnostic referrals and specimen tracking records
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-white/90 text-xs font-bold text-[#1E3A2B] shadow-2xs font-mono">
            {samples.length} Active {samples.length === 1 ? "Sample" : "Samples"}
          </span>
        </div>

        <div>
          <SampleTrackerTable samples={samples} />
        </div>
      </Card>
    </div>
  );
}
