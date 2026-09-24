"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { getQueuedReports, getAllQueuedReports, OfflineQueueRecord } from "@/lib/offline/db";
import { triggerQueueSync, retryManualQueueItem, checkServerReachability } from "@/lib/offline/sync";
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle, Clock, ShieldAlert } from "lucide-react";

export function SyncStatusBadge() {
  const t = useTranslations("common");
  const { user } = useUser();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isReachable, setIsReachable] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [queuedItems, setQueuedItems] = useState<OfflineQueueRecord[]>([]);
  const [otherUserCount, setOtherUserCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const refreshQueueState = useCallback(async () => {
    const currentUserId = user?.id;
    if (currentUserId) {
      const myItems = await getQueuedReports(currentUserId);
      setQueuedItems(myItems);

      const allItems = await getAllQueuedReports();
      const otherCount = allItems.filter(
        (item) => item.clerkUserId !== currentUserId && item.status !== "SYNCED"
      ).length;
      setOtherUserCount(otherCount);
    } else {
      const allItems = await getAllQueuedReports();
      setQueuedItems(allItems);
      setOtherUserCount(0);
    }
  }, [user?.id]);

  const checkConnectivity = useCallback(async () => {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(online);
    if (online) {
      const reachable = await checkServerReachability();
      setIsReachable(reachable);
    } else {
      setIsReachable(false);
    }
  }, []);

  const handleManualSync = useCallback(async () => {
    if (!user?.id) return;
    setSyncing(true);
    try {
      await triggerQueueSync(user.id);
      await refreshQueueState();
    } finally {
      setSyncing(false);
    }
  }, [user?.id, refreshQueueState]);

  const handleSingleRetry = async (itemId: string) => {
    setRetryingId(itemId);
    try {
      await retryManualQueueItem(itemId, user?.id);
      await refreshQueueState();
    } finally {
      setRetryingId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (isMounted) {
        await checkConnectivity();
        await refreshQueueState();
      }
    };
    init();

    const handleOnline = () => {
      checkConnectivity();
      handleManualSync();
    };

    const handleOffline = () => {
      checkConnectivity();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen to multi-tab sync completion messages
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("maitri_offline_sync");
      channel.onmessage = () => {
        refreshQueueState();
      };
    }

    // Periodic reachability & queue refresh poll (30s)
    const interval = setInterval(() => {
      checkConnectivity();
      refreshQueueState();
    }, 30000);

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (channel) channel.close();
      clearInterval(interval);
    };
  }, [checkConnectivity, refreshQueueState, handleManualSync]);

  const pendingCount = queuedItems.filter(
    (item) =>
      item.status === "QUEUED" ||
      item.status === "SYNCING" ||
      item.status === "FAILED" ||
      item.status === "NEEDS_MANUAL_RETRY"
  ).length;

  const manualRetryCount = queuedItems.filter(
    (item) => item.status === "NEEDS_MANUAL_RETRY"
  ).length;

  return (
    <>
      {/* Floating Status Pill */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <button
          suppressHydrationWarning
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold shadow-md border backdrop-blur-md transition cursor-pointer ${
            !isOnline || !isReachable
              ? "bg-red-50 text-red-800 border-red-200"
              : syncing
              ? "bg-amber-50 text-amber-900 border-amber-200 animate-pulse"
              : manualRetryCount > 0
              ? "bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/40"
              : pendingCount > 0
              ? "bg-amber-50 text-amber-900 border-amber-200"
              : "bg-white/95 text-emerald-800 border-emerald-200 hover:bg-emerald-50/50"
          }`}
        >
          {!isOnline || !isReachable ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-600" />
              <span>{t("offline")}</span>
            </>
          ) : syncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>{t("syncing")}</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t("online")}</span>
            </>
          )}

          {pendingCount > 0 && (
            <span
              className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full font-mono ${
                manualRetryCount > 0
                  ? "bg-amber-300 text-amber-950 border border-amber-400"
                  : "bg-amber-200/80 text-amber-950 border border-amber-300"
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Offline Queue Drawer Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-[#E5E0D8] rounded-3xl shadow-2xl overflow-hidden text-[#191F1C] flex flex-col max-h-[80vh]">
            <div className="p-4 bg-[#FAF8F3] border-b border-[#E5E0D8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-700" />
                <h3 className="font-editorial text-base font-semibold text-[#20271F]">{t("offlineQueue")}</h3>
              </div>
              <button
                suppressHydrationWarning
                onClick={() => setIsOpen(false)}
                className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Other User Isolation Safeguard Banner */}
            {otherUserCount > 0 && (
              <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2 text-xs text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{t("otherAccountReports")}</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {otherUserCount} report{otherUserCount === 1 ? " is" : "s are"} linked to another account. Sign in with that account to sync them safely.
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-[#FAF8F3]/50">
              {queuedItems.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-xs">
                  {t("noPendingReports")}
                </div>
              ) : (
                queuedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-[#E5E0D8] rounded-2xl flex flex-col gap-2 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#191F1C]">Record: {item.submissionId.substring(0, 12)}...</span>
                          {item.photoBlob && <span className="text-[10px] text-emerald-700 font-medium">📷 {t("photoAttached")}</span>}
                        </div>
                        <p className="text-stone-600 text-[11px] mt-0.5">
                          {t("symptoms")}: {item.symptoms.slice(0, 2).join(", ")}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === "SYNCED" ? (
                          <span className="flex items-center gap-1 text-emerald-700 text-[10px] font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" /> {t("synced")}
                          </span>
                        ) : item.status === "SYNCING" ? (
                          <span className="flex items-center gap-1 text-amber-700 text-[10px] font-semibold">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t("syncing")}
                          </span>
                        ) : item.status === "NEEDS_MANUAL_RETRY" ? (
                          <span className="flex items-center gap-1 text-red-700 text-[10px] font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> {t("retryNeeded")}
                          </span>
                        ) : item.status === "FAILED_AUTHORIZATION" ? (
                          <span className="flex items-center gap-1 text-red-700 text-[10px] font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> {t("authFailed")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-700 text-[10px] font-semibold">
                            <Clock className="w-3.5 h-3.5" /> {t("savedLocally")}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.lastError && (
                      <p className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded-lg border border-red-100">
                        {item.lastError} (attempt: {item.retryCount || 0}/5)
                      </p>
                    )}

                    {item.status === "NEEDS_MANUAL_RETRY" && (
                      <div className="flex justify-end pt-1">
                        <button
                          suppressHydrationWarning
                          onClick={() => handleSingleRetry(item.id)}
                          disabled={retryingId === item.id || !isOnline || !isReachable}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-amber-700 hover:bg-amber-800 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${retryingId === item.id ? "animate-spin" : ""}`} />
                          <span>{t("retry")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 bg-white border-t border-[#E5E0D8] flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                {isOnline && isReachable ? "Ready to sync" : "Waiting for network…"}
              </span>
              <button
                suppressHydrationWarning
                onClick={handleManualSync}
                disabled={syncing || !isOnline || !isReachable || !user?.id}
                className="py-2 px-3.5 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 min-h-[36px] shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span>{t("syncNow")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
