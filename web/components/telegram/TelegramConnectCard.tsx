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
    <div className="liquid-glass-card rounded-3xl border border-white/80 p-6 sm:p-7 shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.8),0_16px_36px_rgba(30,58,43,0.06)] space-y-4 text-[#1E3A2B]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/80 border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] text-[#1E3A2B]">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1E3A2B] font-display">{t("title")}</h3>
            <p className="text-xs text-[#4A3324]/70">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {isConnected ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[11px] font-bold text-[#3F6B4A] tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3F6B4A] animate-pulse" />
            <span>{t("connected")}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_1px_2px_rgba(30,58,43,0.04)] text-[11px] font-bold text-[#4A3324]/60 tracking-wider uppercase">
            Not connected
          </span>
        )}
      </div>

      {isConnected ? (
        <div className="space-y-3.5">
          <div className="p-4 bg-white/70 backdrop-blur-md border border-white/90 rounded-2xl text-xs text-[#1E3A2B] space-y-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(30,58,43,0.03)]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#3F6B4A] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#3F6B4A]" />
                <span>{t("botConnected")}</span>
              </span>
              {username && (
                <span className="font-mono text-[11px] px-2.5 py-0.5 bg-white/90 border border-white rounded-full text-[#1E3A2B] font-semibold shadow-2xs">
                  @{username}
                </span>
              )}
            </div>
            <p className="text-[#4A3324]/75 text-[11px]">
              {t("botConnectedDesc")}
            </p>
            {formattedDate && (
              <p className="text-[10px] text-[#4A3324]/60 flex items-center gap-1 pt-0.5">
                <Clock className="w-3 h-3" />
                <span>Connected on {formattedDate}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleUnlink}
            disabled={unlinking}
            className="w-full h-9 border border-white/80 bg-white/80 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
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
        <div className="space-y-3.5">
          {!token ? (
            <button
              type="button"
              onClick={handleGenerateToken}
              disabled={loading}
              className="w-full h-10 bg-[#1E3A2B] hover:bg-[#3F6B4A] text-[#F4EEE1] font-semibold text-xs rounded-full shadow-[0_4px_10px_rgba(30,58,43,0.18),inset_0_1px_1px_rgba(255,255,255,0.35)] flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
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
            <div className="p-4 bg-white/70 backdrop-blur-md border border-white/90 rounded-2xl space-y-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(30,58,43,0.03)]">
              <p className="text-xs text-[#1E3A2B] font-medium">
                Click below to open the bot and link your account:
              </p>

              {deepLink && (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-10 bg-[#1E3A2B] hover:bg-[#3F6B4A] text-[#F4EEE1] text-xs font-semibold rounded-full shadow-[0_4px_10px_rgba(30,58,43,0.18),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all hover:scale-[1.01] active:scale-[0.99]"
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
                  className="bg-white border border-[#D9D3C7] rounded-xl px-3 py-2 text-xs text-[#191F1C] font-mono flex-1 focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(`/start ${token}`)}
                  className="p-2 bg-white hover:bg-stone-100 border border-[#D9D3C7] text-stone-700 rounded-xl text-xs font-medium transition cursor-pointer"
                  title={t("copyCommand")}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[10px] text-amber-800 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                <span>{t("tokenNotice")}</span>
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
