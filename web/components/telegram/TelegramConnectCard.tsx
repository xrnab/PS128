"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  generateTelegramLinkTokenAction,
  getTelegramStatusAction,
  unlinkTelegramAccountAction,
} from "@/lib/actions/telegram";
import { Button } from "@/components/ui/button";
import {
  Send,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Unlink,
  Clock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TelegramConnectCardProps {
  initialConnected?: boolean;
  initialUsername?: string;
  initialConnectedAt?: string;
}

export function TelegramConnectCard({
  initialConnected,
  initialUsername,
  initialConnectedAt,
}: TelegramConnectCardProps) {
  const t = useTranslations("common.telegram");
  const tCommon = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [isConnected, setIsConnected] = useState(initialConnected ?? false);
  const [username, setUsername] = useState<string | undefined>(initialUsername);
  const [connectedAt, setConnectedAt] = useState<string | undefined>(initialConnectedAt);
  const [token, setToken] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch status on initial render if not explicitly passed
  useEffect(() => {
    let active = true;
    if (initialConnected === undefined) {
      getTelegramStatusAction().then((res) => {
        if (active && res.success) {
          setIsConnected(res.isLinked);
          setUsername(res.username);
          setConnectedAt(res.connectedAt);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [initialConnected]);

  const handleGenerateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateTelegramLinkTokenAction();
      if (res.success && res.token && res.botUsername) {
        setToken(res.token);
        setBotUsername(res.botUsername);
      } else {
        setError(res.error || "Failed to generate connection token");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    setError(null);
    try {
      const res = await unlinkTelegramAccountAction();
      if (res.success) {
        setIsConnected(false);
        setUsername(undefined);
        setConnectedAt(undefined);
        setToken(null);
      } else {
        setError(res.error || "Failed to disconnect Telegram account.");
      }
    } catch {
      setError("Failed to disconnect. Please try again.");
    } finally {
      setUnlinking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deepLink = botUsername && token ? `https://t.me/${botUsername}?start=${token}` : null;

  const formattedDate = connectedAt ? formatDate(connectedAt) : null;

  return (
    <div className="p-6 sm:p-8 rounded-[28px] bg-white/75 dark:bg-[#0A1A12]/75 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_12px_36px_rgba(30,58,43,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] space-y-5 text-[#15271E] dark:text-[#F4EEE1]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center justify-center text-[#1E3A2B] dark:text-[#8EE6A3] shadow-2xs">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#15271E] dark:text-[#F4EEE1] font-display">{t("title")}</h3>
            <p className="text-xs text-stone-500 dark:text-[#8EAA97]">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {isConnected ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3EC] dark:bg-[#3F6B4A]/30 text-[#1E3A2B] dark:text-[#BDEEC5] border border-[#1E3A2B]/10 dark:border-white/15 text-[11px] font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A2B] dark:bg-[#8EE6A3] animate-pulse" />
            <span>{t("connected")}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-stone-500 dark:text-stone-400 border border-black/5 dark:border-white/10 text-[11px] font-bold tracking-wider uppercase">
            Not connected
          </span>
        )}
      </div>

      {isConnected ? (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/8 rounded-2xl text-xs text-[#15271E] dark:text-[#F4EEE1] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1E3A2B] dark:text-[#8EE6A3] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#2D5A3C] dark:text-[#8EE6A3]" />
                <span>{t("botConnected")}</span>
              </span>
              {username && (
                <span className="font-mono text-[11px] px-3 py-0.5 bg-white/90 dark:bg-white/10 border border-black/5 dark:border-white/10 rounded-full text-[#15271E] dark:text-[#F4EEE1] font-semibold shadow-2xs">
                  @{username}
                </span>
              )}
            </div>
            <p className="text-stone-600 dark:text-[#8EAA97] text-[11px]">
              {t("botConnectedDesc")}
            </p>
            {formattedDate && (
              <p className="text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-1 pt-0.5">
                <Clock className="w-3 h-3" />
                <span>Connected on {formattedDate}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleUnlink}
            disabled={unlinking}
            className="w-full h-10 border border-red-500/20 dark:border-red-500/30 bg-red-500/10 hover:bg-red-500/15 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
          >
            {unlinking ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{t("disconnecting")}</span>
              </>
            ) : (
              <>
                <Unlink className="w-3.5 h-3.5" />
                <span>{t("disconnect")}</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {!token ? (
            <button
              type="button"
              onClick={handleGenerateToken}
              disabled={loading}
              className="w-full h-11 bg-[#1E3A2B] hover:bg-[#2A4E3B] dark:bg-[#3F6B4A] dark:hover:bg-[#4E7E5A] text-white font-semibold text-xs sm:text-sm rounded-full shadow-[0_4px_16px_rgba(30,58,43,0.25),inset_0_1px_0_rgba(255,255,255,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t("generatingToken")}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t("connect")}</span>
                </>
              )}
            </button>
          ) : (
            <div className="p-4 sm:p-5 bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/8 rounded-2xl space-y-3">
              <p className="text-xs text-[#15271E] dark:text-[#F4EEE1] font-medium">
                Click below to open the bot and link your account:
              </p>

              {deepLink && (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-10 bg-[#1E3A2B] hover:bg-[#2A4E3B] dark:bg-[#3F6B4A] dark:hover:bg-[#4E7E5A] text-white text-xs font-semibold rounded-full shadow-[0_4px_12px_rgba(30,58,43,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Open {botUsername || "Maitri Bot"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={`/start ${token}`}
                  className="bg-black/5 dark:bg-[#0A1A12] border border-black/10 dark:border-white/15 rounded-xl px-3.5 py-2 text-xs text-[#15271E] dark:text-[#F4EEE1] font-mono flex-1 focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(`/start ${token}`)}
                  className="p-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/15 text-stone-700 dark:text-[#AECEB9] rounded-xl text-xs font-medium transition cursor-pointer"
                  title={t("copyCommand")}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>{t("tokenNotice")}</span>
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-500/10 dark:bg-red-950/40 border border-red-500/20 dark:border-red-800/50 rounded-2xl text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
