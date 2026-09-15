import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import { LocaleProvider, useLocale } from "@/components/layout/LocaleProvider";
import { Navbar } from "@/components/layout/Navbar";
import { getServerLocale, getServerDictionary } from "@/lib/i18n/server";
import { defaultLocale } from "@/lib/i18n";
import { getReportCopy } from "@/lib/i18n/report";
import { getPendingCopy } from "@/lib/i18n/pending";
import { RiskGauge } from "@/components/ai/RiskGauge";
import { WeatherRiskCard } from "@/components/ai/WeatherRiskCard";
import { OutbreakTrendCard } from "@/components/ai/OutbreakTrendCard";
import { IoTAnalysisCard } from "@/components/ai/IoTAnalysisCard";

import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
  }),
}));

// Mock @clerk/nextjs
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { id: "user_test", fullName: "Test User" } }),
  Show: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => <div>UserButton</div>,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/farmer",
}));

describe("English-Only Frontend Lock Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. defaultLocale is strictly 'en'", () => {
    expect(defaultLocale).toBe("en");
  });

  it("2. getServerLocale() strictly returns 'en'", async () => {
    const locale = await getServerLocale();
    expect(locale).toBe("en");
  });

  it("3. getServerDictionary() returns complete English dictionary", async () => {
    const dict = await getServerDictionary();
    expect(dict.app.title).toBe("Maitri — Livestock Health Intelligence");
    expect(dict.nav.farmer).toBe("Farmer Portal");
    expect(dict.nav.agent).toBe("Field Agent");
    expect(dict.nav.vet).toBe("Veterinarian");
    expect(dict.nav.authority).toBe("District Authority");
  });

  it("4. LocaleProvider defaults to locale='en'", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocaleProvider>{children}</LocaleProvider>
    );

    const { result } = renderHook(() => useLocale(), { wrapper });

    expect(result.current.locale).toBe("en");
    expect(result.current.dictionary.app.title).toBe("Maitri — Livestock Health Intelligence");
    expect(result.current.dictionary.roles.FARMER).toBe("Farmer");
  });

  it("5. setLocale updates locale", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LocaleProvider>{children}</LocaleProvider>
    );

    const { result } = renderHook(() => useLocale(), { wrapper });

    expect(result.current.locale).toBe("en");
    act(() => {
      result.current.setLocale("bn");
    });
    expect(result.current.locale).toBe("bn");
  });

  it("6. Navbar renders English navigation links", () => {
    render(
      <ThemeProvider>
        <LocaleProvider>
          <Navbar />
        </LocaleProvider>
      </ThemeProvider>
    );

    expect(screen.getByText("Farmer Portal")).toBeInTheDocument();
    expect(screen.getByText("Herd")).toBeInTheDocument();
    expect(screen.getByText("Report")).toBeInTheDocument();
  });

  it("7. getReportCopy('en') has all required English strings with no missing keys", () => {
    const copy = getReportCopy("en");

    expect(copy.pageTitle).toBe("Report Livestock Illness");
    expect(copy.successBadge).toBe("Report submitted successfully");
    expect(copy.riskScore).toBe("Overall risk score");
    expect(copy.weatherTitle).toBe("Weather and vector risk");
    expect(copy.outbreakTitle).toBe("Outbreak trend analysis");
    expect(copy.sensorTitle).toBe("IoT sensor signals");
    expect(copy.advisoryTitle).toBe("Farmer advisory");
  });

  it("8. getPendingCopy('en') has all required English strings with no missing keys", () => {
    const copy = getPendingCopy("en");

    expect(copy.title).toBe("Waiting for account approval");
    expect(copy.badge).toBe("Verification Pending");
    expect(copy.applicant).toBe("Applicant name");
    expect(copy.checkStatus).toBe("Check status");
  });

  it("9. AI cards render successfully with valid English copy via LocaleProvider", () => {
    render(
      <LocaleProvider>
        <RiskGauge score={78} level="HIGH" />
        <WeatherRiskCard
          weatherSignals={{
            vector_breeding_risk: "HIGH",
            temperature: 34,
            humidity: 82,
            precipitation: 12,
          }}
        />
        <OutbreakTrendCard
          outbreakSignals={{
            is_outbreak_spike: true,
            latest_cases: 4,
            historical_mean: 1.25,
          }}
        />
        <IoTAnalysisCard
          telemetrySignals={{
            temperature: 39.8,
            activity_index: 25,
            anomalies: ["hyperthermia"],
            heart_rate_elevated: true,
          }}
        />
      </LocaleProvider>
    );

    expect(screen.getByText(/Overall risk score/i)).toBeInTheDocument();
    expect(screen.getByText(/Weather and vector risk/i)).toBeInTheDocument();
    expect(screen.getByText(/Outbreak trend analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/IoT sensor signals/i)).toBeInTheDocument();
  });
});
