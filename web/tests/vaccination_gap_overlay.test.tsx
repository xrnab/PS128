import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import {
  VACCINATION_GAP_THRESHOLD_PERCENT,
  HIGH_PRIORITY_RISK_LEVELS,
  VillageAnalysisRow,
} from "@/lib/authority/metrics";
import { getRiskRank } from "@/lib/vet/schemas";
import { VillageAnalysisTable } from "@/components/authority/VillageAnalysisTable";
import * as authorityActions from "@/lib/actions/authority";
import prisma from "@/lib/db/prisma";
import * as authPermissions from "@/lib/auth/permissions";
import * as auditLogModule from "@/lib/audit/log";
import * as notificationsModule from "@/lib/actions/notifications";

describe("Vaccination Gap Risk Overlay — Logic & Threshold Constants", () => {
  it("exports named threshold constants adhering to requirements", () => {
    expect(VACCINATION_GAP_THRESHOLD_PERCENT).toBe(60);
    expect(HIGH_PRIORITY_RISK_LEVELS).toContain("HIGH");
    expect(HIGH_PRIORITY_RISK_LEVELS).toContain("CRITICAL");
  });

  it("evaluates priorityFlag correctly: true only when coverage < 60% AND Risk is HIGH or CRITICAL", () => {
    const isPriority = (coverage: number, risk: string) =>
      coverage < VACCINATION_GAP_THRESHOLD_PERCENT &&
      HIGH_PRIORITY_RISK_LEVELS.includes(risk as (typeof HIGH_PRIORITY_RISK_LEVELS)[number]);

    // Priority cases:
    expect(isPriority(0, "CRITICAL")).toBe(true);
    expect(isPriority(25, "CRITICAL")).toBe(true);
    expect(isPriority(59, "CRITICAL")).toBe(true);
    expect(isPriority(0, "HIGH")).toBe(true);
    expect(isPriority(50, "HIGH")).toBe(true);

    // Non-priority cases (coverage >= 60%):
    expect(isPriority(60, "CRITICAL")).toBe(false);
    expect(isPriority(75, "CRITICAL")).toBe(false);
    expect(isPriority(100, "HIGH")).toBe(false);

    // Non-priority cases (risk not HIGH or CRITICAL):
    expect(isPriority(0, "ELEVATED")).toBe(false);
    expect(isPriority(10, "LOW")).toBe(false);
    expect(isPriority(0, "NONE")).toBe(false);
  });

  it("calculates gapPriorityScore such that worst risk + worst coverage sorts first", () => {
    const calcScore = (coverage: number, risk: string) => {
      const riskRank = getRiskRank(risk);
      const coverageGap = 100 - coverage;
      return riskRank * 100 + coverageGap;
    };

    const criticalNoCoverage = calcScore(0, "CRITICAL"); // 5 * 100 + 100 = 600
    const critical25Coverage = calcScore(25, "CRITICAL"); // 5 * 100 + 75 = 575
    const critical50Coverage = calcScore(50, "CRITICAL"); // 5 * 100 + 50 = 550
    const highNoCoverage = calcScore(0, "HIGH"); // 4 * 100 + 100 = 500
    const high50Coverage = calcScore(50, "HIGH"); // 4 * 100 + 50 = 450
    const elevatedNoCoverage = calcScore(0, "ELEVATED"); // 3 * 100 + 100 = 400
    const lowNoCoverage = calcScore(0, "LOW"); // 1 * 100 + 100 = 200

    expect(criticalNoCoverage).toBeGreaterThan(critical25Coverage);
    expect(critical25Coverage).toBeGreaterThan(critical50Coverage);
    expect(critical50Coverage).toBeGreaterThan(highNoCoverage);
    expect(highNoCoverage).toBeGreaterThan(high50Coverage);
    expect(high50Coverage).toBeGreaterThan(elevatedNoCoverage);
    expect(elevatedNoCoverage).toBeGreaterThan(lowNoCoverage);
  });
});

describe("Vaccination Gap Risk Overlay — Server Action & RBAC Audit Integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("enforces District Authority RBAC and executes audit logging with vaccination message", async () => {
    const mockAuthority = {
      id: "user_auth_test_1",
      clerkId: "clerk_auth_test_1",
      name: "Dr. Authority Test",
      role: "DISTRICT_AUTHORITY",
      status: "ACTIVE",
      districtId: "test_district_1",
    };

    vi.spyOn(authPermissions, "requireDistrictAuthority").mockResolvedValue(
      mockAuthority as any
    );

    vi.spyOn(prisma.village, "findUnique").mockResolvedValue({
      id: "village_bidhannagar_test",
      name: "Bidhannagar",
      blockId: "block_bidhannagar_test",
      block: {
        id: "block_bidhannagar_test",
        name: "Bidhannagar Block",
        districtId: "test_district_1",
        district: {
          id: "test_district_1",
          name: "Test District",
        },
      },
    } as any);

    const logAuditSpy = vi
      .spyOn(auditLogModule, "logAuditEvent")
      .mockResolvedValue({ id: "audit_log_123" } as any);

    const createNotifSpy = vi
      .spyOn(notificationsModule, "createInAppNotification")
      .mockResolvedValue({ id: "notif_123" } as any);

    vi.spyOn(prisma.user, "findMany").mockResolvedValue([
      { id: "agent_1", name: "Agent Suresh", phone: "12345" },
    ] as any);

    const result = await authorityActions.recommendVaccinationDriveAction({
      villageId: "village_bidhannagar_test",
    });

    expect(result.success).toBe(true);
    expect(result.notifiedCount).toBe(1);

    // Verify InAppNotification was dispatched with vaccination-specific message (not containment)
    expect(createNotifSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "agent_1",
        title: "Vaccination Drive Recommendation",
        type: "VACCINATION_RECOMMENDATION",
        link: "/agent",
      })
    );

    // Verify AuditLog entry was recorded
    expect(logAuditSpy).toHaveBeenCalledWith(
      mockAuthority.id,
      "RECOMMEND_VACCINATION_DRIVE",
      null,
      null,
      expect.objectContaining({
        villageId: "village_bidhannagar_test",
        villageName: "Bidhannagar",
      }),
      expect.stringContaining("Bidhannagar")
    );
  });

  it("blocks cross-district vaccination recommendation", async () => {
    vi.spyOn(authPermissions, "requireDistrictAuthority").mockResolvedValue({
      id: "user_auth_pune",
      name: "Dr. Pune Authority",
      role: "DISTRICT_AUTHORITY",
      status: "ACTIVE",
      districtId: "district_pune",
    } as any);

    vi.spyOn(prisma.village, "findUnique").mockResolvedValue({
      id: "village_other",
      name: "Other Village",
      blockId: "block_other",
      block: {
        districtId: "district_nagpur",
        name: "Nagpur Block",
        district: { id: "district_nagpur", name: "Nagpur District" },
      },
    } as any);

    const result = await authorityActions.recommendVaccinationDriveAction({
      villageId: "village_other",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized: Target village belongs to another district");
  });
});

describe("VillageAnalysisTable UI — Vaccination Gap Overlay Component", () => {
  const mockVillages: VillageAnalysisRow[] = [
    {
      villageId: "vil_bidhannagar",
      villageName: "Bidhannagar",
      blockName: "Bidhannagar Block",
      farmersCount: 5,
      farmsCount: 4,
      animalsCount: 4,
      totalCases: 2,
      activeCases: 2,
      activeAlerts: 1,
      highestRisk: "CRITICAL",
      vaccinationCoveragePercent: 25,
      priorityFlag: true,
      gapPriorityScore: 575,
      vaccinatedAnimalsCount: 1,
    },
    {
      villageId: "vil_lonikand",
      villageName: "Lonikand",
      blockName: "Haveli Block",
      farmersCount: 8,
      farmsCount: 6,
      animalsCount: 10,
      totalCases: 0,
      activeCases: 0,
      activeAlerts: 0,
      highestRisk: "LOW",
      vaccinationCoveragePercent: 90,
      priorityFlag: false,
      gapPriorityScore: 110,
      vaccinatedAnimalsCount: 9,
    },
    {
      villageId: "vil_wagholi",
      villageName: "Wagholi",
      blockName: "Haveli Block",
      farmersCount: 10,
      farmsCount: 8,
      animalsCount: 10,
      totalCases: 3,
      activeCases: 1,
      activeAlerts: 1,
      highestRisk: "HIGH",
      vaccinationCoveragePercent: 40,
      priorityFlag: true,
      gapPriorityScore: 460,
      vaccinatedAnimalsCount: 4,
    },
  ];

  const renderTable = (villages = mockVillages) => {
    return render(
      <NextIntlClientProvider messages={messages} locale="en">
        <VillageAnalysisTable villages={villages} />
      </NextIntlClientProvider>
    );
  };

  it("renders Vaccination Coverage % and Priority Action columns correctly", () => {
    renderTable();

    expect(screen.getByText("Vaccination Coverage %")).toBeInTheDocument();
    expect(screen.getByText("Priority Action")).toBeInTheDocument();

    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("(1/4)")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("(9/10)")).toBeInTheDocument();
  });

  it("renders priority badge and Recommend Vaccination Drive button only on priorityFlag rows", () => {
    renderTable();

    const badges = screen.getAllByText("⚠ Vaccination Gap");
    expect(badges.length).toBe(2);

    const recommendButtons = screen.getAllByText("Recommend Vaccination Drive");
    expect(recommendButtons.length).toBe(2);
  });

  it("filters and sorts by gapPriorityScore when 'Show priority villages only' is toggled on", () => {
    renderTable();

    const toggleButton = screen.getByRole("switch");
    expect(toggleButton).toHaveTextContent("Show priority villages only");

    expect(screen.getByText("Bidhannagar")).toBeInTheDocument();
    expect(screen.getByText("Lonikand")).toBeInTheDocument();
    expect(screen.getByText("Wagholi")).toBeInTheDocument();

    fireEvent.click(toggleButton);

    expect(screen.queryByText("Lonikand")).not.toBeInTheDocument();
    expect(screen.getByText("Bidhannagar")).toBeInTheDocument();
    expect(screen.getByText("Wagholi")).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Bidhannagar");
    expect(rows[2]).toHaveTextContent("Wagholi");
  });

  it("invokes recommendVaccinationDriveAction and displays confirmed state on click", async () => {
    vi.spyOn(authorityActions, "recommendVaccinationDriveAction").mockResolvedValue({
      success: true,
      notifiedCount: 2,
      villageName: "Bidhannagar",
      message: "Vaccination drive recommendation successfully broadcasted to 2 field agent(s).",
    });

    renderTable();

    const recommendButtons = screen.getAllByText("Recommend Vaccination Drive");
    fireEvent.click(recommendButtons[0]);

    await waitFor(() => {
      expect(authorityActions.recommendVaccinationDriveAction).toHaveBeenCalledWith({
        villageId: "vil_bidhannagar",
      });
      expect(screen.getByText("Drive Recommended")).toBeInTheDocument();
      expect(
        screen.getByText(/Vaccination drive recommendation successfully broadcasted/)
      ).toBeInTheDocument();
    });
  });
});
