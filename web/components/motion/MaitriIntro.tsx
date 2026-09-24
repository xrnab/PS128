"use client";

/**
 * MaitriIntro — Cinematic brand splash (v2 — enhanced).
 *
 * New in v2:
 *  ● Sonar / radar rings pulsing out from behind the logo
 *  ● Subtle dot-grid background for depth
 *  ● "SYSTEM ACTIVE" HUD badge at top
 *  ● Horizontal golden-green separator line draws from center
 *  ● Wordmark revealed via left-to-right clip-path sweep
 *  ● Three frosted stat pills (Animals · Villages · Live Sync)
 *  ● Glow-burst on logo entry
 *  ● Corner bracket accents
 *
 * Runtime ≤ 2.65 s | Zero external deps | Pure CSS keyframes.
 * Session-gated, prefers-reduced-motion aware, skippable.
 */

import React, { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";

const SESSION_KEY = "maitri-intro-seen";

// ─── Timing (ms) ──────────────────────────────────────────────
const ICON_IN   = 0;     // logo glow burst + radar rings begin
const BADGE_IN  = 200;   // "SYSTEM ACTIVE" badge slides down
const LINE_IN   = 460;   // separator line draws from center
const WORD_IN   = 580;   // wordmark sweeps left → right
const STATS_IN  = 1000;  // stat pills stagger in
const TAG_IN    = 1240;  // tagline fades up
const HOLD_END  = 2200;  // begin dissolve-out
const GONE      = 2650;  // unmount

// ─── Stat pills data ───────────────────────────────────────────
const STATS = [
  { value: "48+", label: "Animals" },
  { value: "12",  label: "Villages" },
  { value: "Live", label: "Sync" },
] as const;

export function MaitriIntro() {
  const pathname = usePathname();
  const isHome   = pathname === "/" || pathname === "";

  const [active,   setActive]   = useState(false);
  const [exiting,  setExiting]  = useState(false);
  const [iconIn,   setIconIn]   = useState(false);
  const [badgeIn,  setBadgeIn]  = useState(false);
  const [lineIn,   setLineIn]   = useState(false);
  const [wordIn,   setWordIn]   = useState(false);
  const [statsIn,  setStatsIn]  = useState(false);
  const [tagIn,    setTagIn]    = useState(false);

  const timers    = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dismissed = useRef(false);

  const clearAllTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    clearAllTimers();
    try { sessionStorage.setItem(SESSION_KEY, "true"); } catch { /* private mode */ }
    setExiting(true);
    const t = setTimeout(() => setActive(false), 360);
    timers.current.push(t);
  }, [clearAllTimers]);

  // useLayoutEffect — synchronous before paint → zero flash of page beneath
  useLayoutEffect(() => {
    if (!isHome) return;

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let alreadySeen = false;
    try { alreadySeen = sessionStorage.getItem(SESSION_KEY) === "true"; } catch { /* */ }

    if (reducedMotion || alreadySeen) return;

    // ⚠️ sessionStorage written only on actual completion/skip — not here —
    // so Strict Mode cleanup+rerun behaves identically to a single mount.

    setActive(true);
    dismissed.current = false;

    const push = (fn: () => void, delay: number) => {
      const t = setTimeout(fn, delay);
      timers.current.push(t);
      return t;
    };

    push(() => setIconIn(true),  ICON_IN);
    push(() => setBadgeIn(true), BADGE_IN);
    push(() => setLineIn(true),  LINE_IN);
    push(() => setWordIn(true),  WORD_IN);
    push(() => setStatsIn(true), STATS_IN);
    push(() => setTagIn(true),   TAG_IN);
    push(() => setExiting(true), HOLD_END);
    push(() => {
      try { sessionStorage.setItem(SESSION_KEY, "true"); } catch { /* */ }
      setActive(false);
    }, GONE);

    const skip = () => dismiss();
    window.addEventListener("keydown",     skip, { once: true });
    window.addEventListener("pointerdown", skip, { once: true });

    return () => {
      clearAllTimers();
      window.removeEventListener("keydown",     skip);
      window.removeEventListener("pointerdown", skip);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHome]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="maitri-intro"
      onClick={dismiss}
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          999999,
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        backgroundColor: "#07130D",
        cursor:          "pointer",
        opacity:         exiting ? 0 : 1,
        transform:       exiting ? "scale(1.014)" : "scale(1)",
        transition:      exiting
          ? "opacity 360ms cubic-bezier(0.4,0,0.2,1), transform 360ms cubic-bezier(0.4,0,0.2,1)"
          : "none",
        willChange:    "opacity, transform",
        pointerEvents: exiting ? "none" : "auto",
        overflow:      "hidden",
      }}
    >
      {/* ── CSS keyframes ─────────────────────────────────────── */}
      <style>{`
        @keyframes maitri-progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        /* Sonar rings: start small, expand to ~3.5× their size, fade out */
        @keyframes maitri-ring-a {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.55; }
          100% { transform: translate(-50%,-50%) scale(10);  opacity: 0;    }
        }
        @keyframes maitri-ring-b {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.38; }
          100% { transform: translate(-50%,-50%) scale(13);  opacity: 0;    }
        }
        @keyframes maitri-ring-c {
          0%   { transform: translate(-50%,-50%) scale(1);   opacity: 0.22; }
          100% { transform: translate(-50%,-50%) scale(16);  opacity: 0;    }
        }
        /* Logo: brief glow surge on entry, then settles */
        @keyframes maitri-glow-burst {
          0%   { box-shadow: 0 0 30px rgba(63,107,74,0.4),  inset 0 1.5px 0.5px rgba(255,255,255,0.2); }
          40%  { box-shadow: 0 0 90px rgba(63,107,74,0.95), 0 0 160px rgba(63,107,74,0.4),
                             inset 0 1.5px 0.5px rgba(255,255,255,0.55); }
          100% { box-shadow: 0 0 42px rgba(63,107,74,0.38), inset 0 1.5px 0.5px rgba(255,255,255,0.22); }
        }
        /* Status dot pulse */
        @keyframes maitri-dot-pulse {
          0%, 100% { opacity: 1;   box-shadow: 0 0 6px  #50C878; }
          50%       { opacity: 0.5; box-shadow: 0 0 14px #50C878; }
        }
        /* Corner bracket draw-in */
        @keyframes maitri-bracket-tl {
          from { clip-path: inset(0 100% 100% 0); }
          to   { clip-path: inset(0 0% 0% 0);     }
        }
        @keyframes maitri-bracket-br {
          from { clip-path: inset(100% 0 0 100%); }
          to   { clip-path: inset(0 0% 0% 0);     }
        }
      `}</style>

      {/* ── Dot-grid background (very subtle) ─────────────────── */}
      <div
        style={{
          position:        "absolute",
          inset:           0,
          backgroundImage: "radial-gradient(circle, rgba(63,107,74,0.28) 1px, transparent 1px)",
          backgroundSize:  "30px 30px",
          opacity:         iconIn ? 0.45 : 0,
          transition:      "opacity 1400ms ease-out",
          pointerEvents:   "none",
        }}
      />

      {/* ── Large ambient glow blob ────────────────────────────── */}
      <div
        style={{
          position:      "absolute",
          width:         "640px",
          height:        "640px",
          borderRadius:  "50%",
          background:    "radial-gradient(circle, rgba(63,107,74,0.16) 0%, transparent 68%)",
          opacity:       iconIn ? 1 : 0,
          transition:    "opacity 1600ms ease-out",
          pointerEvents: "none",
        }}
      />

      {/* ── Corner bracket accents (top-left + bottom-right) ───── */}
      {iconIn && (
        <>
          {/* Top-left */}
          <div style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            width: "24px",
            height: "24px",
            borderTop: "1.5px solid rgba(189,238,197,0.35)",
            borderLeft: "1.5px solid rgba(189,238,197,0.35)",
            opacity: iconIn ? 1 : 0,
            transition: "opacity 600ms 300ms ease",
            pointerEvents: "none",
          }} />
          {/* Bottom-right */}
          <div style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            width: "24px",
            height: "24px",
            borderBottom: "1.5px solid rgba(217,164,65,0.35)",
            borderRight: "1.5px solid rgba(217,164,65,0.35)",
            opacity: iconIn ? 1 : 0,
            transition: "opacity 600ms 300ms ease",
            pointerEvents: "none",
          }} />
        </>
      )}

      {/* ── SYSTEM ACTIVE badge ────────────────────────────────── */}
      <div
        style={{
          position:   "absolute",
          top:        "28px",
          display:    "flex",
          alignItems: "center",
          gap:        "7px",
          padding:    "5px 14px",
          borderRadius: "999px",
          border:     "1px solid rgba(63,107,74,0.4)",
          background: "rgba(63,107,74,0.1)",
          backdropFilter: "blur(8px)",
          opacity:    badgeIn ? 1 : 0,
          transform:  badgeIn ? "translateY(0)" : "translateY(-10px)",
          transition: "opacity 420ms ease, transform 420ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Pulsing green status dot */}
        <span
          style={{
            display:         "block",
            width:           "6px",
            height:          "6px",
            borderRadius:    "50%",
            backgroundColor: "#50C878",
            animation:       badgeIn ? "maitri-dot-pulse 1.6s ease-in-out infinite" : "none",
          }}
        />
        <span
          style={{
            fontFamily:    "var(--font-geist-mono), monospace",
            fontSize:      "9.5px",
            fontWeight:    600,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color:         "rgba(189,238,197,0.85)",
          }}
        >
          System Active
        </span>
        <span
          style={{
            width: "1px", height: "10px",
            backgroundColor: "rgba(189,238,197,0.2)",
            margin: "0 1px",
          }}
        />
        <span
          style={{
            fontFamily:    "var(--font-geist-mono), monospace",
            fontSize:      "9px",
            fontWeight:    500,
            letterSpacing: "0.1em",
            color:         "rgba(189,238,197,0.45)",
          }}
        >
          v2.4.0
        </span>
      </div>

      {/* ── Brand cluster ──────────────────────────────────────── */}
      <div
        style={{
          position:       "relative",
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            "0",
          zIndex:         2,
        }}
      >
        {/* Icon + Wordmark row */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>

          {/* ── Logo with sonar rings ── */}
          <div style={{ position: "relative", width: "72px", height: "72px", flexShrink: 0 }}>
            {/* Sonar ring 1 */}
            {iconIn && (
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: "72px", height: "72px", marginTop: "-36px", marginLeft: "-36px",
                borderRadius: "50%",
                border: "1px solid rgba(63,107,74,0.7)",
                animation: `maitri-ring-a 2400ms cubic-bezier(0.15,0,0.75,1) infinite`,
                pointerEvents: "none",
              }} />
            )}
            {/* Sonar ring 2 */}
            {iconIn && (
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: "72px", height: "72px", marginTop: "-36px", marginLeft: "-36px",
                borderRadius: "50%",
                border: "1px solid rgba(63,107,74,0.5)",
                animation: `maitri-ring-b 2400ms cubic-bezier(0.15,0,0.75,1) 700ms infinite`,
                pointerEvents: "none",
              }} />
            )}
            {/* Sonar ring 3 */}
            {iconIn && (
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: "72px", height: "72px", marginTop: "-36px", marginLeft: "-36px",
                borderRadius: "50%",
                border: "1px solid rgba(63,107,74,0.3)",
                animation: `maitri-ring-c 2400ms cubic-bezier(0.15,0,0.75,1) 1400ms infinite`,
                pointerEvents: "none",
              }} />
            )}

            {/* Logo image container — glass tile + glow burst */}
            <div
              style={{
                position:       "relative",
                zIndex:         1,
                width:          "72px",
                height:         "72px",
                borderRadius:   "22px",
                overflow:       "hidden",
                background:     "rgba(255,255,255,0.07)",
                border:         "1px solid rgba(255,255,255,0.18)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                opacity:        iconIn ? 1 : 0,
                transform:      iconIn ? "scale(1)" : "scale(0.68)",
                transition:     "opacity 500ms cubic-bezier(0.16,1,0.3,1), transform 500ms cubic-bezier(0.16,1,0.3,1)",
                animation:      iconIn ? "maitri-glow-burst 900ms ease-out forwards" : "none",
              }}
            >
              <Image
                src="/images/maitri-livestock-logo.png"
                alt="Maitri"
                width={64}
                height={64}
                priority
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
              />
            </div>
          </div>

          {/* ── Wordmark — clip-path left-to-right sweep ── */}
          <div style={{ overflow: "hidden" }}>
            <span
              style={{
                display:       "block",
                fontFamily:    "var(--font-geist-sans), system-ui, sans-serif",
                fontSize:      "clamp(38px, 6vw, 54px)",
                fontWeight:    800,
                letterSpacing: "-0.045em",
                color:         "#F4EEE1",
                lineHeight:    1,
                clipPath:      wordIn ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
                transition:    wordIn
                  ? "clip-path 520ms cubic-bezier(0.16,1,0.3,1)"
                  : "none",
              }}
            >
              Maitri
            </span>
          </div>
        </div>

        {/* ── Separator line (draws from center) ─────────────── */}
        <div
          style={{
            width:           "280px",
            height:          "1px",
            marginTop:       "16px",
            background:      "linear-gradient(90deg, transparent 0%, rgba(189,238,197,0.4) 30%, rgba(217,164,65,0.6) 50%, rgba(189,238,197,0.4) 70%, transparent 100%)",
            transform:       lineIn ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "center",
            transition:      lineIn ? "transform 540ms cubic-bezier(0.16,1,0.3,1)" : "none",
          }}
        />

        {/* ── Stat pills ─────────────────────────────────────── */}
        <div
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        "6px",
            marginTop:  "18px",
          }}
        >
          {STATS.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <div
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        "5px",
                  padding:    "5px 11px",
                  borderRadius: "999px",
                  border:     "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(4px)",
                  opacity:    statsIn ? 1 : 0,
                  transform:  statsIn ? "translateY(0)" : "translateY(10px)",
                  transition: `opacity 380ms ${i * 90}ms ease, transform 380ms ${i * 90}ms cubic-bezier(0.16,1,0.3,1)`,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize:   "12px",
                    fontWeight: 700,
                    color:      "#F4EEE1",
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontFamily:    "var(--font-geist-mono), monospace",
                    fontSize:      "9.5px",
                    fontWeight:    500,
                    letterSpacing: "0.06em",
                    color:         "rgba(189,238,197,0.58)",
                  }}
                >
                  {stat.label}
                </span>
              </div>
              {/* Divider between pills */}
              {i < STATS.length - 1 && (
                <span
                  style={{
                    display:         "block",
                    width:           "1px",
                    height:          "12px",
                    backgroundColor: "rgba(189,238,197,0.18)",
                    opacity:         statsIn ? 1 : 0,
                    transition:      `opacity 300ms ${i * 90 + 120}ms ease`,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Tagline ────────────────────────────────────────── */}
        <div
          style={{
            marginTop:  "22px",
            opacity:    tagIn ? 1 : 0,
            transform:  tagIn ? "translateY(0)" : "translateY(7px)",
            transition: tagIn
              ? "opacity 520ms cubic-bezier(0.16,1,0.3,1), transform 520ms cubic-bezier(0.16,1,0.3,1)"
              : "none",
            textAlign:  "center",
            maxWidth:   "360px",
            padding:    "0 24px",
          }}
        >
          <span
            style={{
              display:       "block",
              fontFamily:    "var(--font-geist-mono), monospace",
              fontSize:      "10px",
              fontWeight:    500,
              letterSpacing: "0.17em",
              textTransform: "uppercase",
              color:         "rgba(189,238,197,0.58)",
            }}
          >
            Dept. of Animal Husbandry · Govt. of Maharashtra
          </span>
        </div>
      </div>

      {/* ── Hairline progress bar ──────────────────────────────── */}
      <div
        style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          right:      0,
          height:     "2px",
          background: "rgba(255,255,255,0.05)",
          overflow:   "hidden",
          opacity:    iconIn ? 1 : 0,
          transition: "opacity 500ms ease",
        }}
      >
        <div
          style={{
            height:          "100%",
            background:      "linear-gradient(90deg, rgba(63,107,74,0.85), rgba(217,164,65,0.95))",
            transformOrigin: "left",
            animation:       exiting ? "none" : `maitri-progress ${HOLD_END}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
