"use client";

import React, { useState } from "react";
import { SampleStatus } from "@prisma/client";
import { updateSampleStatusAction } from "@/lib/actions/vet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FlaskConical, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface SampleItem {
  id: string;
  status: SampleStatus;
  labName?: string | null;
  resultSummary?: string | null;
  collectedAt: Date | string;
  sentAt?: Date | string | null;
  resultReceivedAt?: Date | string | null;
  updatedAt: Date | string;
  case: {
    id: string;
    caseNumber: string;
    status: string;
    animal: {
      tag: string;
      species: string;
    };
  };
  collectedByUser: {
    name: string;
  };
}

interface SampleTrackerTableProps {
  samples: SampleItem[];
}

export function SampleTrackerTable({ samples }: SampleTrackerTableProps) {
  const t = useTranslations("vet");
  const [activeSample, setActiveSample] = useState<SampleItem | null>(null);
  const [newStatus, setNewStatus] = useState<SampleStatus>("SENT");
  const [labName, setLabName] = useState<string>("");
  const [resultSummary, setResultSummary] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const openUpdateModal = (sample: SampleItem) => {
    setActiveSample(sample);
    setNewStatus(sample.status);
    setLabName(sample.labName || "District Veterinary Disease Investigation Laboratory");
    setResultSummary(sample.resultSummary || "");
    setError(null);
  };

  const handleUpdateSample = async () => {
    if (!activeSample) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await updateSampleStatusAction({
        sampleId: activeSample.id,
        expectedUpdatedAt: new Date(activeSample.updatedAt).toISOString(),
        status: newStatus,
        labName: labName || null,
        resultSummary: resultSummary || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to update sample status.");
      } else {
        setActiveSample(null);
        window.location.reload();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: SampleStatus) => {
    switch (status) {
      case "COLLECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[11px] font-bold text-[#C1622D] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C1622D]" />
            {t("sampleCollected")}
          </span>
        );
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[11px] font-bold text-[#8F6612] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441] animate-pulse" />
            {t("sentToLab")}
          </span>
        );
      case "RESULT_PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[11px] font-bold text-[#3F6B4A] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3F6B4A] animate-pulse" />
            {t("resultPending")}
          </span>
        );
      case "RESULT_RECEIVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[11px] font-bold text-[#1E3A2B] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A2B]" />
            {t("resultReceived")}
          </span>
        );
    }
  };

  if (samples.length === 0) {
    return (
      <div className="p-10 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md text-center space-y-3 shadow-2xs">
        <div className="h-12 w-12 rounded-2xl bg-white/80 border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] flex items-center justify-center text-[#8F6612] mx-auto">
          <FlaskConical className="h-6 w-6" />
        </div>
        <p className="text-sm font-bold text-[#1E3A2B] font-display">{t("noLabSamplesRegistered")}</p>
        <p className="text-xs text-[#4A3324]/70 max-w-sm mx-auto">{t("samplesReferredDesc")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card List */}
      <div className="grid grid-cols-1 md:hidden gap-3">
        {samples.map((sample) => (
          <div key={sample.id} className="p-4 rounded-2xl bg-white/75 backdrop-blur-xl border border-white/85 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_8px_rgba(30,58,43,0.03)] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#1E3A2B] font-mono">Case #{sample.case.caseNumber}</span>
              {getStatusBadge(sample.status)}
            </div>

            <div className="text-xs text-[#4A3324]/80 space-y-1.5">
              <div>Animal: <strong className="text-[#1E3A2B] font-semibold">{sample.case.animal.tag} ({sample.case.animal.species})</strong></div>
              <div>Lab: <span className="text-[#1E3A2B]/80">{sample.labName || "Not recorded"}</span></div>
              <div>Collector: <span className="text-[#1E3A2B]/80">{sample.collectedByUser.name}</span></div>
            </div>

            {sample.resultSummary && (
              <div className="p-3 rounded-xl bg-white/80 border border-white/90 text-xs text-[#1E3A2B] shadow-2xs">
                <strong className="font-bold">Diagnostic Finding:</strong> {sample.resultSummary}
              </div>
            )}

            <Button
              type="button"
              onClick={() => openUpdateModal(sample)}
              className="w-full text-xs h-8 bg-[#1E3A2B] hover:bg-[#3F6B4A] text-[#F4EEE1] rounded-full font-semibold shadow-[0_2px_6px_rgba(30,58,43,0.15),inset_0_1px_1px_rgba(255,255,255,0.3)] transition-all cursor-pointer"
            >
              {t("updateSampleStatusModal")}
            </Button>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/80 bg-white/70 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_16px_rgba(30,58,43,0.04)]">
        <table className="w-full text-xs text-left text-[#1E3A2B]/90">
          <thead className="bg-white/60 text-[#1E3A2B]/60 font-bold uppercase tracking-wider text-[10px] border-b border-[#1E3A2B]/8">
            <tr>
              <th className="py-3 px-4">{t("caseNumberCol")}</th>
              <th className="py-3 px-4">{t("animalHeader")}</th>
              <th className="py-3 px-4">{t("labNameCol")}</th>
              <th className="py-3 px-4">{t("statusHeader")}</th>
              <th className="py-3 px-4">{t("collectionDateCol")}</th>
              <th className="py-3 px-4">{t("labFindingCol")}</th>
              <th className="py-3 px-4 text-right">{t("actionHeader")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E3A2B]/6">
            {samples.map((sample) => (
              <tr key={sample.id} className="hover:bg-white/80 transition-colors">
                <td className="py-3.5 px-4 font-bold text-[#1E3A2B] font-mono">#{sample.case.caseNumber}</td>
                <td className="py-3.5 px-4 font-medium text-[#1E3A2B]">{sample.case.animal.tag} ({sample.case.animal.species})</td>
                <td className="py-3.5 px-4 text-[#4A3324]/80">{sample.labName || "Not recorded"}</td>
                <td className="py-3.5 px-4">{getStatusBadge(sample.status)}</td>
                <td className="py-3.5 px-4 text-[#4A3324]/70">{formatDate(sample.collectedAt)}</td>
                <td className="py-3.5 px-4 truncate max-w-xs text-[#1E3A2B]">{sample.resultSummary || "Pending"}</td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => openUpdateModal(sample)}
                    className="h-7 px-3.5 text-xs bg-[#1E3A2B] hover:bg-[#3F6B4A] text-[#F4EEE1] rounded-full font-semibold shadow-[0_2px_6px_rgba(30,58,43,0.15),inset_0_1px_1px_rgba(255,255,255,0.3)] inline-flex items-center gap-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>{t("update")}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Update Sample Modal */}
      {activeSample && (
        <div className="fixed inset-0 z-50 bg-[#1E3A2B]/20 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="liquid-glass-card border border-white/90 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-[0_24px_54px_rgba(30,58,43,0.14)] text-[#1E3A2B] animate-scale-in">
            <div className="flex justify-between items-center border-b border-[#1E3A2B]/8 pb-3">
              <h4 className="text-sm font-bold text-[#1E3A2B] flex items-center gap-2 font-display">
                <FlaskConical className="h-4 w-4 text-[#8F6612]" />
                <span>{t("updateSampleStatusModal")} — #{activeSample.case.caseNumber}</span>
              </h4>
              <button
                type="button"
                onClick={() => setActiveSample(null)}
                className="h-7 w-7 rounded-full bg-white/80 hover:bg-white text-stone-500 hover:text-[#1E3A2B] flex items-center justify-center cursor-pointer transition-all text-xs"
              >
                ✕
              </button>
            </div>

            {/* Progressive 4-stage visual timeline */}
            <div className="grid grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 text-[10px] text-center font-semibold">
              <div className={`p-2 rounded-xl transition-all ${newStatus === "COLLECTED" ? "bg-white text-[#C1622D] shadow-xs" : "text-[#4A3324]/50"}`}>
                {t("statusStep1")}
              </div>
              <div className={`p-2 rounded-xl transition-all ${newStatus === "SENT" ? "bg-white text-[#8F6612] shadow-xs" : "text-[#4A3324]/50"}`}>
                {t("statusStep2")}
              </div>
              <div className={`p-2 rounded-xl transition-all ${newStatus === "RESULT_PENDING" ? "bg-white text-[#3F6B4A] shadow-xs" : "text-[#4A3324]/50"}`}>
                {t("statusStep3")}
              </div>
              <div className={`p-2 rounded-xl transition-all ${newStatus === "RESULT_RECEIVED" ? "bg-white text-[#1E3A2B] shadow-xs" : "text-[#4A3324]/50"}`}>
                {t("statusStep4")}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-red-50/80 backdrop-blur-md border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#1E3A2B] font-bold text-[11px] uppercase tracking-wider mb-1.5 block">Sample Status</label>
                <select
                  value={newStatus}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewStatus(e.target.value as SampleStatus)}
                  className="w-full bg-white/80 backdrop-blur-md border border-white/90 text-xs text-[#1E3A2B] rounded-2xl p-3 min-h-[44px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-[#1E3A2B]/20"
                >
                  <option value="COLLECTED">Sample Collected (COLLECTED)</option>
                  <option value="SENT">Sent to Lab (SENT TO LAB)</option>
                  <option value="RESULT_PENDING">Result Pending (RESULT PENDING)</option>
                  <option value="RESULT_RECEIVED">Result Received (RESULT RECEIVED)</option>
                </select>
              </div>

              <div>
                <label className="text-[#1E3A2B] font-bold text-[11px] uppercase tracking-wider mb-1.5 block">Laboratory Name</label>
                <Input
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  placeholder="e.g. Regional Animal Disease Investigation Laboratory"
                  className="bg-white/80 backdrop-blur-md border-white/90 text-xs text-[#1E3A2B] rounded-2xl h-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]"
                />
              </div>

              {newStatus === "RESULT_RECEIVED" && (
                <div>
                  <label className="text-[#1E3A2B] font-bold text-[11px] uppercase tracking-wider mb-1.5 block">{t("diagnosticResultSummary")}</label>
                  <Textarea
                    value={resultSummary}
                    onChange={(e) => setResultSummary(e.target.value)}
                    placeholder="e.g. PCR confirmed positive for Lumpy Skin Disease virus"
                    rows={3}
                    className="bg-white/80 backdrop-blur-md border-white/90 text-xs text-[#1E3A2B] rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1E3A2B]/8">
              <button
                type="button"
                onClick={() => setActiveSample(null)}
                disabled={submitting}
                className="h-8 px-4 text-xs font-semibold border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleUpdateSample}
                disabled={submitting}
                className="h-8 px-5 text-xs bg-[#1E3A2B] hover:bg-[#3F6B4A] text-[#F4EEE1] font-semibold rounded-full shadow-[0_4px_10px_rgba(30,58,43,0.18),inset_0_1px_1px_rgba(255,255,255,0.35)] inline-flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>{t("saveSampleRecord")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
