import { describe, it, expect, vi, beforeEach } from "vitest";
import { processIvrTurn, IvrState } from "@/lib/actions/ivr";
import * as authPermissions from "@/lib/auth/permissions";
import * as farmerActions from "@/lib/actions/farmer";
import * as casesActions from "@/lib/actions/cases";
import * as analysisActions from "@/lib/actions/analysis";
import * as assistanceActions from "@/lib/actions/assistance";
import prisma from "@/lib/db/prisma";

vi.mock("@/lib/auth/permissions", () => ({
  requireFarmer: vi.fn(),
}));

vi.mock("@/lib/actions/farmer", () => ({
  ensureFarmerPrimaryFarmAction: vi.fn(),
}));

vi.mock("@/lib/actions/cases", () => ({
  createCaseReportAction: vi.fn(),
}));

vi.mock("@/lib/actions/analysis", () => ({
  runCaseAnalysisAction: vi.fn(),
}));

vi.mock("@/lib/actions/assistance", () => ({
  createAssistanceRequestAction: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    farm: {
      findMany: vi.fn(),
    },
  },
}));

describe("Maitri IVR Automated Voice Line Flow", () => {
  const mockFarmer = {
    id: "farmer_test_123",
    clerkId: "clerk_farmer_test_123",
    role: "FARMER",
    status: "ACTIVE",
    name: "Tukaram Shinde",
    phone: "+919800000001",
    preferredLanguage: "en",
  };

  const mockFarms = [
    {
      id: "farm_1",
      name: "Shinde Dairy Farm",
      farmerUserId: "farmer_test_123",
      village: { name: "Shirur", id: "vil_1" },
      herds: [
        {
          id: "herd_1",
          name: "Main Herd",
          animals: [
            {
              id: "animal_1",
              tag: "MH-101",
              species: "Cattle",
              breed: "Gir Cow",
              cases: [],
            },
            {
              id: "animal_2",
              tag: "MH-102",
              species: "Buffalo",
              breed: "Murrah",
              cases: [],
            },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authPermissions.requireFarmer).mockResolvedValue(mockFarmer as any);
    vi.mocked(farmerActions.ensureFarmerPrimaryFarmAction).mockResolvedValue({ success: true } as any);
    vi.mocked(prisma.farm.findMany).mockResolvedValue(mockFarms as any);
  });

  describe("Initial Connection & Main Menu", () => {
    it("returns welcoming greeting with two menu choices (Report & Field Agent)", async () => {
      const turn = await processIvrTurn(null, "", "en");

      expect(turn.reply).toContain("Welcome to Maitri Automated Livestock Voice Service");
      expect(turn.newState?.step).toBe("MENU");
      expect(turn.options).toHaveLength(2);
      expect(turn.options?.[0].key).toBe("1");
      expect(turn.options?.[1].key).toBe("2");
      expect(turn.done).toBe(false);
    });

    it("supports Marathi greeting when locale is mr", async () => {
      const turn = await processIvrTurn(null, "", "mr");

      expect(turn.reply).toContain("मैत्री स्वयंचलित पशुधन व्हॉइस सेवेमध्ये आपले स्वागत आहे");
      expect(turn.options?.[0].label).toContain("आजाराची तक्रार");
      expect(turn.options?.[1].label).toContain("फील्ड एजंट");
    });
  });

  describe("Branch 1: Report Health Concern Flow", () => {
    it("walks through animal selection, canonical symptoms, duration, confirmation, and generates case analysis", async () => {
      // Step 0: Choose option 1 from MENU
      const turn1 = await processIvrTurn({ step: "MENU", locale: "en" }, "1", "en");
      expect(turn1.newState?.step).toBe("REPORT_SELECT_ANIMAL");
      expect(turn1.options).toHaveLength(2);
      expect(turn1.options?.[0].label).toContain("Gir Cow (Tag #MH-101)");

      // Step 1: Select Animal 1
      const turn2 = await processIvrTurn(turn1.newState, "1", "en");
      expect(turn2.newState?.step).toBe("REPORT_SELECT_SYMPTOMS");
      expect(turn2.newState?.animalId).toBe("animal_1");
      expect(turn2.options?.some((o) => o.label.includes("High Fever"))).toBe(true);

      // Step 2: Select Symptom (1: High Fever)
      const turn3 = await processIvrTurn(turn2.newState, "1", "en");
      expect(turn3.newState?.step).toBe("REPORT_DURATION_AFFECTED");
      expect(turn3.newState?.symptomLabel).toBe("High Fever");
      expect(turn3.options).toHaveLength(3);

      // Step 3: Select Duration (2: 2 to 3 days)
      const turn4 = await processIvrTurn(turn3.newState, "2", "en");
      expect(turn4.newState?.step).toBe("REPORT_CONFIRM");
      expect(turn4.newState?.durationDays).toBe(3);
      expect(turn4.newState?.affectedCount).toBe(1);
      expect(turn4.reply).toContain("Gir Cow");
      expect(turn4.reply).toContain("High Fever");

      // Mock successful case creation & analysis
      vi.mocked(casesActions.createCaseReportAction).mockResolvedValue({
        success: true,
        caseId: "case_real_777",
        caseNumber: "CASE-2026-9999",
        assignedVeterinarian: {
          id: "vet_1",
          name: "Dr. Ananya Deshmukh",
          email: "vet@example.com",
          phone: "9876543210",
          jurisdiction: "Shirur Block",
        },
      } as any);

      vi.mocked(analysisActions.runCaseAnalysisAction).mockResolvedValue({
        success: true,
        analysisResult: {
          overall_risk_score: 82,
          overall_risk_level: "HIGH",
          disease_prediction: {
            suspected_condition: "Lumpy Skin Disease",
            confidence_score: 0.88,
          },
          farmer_advisory: {
            advisory: "Isolate the cow immediately and avoid vector contact.",
          },
        },
      } as any);

      // Step 4: Confirm (1: Confirm and Submit)
      const turn5 = await processIvrTurn(turn4.newState, "1", "en");

      expect(casesActions.createCaseReportAction).toHaveBeenCalledWith(
        expect.objectContaining({
          animalId: "animal_1",
          symptoms: ["Fever"],
          durationDays: 3,
          affectedCount: 1,
        })
      );

      expect(analysisActions.runCaseAnalysisAction).toHaveBeenCalledWith("case_real_777");

      expect(turn5.done).toBe(true);
      expect(turn5.newState?.step).toBe("REPORT_DONE");
      expect(turn5.reply).toContain("CASE-2026-9999");
      expect(turn5.reply).toContain("HIGH");
      expect(turn5.reply).toContain("82");
      expect(turn5.reply).toContain("Dr. Ananya Deshmukh");
      expect(turn5.result?.kind).toBe("REPORT");
      expect(turn5.result?.caseNumber).toBe("CASE-2026-9999");
      expect(turn5.result?.riskLevel).toBe("HIGH");
    });
  });

  describe("Branch 2: Request Field Agent Visit", () => {
    it("walks through herd visit with preset reason and creates assistance request", async () => {
      // Step 0: Choose option 2 from MENU
      const turn1 = await processIvrTurn({ step: "MENU", locale: "en" }, "2", "en");
      expect(turn1.newState?.step).toBe("HELP_SELECT_ANIMAL");
      expect(turn1.options?.[0].label).toContain("General herd");

      // Step 1: Choose 0 for General herd visit
      const turn2 = await processIvrTurn(turn1.newState, "0", "en");
      expect(turn2.newState?.step).toBe("HELP_REASON");
      expect(turn2.options).toHaveLength(4);
      expect(turn2.options?.[3].label).toContain("Other");

      // Step 2: Choose preset reason 1 (General physical examination)
      const turn3 = await processIvrTurn(turn2.newState, "1", "en");
      expect(turn3.newState?.step).toBe("HELP_CONFIRM");
      expect(turn3.reply).toContain("Shinde Dairy Farm");
      expect(turn3.reply).toContain("clinical examination");

      // Mock successful assistance request
      vi.mocked(assistanceActions.createAssistanceRequestAction).mockResolvedValue({
        success: true,
        requestId: "req_assist_888",
        assignedFieldAgent: {
          id: "agent_1",
          name: "Sunita Pashu Sakhi",
          email: "agent@example.com",
          phone: "9876543211",
          jurisdiction: "Shirur",
        },
        assignmentLevel: "VILLAGE",
      } as any);

      // Step 3: Confirm (1: Confirm and Dispatch)
      const turn4 = await processIvrTurn(turn3.newState, "1", "en");

      expect(assistanceActions.createAssistanceRequestAction).toHaveBeenCalledWith(
        expect.objectContaining({
          farmId: "farm_1",
          animalId: null,
          reason: expect.stringContaining("clinical examination"),
        })
      );

      expect(turn4.done).toBe(true);
      expect(turn4.newState?.step).toBe("HELP_DONE");
      expect(turn4.reply).toContain("req_assi");
      expect(turn4.reply).toContain("Sunita Pashu Sakhi");
      expect(turn4.result?.kind).toBe("ASSISTANCE");
      expect(turn4.result?.requestId).toBe("req_assist_888");
      expect(turn4.result?.assignedFieldAgent).toBe("Sunita Pashu Sakhi");
    });

    it("supports Option 4 custom free-text reason with minimum 5 characters validation", async () => {
      const turn1 = await processIvrTurn(
        {
          step: "HELP_REASON",
          farmId: "farm_1",
          farmName: "Shinde Dairy Farm",
          helpAnimalId: null,
          helpAnimalTag: "Entire Herd",
          locale: "en",
        },
        "4",
        "en"
      );

      expect(turn1.newState?.step).toBe("HELP_REASON_CUSTOM");
      expect(turn1.allowCustomInput).toBe(true);
      expect(turn1.reply).toContain("minimum 5 characters");

      // Reject too short input (< 5 chars)
      const turnShort = await processIvrTurn(turn1.newState, "Sick", "en");
      expect(turnShort.newState?.step).toBe("HELP_REASON_CUSTOM");
      expect(turnShort.reply).toContain("too short");

      // Accept valid custom input (>= 5 chars)
      const turnValid = await processIvrTurn(
        turn1.newState,
        "Sudden milk drop across all lactating cows",
        "en"
      );
      expect(turnValid.newState?.step).toBe("HELP_CONFIRM");
      expect(turnValid.newState?.reason).toBe("Sudden milk drop across all lactating cows");
      expect(turnValid.reply).toContain("Sudden milk drop across all lactating cows");
    });
  });

  describe("Navigation & Cancellation", () => {
    it("allows canceling at confirmation and resets to main menu", async () => {
      const state: IvrState = {
        step: "HELP_CONFIRM",
        farmId: "farm_1",
        farmName: "Shinde Dairy Farm",
        reason: "General physical clinical examination needed",
        locale: "en",
      };

      const turn = await processIvrTurn(state, "2", "en");
      expect(turn.newState?.step).toBe("MENU");
      expect(turn.reply).toContain("Returning to main menu");
      expect(turn.options).toHaveLength(2);
    });

    it("gracefully reprompts on unknown input without throwing", async () => {
      const state: IvrState = {
        step: "MENU",
        locale: "en",
      };

      const turn = await processIvrTurn(state, "invalid 999", "en");
      expect(turn.newState?.step).toBe("MENU");
      expect(turn.reply).toContain("didn't catch that choice");
      expect(turn.done).toBe(false);
    });
  });
});
