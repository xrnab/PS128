import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth/permissions", () => ({
  requireFarmer: vi.fn().mockResolvedValue({
    id: "farmer_1",
    name: "Farmer Ramesh",
    phone: "9876543210",
    role: "FARMER",
    status: "ACTIVE",
  }),
  requireFieldAgent: vi.fn().mockResolvedValue({
    id: "agent_a",
    name: "Field Agent Anita",
    phone: "9876543211",
    role: "FIELD_AGENT",
    status: "ACTIVE",
    districtId: "dist_pune",
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  requireActiveUser: vi.fn().mockResolvedValue({
    id: "farmer_1",
    name: "Farmer Ramesh",
    phone: "9876543210",
    role: "FARMER",
    status: "ACTIVE",
  }),
}));

vi.mock("@/lib/actions/notifications", () => ({
  createInAppNotification: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/actions/analysis", () => ({
  runCaseAnalysisAction: vi.fn().mockResolvedValue({ success: true }),
}));

const mockFindUniqueUser = vi.fn();
const mockFindManyUsers = vi.fn();
const mockFindUniqueCase = vi.fn();
const mockFindFirstCase = vi.fn();
const mockFindManyCases = vi.fn();
const mockCreateCase = vi.fn();
const mockUpdateCase = vi.fn();
const mockGroupByCase = vi.fn();

const mockFindUniqueRequest = vi.fn();
const mockFindFirstRequest = vi.fn();
const mockFindManyRequests = vi.fn();
const mockCreateRequest = vi.fn();
const mockUpdateRequest = vi.fn();
const mockGroupByRequest = vi.fn();

const mockUpsertVisit = vi.fn();
const mockFindUniqueFarm = vi.fn();
const mockFindUniqueAnimal = vi.fn();
const mockFindUniqueVillage = vi.fn();
const mockFindUniqueBlock = vi.fn();
const mockCreateNotification = vi.fn();
const mockFindFirstNotification = vi.fn();

vi.mock("@/lib/db/prisma", () => {
  const prismaMock = {
    user: {
      findUnique: (...args: unknown[]) => mockFindUniqueUser(...args),
      findMany: (...args: unknown[]) => mockFindManyUsers(...args),
    },
    case: {
      findUnique: (...args: unknown[]) => mockFindUniqueCase(...args),
      findFirst: (...args: unknown[]) => mockFindFirstCase(...args),
      findMany: (...args: unknown[]) => mockFindManyCases(...args),
      create: (...args: unknown[]) => mockCreateCase(...args),
      update: (...args: unknown[]) => mockUpdateCase(...args),
      groupBy: (...args: unknown[]) => mockGroupByCase(...args),
    },
    assistanceRequest: {
      findUnique: (...args: unknown[]) => mockFindUniqueRequest(...args),
      findFirst: (...args: unknown[]) => mockFindFirstRequest(...args),
      findMany: (...args: unknown[]) => mockFindManyRequests(...args),
      create: (...args: unknown[]) => mockCreateRequest(...args),
      update: (...args: unknown[]) => mockUpdateRequest(...args),
      groupBy: (...args: unknown[]) => mockGroupByRequest(...args),
    },
    fieldVisit: {
      upsert: (...args: unknown[]) => mockUpsertVisit(...args),
    },
    farm: {
      findUnique: (...args: unknown[]) => mockFindUniqueFarm(...args),
    },
    animal: {
      findUnique: (...args: unknown[]) => mockFindUniqueAnimal(...args),
    },
    village: {
      findUnique: (...args: unknown[]) => mockFindUniqueVillage(...args),
    },
    block: {
      findUnique: (...args: unknown[]) => mockFindUniqueBlock(...args),
    },
    inAppNotification: {
      create: (...args: unknown[]) => mockCreateNotification(...args),
      findFirst: (...args: unknown[]) => mockFindFirstNotification(...args),
      findUnique: (...args: unknown[]) => mockFindFirstNotification(...args),
    },
    $transaction: (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (tx: typeof prismaMock) => unknown)(prismaMock);
      }
      return Array.isArray(arg) ? Promise.all(arg) : arg;
    },
  };
  return { default: prismaMock };
});

import { requireActiveUser, FullAppUser } from "@/lib/auth/session";
import {
  findEligibleVeterinarians,
  findEligibleFieldAgents,
  routeCaseToVeterinarian,
  routeAssistanceRequestToFieldAgent,
  calculateLocationMatch,
  LocationMatchTier,
} from "@/lib/geo/routing";
import {
  createCaseReportAction,
} from "@/lib/actions/cases";
import {
  createAssistanceRequestAction,
  acceptAssistanceRequestAction,
  startVisitAssistanceRequestAction,
  completeAssistanceWithReportAction,
} from "@/lib/actions/assistance";
import {
  getVetQueueAction,
} from "@/lib/actions/vet";

describe("Comprehensive Report Routing & Visibility End-to-End Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Location Match Hierarchy Calculations", () => {
    it("should calculate correct match tiers based on village, block, and district", () => {
      // Village match (highest priority score 100)
      const villageMatch = calculateLocationMatch(
        { villageId: "v1", blockId: "b1", districtId: "d1" },
        { villageId: "v1", blockId: "b1", districtId: "d1" }
      );
      expect(villageMatch.tier).toBe(LocationMatchTier.SAME_VILLAGE);
      expect(villageMatch.score).toBe(100);

      // Block match (score 50)
      const blockMatch = calculateLocationMatch(
        { villageId: "v2", blockId: "b1", districtId: "d1" },
        { villageId: "v1", blockId: "b1", districtId: "d1" }
      );
      expect(blockMatch.tier).toBe(LocationMatchTier.SAME_BLOCK);
      expect(blockMatch.score).toBe(50);

      // District match (score 10)
      const districtMatch = calculateLocationMatch(
        { villageId: "v3", blockId: "b2", districtId: "d1" },
        { villageId: "v1", blockId: "b1", districtId: "d1" }
      );
      expect(districtMatch.tier).toBe(LocationMatchTier.SAME_DISTRICT);
      expect(districtMatch.score).toBe(10);

      // Cross-district match (score 0, NO_MATCH)
      const crossDistrictMatch = calculateLocationMatch(
        { villageId: "v4", blockId: "b3", districtId: "d2" },
        { villageId: "v1", blockId: "b1", districtId: "d1" }
      );
      expect(crossDistrictMatch.tier).toBe(LocationMatchTier.NO_MATCH);
      expect(crossDistrictMatch.score).toBe(0);
    });
  });

  describe("2. Deterministic Least-Loaded Routing & Tie-Breaking", () => {
    it("should pick lowest loaded veterinarian in winning tier and break ties by user ID ascending", async () => {
      mockFindManyUsers.mockResolvedValue([
        { id: "vet_c", name: "Dr. Charlie", phone: "111", villageId: "v1", blockId: "b1", districtId: "d1" },
        { id: "vet_a", name: "Dr. Alice", phone: "222", villageId: "v1", blockId: "b1", districtId: "d1" },
        { id: "vet_b", name: "Dr. Bob", phone: "333", villageId: "v1", blockId: "b1", districtId: "d1" },
      ]);

      // vet_a has 3 active cases, vet_b has 1 active case, vet_c has 1 active case
      mockGroupByCase.mockResolvedValue([
        { assignedVeterinarianUserId: "vet_a", _count: { id: 3 } },
        { assignedVeterinarianUserId: "vet_b", _count: { id: 1 } },
        { assignedVeterinarianUserId: "vet_c", _count: { id: 1 } },
      ]);

      const result = await findEligibleVeterinarians({
        villageId: "v1",
        blockId: "b1",
        districtId: "d1",
      });

      expect(result).not.toBeNull();
      expect(result?.level).toBe("VILLAGE");
      expect(result?.eligibleVets.length).toBe(3);

      // Both vet_b and vet_c have load 1, but "vet_b" < "vet_c" alphabetically
      expect(result?.eligibleVets[0].id).toBe("vet_b");
      expect(result?.eligibleVets[1].id).toBe("vet_c");
      expect(result?.eligibleVets[2].id).toBe("vet_a");
    });

    it("should pick lowest loaded field agent in winning tier", async () => {
      mockFindManyUsers.mockResolvedValue([
        { id: "agent_2", name: "Agent Two", phone: "222", villageId: "v1", blockId: "b1", districtId: "d1" },
        { id: "agent_1", name: "Agent One", phone: "111", villageId: "v1", blockId: "b1", districtId: "d1" },
      ]);

      mockGroupByRequest.mockResolvedValue([
        { assignedFieldAgentUserId: "agent_1", _count: { id: 2 } },
        { assignedFieldAgentUserId: "agent_2", _count: { id: 0 } },
      ]);

      const result = await findEligibleFieldAgents("v1", "b1", "d1");
      expect(result).not.toBeNull();
      expect(result?.level).toBe("VILLAGE");
      expect(result?.eligibleAgents[0].id).toBe("agent_2");
    });
  });

  describe("3. Path 1: Farmer Self-Report Routing", () => {
    it("should create Case in PENDING_REVIEW and deterministically route to eligible Veterinarian", async () => {
      mockFindUniqueAnimal.mockResolvedValue({
        id: "animal_101",
        tag: "TAG-101",
        species: "Cattle",
        herd: {
          farmId: "farm_1",
          farm: {
            farmerUserId: "farmer_1",
            villageId: "v1",
            village: {
              name: "Shivaji Nagar",
              blockId: "b1",
              block: {
                name: "Haveli",
                districtId: "d1",
                district: { name: "Pune" },
              },
            },
          },
        },
      });

      mockCreateCase.mockResolvedValue({
        id: "case_001",
        caseNumber: "CASE-2026-1001",
        status: "PENDING_REVIEW",
        reportedAt: new Date(),
        assignedVeterinarianUserId: null,
      });

      mockFindFirstCase.mockResolvedValue(null);
      mockFindUniqueCase.mockImplementation(({ where }: { where: { id?: string; submissionId?: string } }) => {
        if (where.submissionId) return null;
        if (where.id === "case_001") {
          return {
            id: "case_001",
            caseNumber: "CASE-2026-1001",
            assignedVeterinarianUserId: null,
            assignedVeterinarianUser: null,
            animal: {
              species: "Cattle",
              herd: {
                farm: {
                  villageId: "v1",
                  village: {
                    name: "Shivaji Nagar",
                    blockId: "b1",
                    block: {
                      name: "Haveli",
                      districtId: "d1",
                      district: { name: "Pune" },
                    },
                  },
                },
              },
            },
          };
        }
        return null;
      });

      mockFindManyUsers.mockResolvedValue([
        { id: "vet_pune_1", name: "Dr. Deshmukh", phone: "9876543219", villageId: "v1", blockId: "b1", districtId: "d1" },
      ]);
      mockGroupByCase.mockResolvedValue([]);

      mockUpdateCase.mockResolvedValue({
        id: "case_001",
        caseNumber: "CASE-2026-1001",
        assignedVeterinarianUserId: "vet_pune_1",
        assignmentLevel: "VILLAGE",
        assignedVeterinarianUser: { id: "vet_pune_1", name: "Dr. Deshmukh", phone: "9876543219" },
      });

      mockFindFirstNotification.mockResolvedValue(null);
      mockCreateNotification.mockResolvedValue({ id: "notif_1" });

      const res = await createCaseReportAction({
        submissionId: "sub_001",
        animalId: "animal_101",
        symptoms: ["High Fever", "Mouth Blisters"],
        durationDays: 2,
        affectedCount: 1,
        herdSize: 10,
        mortalityCount: 0,
      });

      expect(res.success).toBe(true);
      expect(res.caseNumber).toBe("CASE-2026-1001");
      expect(res.assignedVeterinarian?.name).toBe("Dr. Deshmukh");
      expect(res.assignmentLevel).toBe("VILLAGE");
      expect(res.location?.villageName).toBe("Shivaji Nagar");
      expect(mockCreateNotification).toHaveBeenCalled();
    });

    it("should reject report submission if yoloVisionResult indicates a rejected photo (e.g. person or object)", async () => {
      const res = await createCaseReportAction({
        submissionId: "sub_rejected_person",
        animalId: "animal_101",
        symptoms: ["High Fever"],
        durationDays: 1,
        affectedCount: 1,
        herdSize: 10,
        mortalityCount: 0,
        yoloVisionResult: {
          primary_prediction: "Rejected: Person",
          message: "Invalid photo. Person detected.",
        },
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe("Submission blocked: Invalid photo. Person detected.");
      expect(mockCreateCase).not.toHaveBeenCalled();
    });

    it("should handle awaiting veterinarian state when no vet is found in territory", async () => {
      mockFindUniqueCase.mockResolvedValue({
        id: "case_empty",
        caseNumber: "CASE-2026-9999",
        assignedVeterinarianUserId: null,
        assignedVeterinarianUser: null,
        animal: {
          species: "Goat",
          herd: {
            farm: {
              villageId: "v_remote",
              village: {
                name: "Remote Village",
                blockId: "b_remote",
                block: {
                  name: "Remote Block",
                  districtId: "d_remote",
                  district: { name: "Remote District" },
                },
              },
            },
          },
        },
      });

      mockFindManyUsers.mockResolvedValue([]); // No vets

      const routeRes = await routeCaseToVeterinarian("case_empty");
      expect(routeRes.success).toBe(true);
      expect(routeRes.assignedVeterinarian).toBeNull();
      expect(routeRes.assignmentLevel).toBeNull();
    });
  });

  describe("4. Path 2: Field Assistance Request & Lifecycle", () => {
    it("should create AssistanceRequest without Case and route to Field Agent", async () => {
      mockFindUniqueFarm.mockResolvedValue({
        id: "farm_1",
        farmerUserId: "farmer_1",
        villageId: "v1",
        village: {
          name: "Shivaji Nagar",
          blockId: "b1",
          block: {
            districtId: "d1",
            district: { name: "Pune" },
          },
        },
      });

      mockCreateRequest.mockResolvedValue({
        id: "req_001",
        status: "REQUESTED",
        farmerUserId: "farmer_1",
        caseId: null,
      });

      mockFindUniqueRequest.mockResolvedValue({
        id: "req_001",
        villageId: "v1",
        blockId: "b1",
        districtId: "d1",
        reason: "Suspected FMD symptoms",
        farmerUser: { id: "farmer_1", name: "Farmer Ramesh", phone: "123" },
        farm: { name: "Ramesh Farm", village: { name: "Shivaji Nagar" } },
        assignedFieldAgentUserId: null,
        assignedFieldAgentUser: null,
      });

      mockFindManyUsers.mockResolvedValue([
        { id: "agent_a", name: "Field Agent Anita", phone: "987", villageId: "v1", blockId: "b1", districtId: "d1" },
      ]);
      mockGroupByRequest.mockResolvedValue([]);

      mockUpdateRequest.mockResolvedValue({
        id: "req_001",
        status: "ASSIGNED",
        assignedFieldAgentUserId: "agent_a",
        assignedFieldAgentUser: { id: "agent_a", name: "Field Agent Anita", phone: "987" },
      });

      const res = await createAssistanceRequestAction({
        farmId: "farm_1",
        reason: "Suspected FMD symptoms requiring on-site inspection",
      });

      expect(res.success).toBe(true);
      expect(res.requestId).toBe("req_001");
      expect(res.assignedFieldAgent?.name).toBe("Field Agent Anita");
      expect(res.assignmentLevel).toBe("VILLAGE");
    });

    it("should strictly reject non-assigned agent from accepting, starting or completing", async () => {
      // Mock request assigned to agent_other
      mockFindUniqueRequest.mockResolvedValue({
        id: "req_assigned_to_other",
        status: "ASSIGNED",
        farmerUserId: "farmer_1",
        assignedFieldAgentUserId: "agent_other",
        updatedAt: new Date(),
        village: {
          id: "v1",
          blockId: "b1",
          block: { districtId: "d1" },
        },
      });

      // requireFieldAgent returns "agent_a"
      const acceptRes = await acceptAssistanceRequestAction("req_assigned_to_other");
      expect(acceptRes.success).toBe(false);
      expect(acceptRes.error).toContain("assigned to another field agent");

      const startRes = await startVisitAssistanceRequestAction("req_assigned_to_other");
      expect(startRes.success).toBe(false);
      expect(startRes.error).toContain("not the assigned field agent");

      const completeRes = await completeAssistanceWithReportAction({
        requestId: "req_assigned_to_other",
        submissionId: "sub_hack",
        animalId: "animal_101",
        symptoms: ["Fever"],
        durationDays: 1,
        affectedCount: 1,
        herdSize: 5,
        mortalityCount: 0,
      });
      expect(completeRes.success).toBe(false);
      expect(completeRes.error).toContain("not the assigned field agent");
    });

    it("should allow assigned agent to complete report, atomically creating exactly ONE Case and routing to Vet", async () => {
      const mockDate = new Date();
      mockFindUniqueRequest.mockResolvedValue({
        id: "req_authorized",
        status: "IN_PROGRESS",
        farmerUserId: "farmer_1",
        assignedFieldAgentUserId: "agent_a", // Matches authenticated agent
        assignedAt: mockDate,
        assignmentLevel: "VILLAGE",
        updatedAt: mockDate,
        farm: { id: "farm_1" },
        village: { id: "v1", block: { districtId: "d1" } },
      });

      mockFindUniqueAnimal.mockResolvedValue({
        id: "animal_101",
        tag: "TAG-101",
        species: "Cattle",
        herd: { farm: { id: "farm_1" } },
      });

      mockCreateCase.mockResolvedValue({
        id: "case_created_by_agent",
        caseNumber: "CASE-2026-5555",
        status: "PENDING_REVIEW",
      });

      mockUpsertVisit.mockResolvedValue({
        id: "visit_completed",
      });

      mockUpdateRequest.mockResolvedValue({
        id: "req_authorized",
        status: "COMPLETED",
        assignedFieldAgentUserId: "agent_a",
        assignedAt: mockDate,
        assignmentLevel: "VILLAGE",
      });

      // Mock routeCaseToVeterinarian
      mockFindUniqueCase.mockResolvedValue({
        id: "case_created_by_agent",
        caseNumber: "CASE-2026-5555",
        assignedVeterinarianUserId: null,
        assignedVeterinarianUser: null,
        animal: {
          species: "Cattle",
          herd: {
            farm: {
              villageId: "v1",
              village: {
                name: "Shivaji Nagar",
                blockId: "b1",
                block: {
                  name: "Haveli",
                  districtId: "d1",
                  district: { name: "Pune" },
                },
              },
            },
          },
        },
      });

      mockFindManyUsers.mockResolvedValue([
        { id: "vet_pune_1", name: "Dr. Deshmukh", phone: "9876543219", villageId: "v1", blockId: "b1", districtId: "d1" },
      ]);
      mockGroupByCase.mockResolvedValue([]);

      mockUpdateCase.mockResolvedValue({
        id: "case_created_by_agent",
        caseNumber: "CASE-2026-5555",
        assignedVeterinarianUserId: "vet_pune_1",
        assignmentLevel: "VILLAGE",
        assignedVeterinarianUser: { id: "vet_pune_1", name: "Dr. Deshmukh", phone: "9876543219" },
      });

      const res = await completeAssistanceWithReportAction({
        requestId: "req_authorized",
        submissionId: "sub_field_authorized",
        animalId: "animal_101",
        symptoms: ["Nodules on skin", "Loss of appetite"],
        durationDays: 3,
        affectedCount: 2,
        herdSize: 8,
        mortalityCount: 0,
      });

      expect(res.success).toBe(true);
      expect(res.caseNumber).toBe("CASE-2026-5555");
      expect(res.assignedVeterinarian?.name).toBe("Dr. Deshmukh");
      expect(mockCreateCase).toHaveBeenCalledTimes(1);
      expect(mockUpsertVisit).toHaveBeenCalledTimes(1);
    });
  });

  describe("5. Idempotent Routing Execution", () => {
    it("should return existing assignment without reassigning or duplicating notifications on repeated calls", async () => {
      mockFindUniqueCase.mockResolvedValue({
        id: "case_already_assigned",
        caseNumber: "CASE-2026-1234",
        assignedVeterinarianUserId: "vet_existing",
        assignmentLevel: "VILLAGE",
        assignedVeterinarianUser: {
          id: "vet_existing",
          name: "Dr. Existing",
          phone: "999",
        },
        animal: {
          herd: {
            farm: {
              village: {
                name: "Village A",
                block: { name: "Block B", district: { name: "District C" } },
              },
            },
          },
        },
      });

      const res = await routeCaseToVeterinarian("case_already_assigned");
      expect(res.success).toBe(true);
      expect(res.assignedVeterinarian?.name).toBe("Dr. Existing");
      expect(res.assignmentLevel).toBe("VILLAGE");
      expect(mockUpdateCase).not.toHaveBeenCalled();
      expect(mockCreateNotification).not.toHaveBeenCalled();
    });

    it("should return existing assistance request assignment without reassigning", async () => {
      mockFindUniqueRequest.mockResolvedValue({
        id: "req_already_assigned",
        assignedFieldAgentUserId: "agent_existing",
        assignmentLevel: "BLOCK",
        assignedFieldAgentUser: {
          id: "agent_existing",
          name: "Agent Existing",
          phone: "888",
        },
        village: { name: "Village X", block: { name: "Block Y", district: { name: "District Z" } } },
        farm: { name: "Farm X" },
      });

      const res = await routeAssistanceRequestToFieldAgent("req_already_assigned");
      expect(res.success).toBe(true);
      expect(res.assignedFieldAgent?.name).toBe("Agent Existing");
      expect(res.assignmentLevel).toBe("BLOCK");
      expect(mockUpdateRequest).not.toHaveBeenCalled();
    });
  });

  describe("6. FARMER SELF-REPORT → ASSIGNED VET DASHBOARD VISIBILITY (Urgent Bug Regression)", () => {
    it("should create case from farmer report, assign to active village vet, and appear in vet assigned queue", async () => {
      // 1. Farmer A submits report for Animal A in Village X, Block Y, District Z
      mockFindUniqueAnimal.mockResolvedValue({
        id: "animal_a",
        tag: "ANIMAL_A",
        species: "Cattle",
        iotDeviceId: null,
        herd: {
          farm: {
            farmerUserId: "farmer_1",
            villageId: "village_x",
            village: {
              name: "Village X",
              blockId: "block_y",
              block: {
                name: "Block Y",
                districtId: "district_z",
                district: { name: "District Z" },
              },
            },
          },
        },
      });

      mockFindFirstCase.mockResolvedValue(null);
      mockFindUniqueCase.mockImplementation(({ where }: { where: { id?: string; submissionId?: string } }) => {
        if (where.submissionId) return null;
        if (where.id === "case_regression_1") {
          return {
            id: "case_regression_1",
            caseNumber: "CASE-2026-9999",
            assignedVeterinarianUserId: null,
            assignedVeterinarianUser: null,
            animal: {
              species: "Cattle",
              herd: {
                farm: {
                  villageId: "village_x",
                  village: {
                    name: "Village X",
                    blockId: "block_y",
                    block: {
                      name: "Block Y",
                      districtId: "district_z",
                      district: { name: "District Z" },
                    },
                  },
                },
              },
            },
          };
        }
        return null;
      });

      mockCreateCase.mockResolvedValue({
        id: "case_regression_1",
        caseNumber: "CASE-2026-9999",
        animalId: "animal_a",
        createdByUserId: "farmer_1",
        status: "PENDING_REVIEW",
        reportedAt: new Date("2026-09-10T10:00:00Z"),
      });

      // 2. Active Veterinarian Vet_A in Village X
      mockFindManyUsers.mockResolvedValue([
        {
          id: "vet_a",
          name: "Dr. Vet A",
          phone: "9876543210",
          villageId: "village_x",
          blockId: "block_y",
          districtId: "district_z",
        },
      ]);
      mockGroupByCase.mockResolvedValue([]);

      mockUpdateCase.mockResolvedValue({
        id: "case_regression_1",
        caseNumber: "CASE-2026-9999",
        assignedVeterinarianUserId: "vet_a",
        assignmentLevel: "VILLAGE",
        assignedVeterinarianUser: { id: "vet_a", name: "Dr. Vet A", phone: "9876543210" },
      });

      // Execute Farmer report submission
      const farmerReportRes = await createCaseReportAction({
        submissionId: "sub_regression_1",
        animalId: "animal_a",
        symptoms: ["High fever", "Blisters"],
        durationDays: 2,
        affectedCount: 1,
        herdSize: 10,
        mortalityCount: 0,
      });

      expect(farmerReportRes.success).toBe(true);
      expect(farmerReportRes.caseId).toBe("case_regression_1");
      expect(farmerReportRes.assignedVeterinarian?.id).toBe("vet_a");
      expect(farmerReportRes.assignmentLevel).toBe("VILLAGE");
      expect(mockCreateNotification).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "vet_a",
          type: "CASE_ASSIGNED",
          link: "/vet/cases/case_regression_1",
        }),
      });

      // 3. Veterinarian Dr. Vet A logs in and opens /vet dashboard
      vi.mocked(requireActiveUser).mockResolvedValueOnce({
        id: "vet_a",
        name: "Dr. Vet A",
        phone: "9876543210",
        role: "VETERINARIAN",
        status: "ACTIVE",
        villageId: "village_x",
        blockId: "block_y",
        districtId: "district_z",
      } as unknown as FullAppUser);

      mockFindManyCases.mockImplementation(({ where }) => {
        // Verify where clause includes assignedVeterinarianUserId: "vet_a"
        if (where.assignedVeterinarianUserId === "vet_a") {
          return Promise.resolve([
            {
              id: "case_regression_1",
              caseNumber: "CASE-2026-9999",
              status: "PENDING_REVIEW",
              reportedAt: new Date("2026-09-10T10:00:00Z"),
              assignedVeterinarianUserId: "vet_a",
              assignmentLevel: "VILLAGE",
              analysisResult: null,
              createdByUser: { id: "farmer_1", name: "Farmer Ramesh", phone: "9876543210" },
              assignedVeterinarianUser: { id: "vet_a", name: "Dr. Vet A", phone: "9876543210" },
              animal: {
                tag: "ANIMAL_A",
                species: "Cattle",
                herd: {
                  farm: {
                    name: "Farm A",
                    village: { name: "Village X" },
                  },
                },
              },
            },
          ]);
        }
        return Promise.resolve([]);
      });

      // Vet fetches assigned queue (default /vet view)
      const vetQueue = await getVetQueueAction({ scope: "assigned" });

      expect(vetQueue).toHaveLength(1);
      expect(vetQueue[0].id).toBe("case_regression_1");
      expect(vetQueue[0].assignedVeterinarianUser?.id).toBe("vet_a");
      expect(vetQueue[0].status).toBe("PENDING_REVIEW");
    });

    it("should fallback to block vet when no village vet exists and appear in block vet assigned queue", async () => {
      mockFindUniqueAnimal.mockResolvedValue({
        id: "animal_b",
        tag: "ANIMAL_B",
        species: "Buffalo",
        iotDeviceId: null,
        herd: {
          farm: {
            farmerUserId: "farmer_1",
            villageId: "village_remote",
            village: {
              name: "Village Remote",
              blockId: "block_y",
              block: {
                name: "Block Y",
                districtId: "district_z",
                district: { name: "District Z" },
              },
            },
          },
        },
      });

      mockFindFirstCase.mockResolvedValue(null);
      mockFindUniqueCase.mockImplementation(({ where }: { where: { id?: string; submissionId?: string } }) => {
        if (where.submissionId) return null;
        if (where.id === "case_block_fallback") {
          return {
            id: "case_block_fallback",
            caseNumber: "CASE-2026-8888",
            assignedVeterinarianUserId: null,
            assignedVeterinarianUser: null,
            animal: {
              species: "Buffalo",
              herd: {
                farm: {
                  villageId: "village_remote",
                  village: {
                    name: "Village Remote",
                    blockId: "block_y",
                    block: {
                      name: "Block Y",
                      districtId: "district_z",
                      district: { name: "District Z" },
                    },
                  },
                },
              },
            },
          };
        }
        return null;
      });

      mockCreateCase.mockResolvedValue({
        id: "case_block_fallback",
        caseNumber: "CASE-2026-8888",
        animalId: "animal_b",
        createdByUserId: "farmer_1",
        status: "PENDING_REVIEW",
        reportedAt: new Date(),
      });

      // No vet in village_remote, but Vet B is in block_y
      mockFindManyUsers.mockResolvedValue([
        {
          id: "vet_block_b",
          name: "Dr. Block Vet",
          phone: "9876543222",
          villageId: "village_other",
          blockId: "block_y",
          districtId: "district_z",
        },
      ]);
      mockGroupByCase.mockResolvedValue([]);

      mockUpdateCase.mockResolvedValue({
        id: "case_block_fallback",
        caseNumber: "CASE-2026-8888",
        assignedVeterinarianUserId: "vet_block_b",
        assignmentLevel: "BLOCK",
        assignedVeterinarianUser: { id: "vet_block_b", name: "Dr. Block Vet", phone: "9876543222" },
      });

      const res = await createCaseReportAction({
        submissionId: "sub_block_fallback",
        animalId: "animal_b",
        symptoms: ["Lameness"],
        durationDays: 1,
        affectedCount: 1,
        herdSize: 5,
        mortalityCount: 0,
      });

      expect(res.success).toBe(true);
      expect(res.assignedVeterinarian?.id).toBe("vet_block_b");
      expect(res.assignmentLevel).toBe("BLOCK");
    });

    it("should fallback to district vet when no village/block vet exists and appear in district vet assigned queue", async () => {
      mockFindUniqueAnimal.mockResolvedValue({
        id: "animal_c",
        tag: "ANIMAL_C",
        species: "Goat",
        iotDeviceId: null,
        herd: {
          farm: {
            farmerUserId: "farmer_1",
            villageId: "village_isolated",
            village: {
              name: "Village Isolated",
              blockId: "block_isolated",
              block: {
                name: "Block Isolated",
                districtId: "district_z",
                district: { name: "District Z" },
              },
            },
          },
        },
      });

      mockFindFirstCase.mockResolvedValue(null);
      mockFindUniqueCase.mockImplementation(({ where }: { where: { id?: string; submissionId?: string } }) => {
        if (where.submissionId) return null;
        if (where.id === "case_district_fallback") {
          return {
            id: "case_district_fallback",
            caseNumber: "CASE-2026-7777",
            assignedVeterinarianUserId: null,
            assignedVeterinarianUser: null,
            animal: {
              species: "Goat",
              herd: {
                farm: {
                  villageId: "village_isolated",
                  village: {
                    name: "Village Isolated",
                    blockId: "block_isolated",
                    block: {
                      name: "Block Isolated",
                      districtId: "district_z",
                      district: { name: "District Z" },
                    },
                  },
                },
              },
            },
          };
        }
        return null;
      });

      mockCreateCase.mockResolvedValue({
        id: "case_district_fallback",
        caseNumber: "CASE-2026-7777",
        animalId: "animal_c",
        createdByUserId: "farmer_1",
        status: "PENDING_REVIEW",
        reportedAt: new Date(),
      });

      // Only Vet C in district_z (different block)
      mockFindManyUsers.mockResolvedValue([
        {
          id: "vet_district_c",
          name: "Dr. District Vet",
          phone: "9876543233",
          villageId: "village_headquarters",
          blockId: "block_headquarters",
          districtId: "district_z",
        },
      ]);
      mockGroupByCase.mockResolvedValue([]);

      mockUpdateCase.mockResolvedValue({
        id: "case_district_fallback",
        caseNumber: "CASE-2026-7777",
        assignedVeterinarianUserId: "vet_district_c",
        assignmentLevel: "DISTRICT",
        assignedVeterinarianUser: { id: "vet_district_c", name: "Dr. District Vet", phone: "9876543233" },
      });

      const res = await createCaseReportAction({
        submissionId: "sub_district_fallback",
        animalId: "animal_c",
        symptoms: ["Coughing"],
        durationDays: 4,
        affectedCount: 3,
        herdSize: 20,
        mortalityCount: 0,
      });

      expect(res.success).toBe(true);
      expect(res.assignedVeterinarian?.id).toBe("vet_district_c");
      expect(res.assignmentLevel).toBe("DISTRICT");
    });

    it("should leave case unassigned when no vet exists in district and make it visible in district service_area queue", async () => {
      mockFindUniqueAnimal.mockResolvedValue({
        id: "animal_d",
        tag: "ANIMAL_D",
        species: "Sheep",
        iotDeviceId: null,
        herd: {
          farm: {
            farmerUserId: "farmer_1",
            villageId: "village_no_vet",
            village: {
              name: "Village No Vet",
              blockId: "block_no_vet",
              block: {
                name: "Block No Vet",
                districtId: "district_empty",
                district: { name: "District Empty" },
              },
            },
          },
        },
      });

      mockFindFirstCase.mockResolvedValue(null);
      mockFindUniqueCase.mockImplementation(({ where }: { where: { id?: string; submissionId?: string } }) => {
        if (where.submissionId) return null;
        if (where.id === "case_unassigned") {
          return {
            id: "case_unassigned",
            caseNumber: "CASE-2026-6666",
            assignedVeterinarianUserId: null,
            assignedVeterinarianUser: null,
            animal: {
              species: "Sheep",
              herd: {
                farm: {
                  villageId: "village_no_vet",
                  village: {
                    name: "Village No Vet",
                    blockId: "block_no_vet",
                    block: {
                      name: "Block No Vet",
                      districtId: "district_empty",
                      district: { name: "District Empty" },
                    },
                  },
                },
              },
            },
          };
        }
        return null;
      });

      mockCreateCase.mockResolvedValue({
        id: "case_unassigned",
        caseNumber: "CASE-2026-6666",
        animalId: "animal_d",
        createdByUserId: "farmer_1",
        status: "PENDING_REVIEW",
        reportedAt: new Date(),
      });

      // No active vets in district_empty
      mockFindManyUsers.mockResolvedValue([]);

      const res = await createCaseReportAction({
        submissionId: "sub_unassigned",
        animalId: "animal_d",
        symptoms: ["Lethargy"],
        durationDays: 1,
        affectedCount: 1,
        herdSize: 10,
        mortalityCount: 0,
      });

      expect(res.success).toBe(true);
      expect(res.assignedVeterinarian).toBeNull();
      expect(res.assignmentLevel).toBeNull();
      expect(mockUpdateCase).not.toHaveBeenCalled();

      // District Authority or roving Vet in district_empty accesses service_area queue
      vi.mocked(requireActiveUser).mockResolvedValueOnce({
        id: "vet_roving",
        name: "Dr. Roving",
        phone: "9876543244",
        role: "VETERINARIAN",
        status: "ACTIVE",
        districtId: "district_empty",
      } as unknown as FullAppUser);

      mockFindManyCases.mockImplementation(({ where }) => {
        // In service_area scope, animal is filtered by districtId
        expect(where.animal.herd.farm.village.block.districtId).toBe("district_empty");
        return Promise.resolve([
          {
            id: "case_unassigned",
            caseNumber: "CASE-2026-6666",
            status: "PENDING_REVIEW",
            assignedVeterinarianUserId: null,
            assignedVeterinarianUser: null,
            animal: {
              tag: "ANIMAL_D",
              species: "Sheep",
              herd: { farm: { name: "Farm D", village: { name: "Village No Vet" } } },
            },
          },
        ]);
      });

      const serviceAreaQueue = await getVetQueueAction({ scope: "service_area" });
      expect(serviceAreaQueue).toHaveLength(1);
      expect(serviceAreaQueue[0].id).toBe("case_unassigned");
      expect(serviceAreaQueue[0].assignedVeterinarianUserId).toBeNull();
    });

    it("should strictly forbid cross-district vet assignment", async () => {
      // Vet in district_mumbai must never be selected for animal in district_pune
      mockFindManyUsers.mockResolvedValue([
        {
          id: "vet_mumbai",
          name: "Dr. Mumbai",
          phone: "9876543255",
          districtId: "district_mumbai",
        },
      ]);

      const crossDistrictCheck = await findEligibleVeterinarians({
        villageId: "v_pune",
        blockId: "b_pune",
        districtId: "district_pune",
      });

      // Because findMany queries districtId: district_pune, vet_mumbai is not returned
      expect(crossDistrictCheck).toBeNull();
    });
  });

  describe("6. Step 9 — Regression Integration: Farmer Case Creation to Vet Queue & Notifications", () => {
    it("should route farmer case at DISTRICT level when no closer village/block vet exists, verify vet queue, notification, and duplicate protection", async () => {
      // Setup ACTIVE farmer in district_d1
      vi.mocked(requireActiveUser).mockResolvedValue({
        id: "farmer_d1",
        name: "Farmer D1",
        phone: "9876540001",
        role: "FARMER",
        status: "ACTIVE",
        districtId: "district_d1",
        blockId: "block_farmer",
        villageId: "village_farmer",
      } as unknown as FullAppUser);

      // Animal on farm in district_d1 / block_farmer / village_farmer
      mockFindUniqueAnimal.mockResolvedValue({
        id: "animal_d1_01",
        tag: "COW-D1-01",
        species: "COW",
        herd: {
          farm: {
            id: "farm_d1",
            farmerUserId: "farmer_d1",
            villageId: "village_farmer",
            village: {
              id: "village_farmer",
              name: "Farmer Village",
              blockId: "block_farmer",
              block: {
                id: "block_farmer",
                name: "Farmer Block",
                districtId: "district_d1",
                district: { id: "district_d1", name: "District D1" },
              },
            },
          },
        },
      });

      // Active Vet in district_d1, but in a DIFFERENT block/village (no closer vet)
      const vetDistrictOnly = {
        id: "vet_d1_only",
        name: "Dr. District D1 Vet",
        phone: "+919876540002",
        role: "VETERINARIAN",
        status: "ACTIVE",
        districtId: "district_d1",
        blockId: "block_other",
        villageId: "village_other",
      };

      mockFindManyUsers.mockResolvedValue([vetDistrictOnly]);
      mockGroupByCase.mockResolvedValue([]);

      mockFindUniqueCase.mockImplementation(({ where }) => {
        if (where.submissionId === "sub_fresh_01") {
          return Promise.resolve(null);
        }
        if (where.id === "case_fresh_01") {
          return Promise.resolve({
            id: "case_fresh_01",
            caseNumber: "CASE-2026-999001",
            submissionId: "sub_fresh_01",
            status: "PENDING_REVIEW",
            createdByUserId: "farmer_d1",
            assignedVeterinarianUserId: null,
            assignedVeterinarianUser: null,
            assignedAt: null,
            assignmentLevel: null,
            animal: {
              id: "animal_d1_01",
              species: "COW",
              herd: {
                farm: {
                  farmerUserId: "farmer_d1",
                  villageId: "village_farmer",
                  village: {
                    id: "village_farmer",
                    name: "Farmer Village",
                    blockId: "block_farmer",
                    block: {
                      id: "block_farmer",
                      name: "Farmer Block",
                      districtId: "district_d1",
                      district: { id: "district_d1", name: "District D1" },
                    },
                  },
                },
              },
            },
          });
        }
        return Promise.resolve(null);
      });

      mockFindFirstCase.mockResolvedValue(null);

      mockCreateCase.mockResolvedValue({
        id: "case_fresh_01",
        caseNumber: "CASE-2026-999001",
        submissionId: "sub_fresh_01",
        status: "PENDING_REVIEW",
        createdByUserId: "farmer_d1",
        animalId: "animal_d1_01",
        reportedAt: new Date(),
      });

      let updatedFields: Record<string, unknown> = {};
      mockUpdateCase.mockImplementation(({ where, data }) => {
        updatedFields = { ...data };
        return Promise.resolve({
          id: where.id,
          caseNumber: "CASE-2026-999001",
          assignedVeterinarianUserId: data.assignedVeterinarianUserId,
          assignedVeterinarianUser: {
            id: vetDistrictOnly.id,
            name: vetDistrictOnly.name,
            phone: vetDistrictOnly.phone,
          },
          assignedAt: data.assignedAt,
          assignmentLevel: data.assignmentLevel,
        });
      });

      mockFindFirstNotification.mockResolvedValue(null);
      let createdNotification: { userId?: string; link?: string; type?: string } | null = null;
      mockCreateNotification.mockImplementation(({ data }) => {
        createdNotification = data;
        return Promise.resolve({ id: "notif_fresh_01", ...data });
      });

      // Execute farmer submission
      const result = await createCaseReportAction({
        submissionId: "sub_fresh_01",
        animalId: "animal_d1_01",
        symptoms: ["High Fever", "Loss of Appetite"],
        durationDays: 2,
        affectedCount: 1,
        herdSize: 5,
        mortalityCount: 0,
      });

      // Assertions
      // 1. Case exists and creation succeeded
      expect(result.success).toBe(true);
      expect(result.caseId).toBe("case_fresh_01");

      // 2. routeCaseToVeterinarian() executed and selected the district vet
      // 3. assignedVeterinarianUserId = veterinarian.id
      expect(updatedFields.assignedVeterinarianUserId).toBe("vet_d1_only");

      // 4. assignmentLevel = DISTRICT
      expect(updatedFields.assignmentLevel).toBe("DISTRICT");

      // 5. assignedAt != null
      expect(updatedFields.assignedAt).toBeInstanceOf(Date);

      // 6. Veterinarian queue returns the Case for authenticated veterinarian
      vi.mocked(requireActiveUser).mockResolvedValue({
        id: "vet_d1_only",
        name: "Dr. District D1 Vet",
        phone: "+919876540002",
        role: "VETERINARIAN",
        status: "ACTIVE",
        districtId: "district_d1",
      } as unknown as FullAppUser);

      mockFindManyCases.mockImplementation(({ where }) => {
        if (where.assignedVeterinarianUserId === "vet_d1_only") {
          return Promise.resolve([
            {
              id: "case_fresh_01",
              caseNumber: "CASE-2026-999001",
              status: "PENDING_REVIEW",
              assignedVeterinarianUserId: "vet_d1_only",
              reportedAt: new Date(),
              animal: {
                tag: "COW-D1-01",
                species: "COW",
                herd: { farm: { name: "Farm D1", village: { name: "Farmer Village" } } },
              },
            },
          ]);
        }
        return Promise.resolve([]);
      });

      const vetQueue = await getVetQueueAction({ scope: "assigned" });
      expect(vetQueue).toHaveLength(1);
      expect(vetQueue[0].id).toBe("case_fresh_01");
      expect(vetQueue[0].assignedVeterinarianUserId).toBe("vet_d1_only");

      // 7. InAppNotification created for assigned veterinarian with deep link
      expect(createdNotification).not.toBeNull();
      expect(createdNotification!.userId).toBe("vet_d1_only");
      expect(createdNotification!.link).toBe("/vet/cases/case_fresh_01");
      expect(createdNotification!.type).toBe("CASE_ASSIGNED");

      // 8. Duplicate submission with same submissionId does not create duplicate case
      vi.mocked(requireActiveUser).mockResolvedValue({
        id: "farmer_d1",
        name: "Farmer D1",
        role: "FARMER",
        status: "ACTIVE",
      } as unknown as FullAppUser);

      mockFindUniqueCase.mockImplementation(({ where }) => {
        if (where.submissionId === "sub_fresh_01" || where.id === "case_fresh_01") {
          return Promise.resolve({
            id: "case_fresh_01",
            caseNumber: "CASE-2026-999001",
            submissionId: "sub_fresh_01",
            status: "PENDING_REVIEW",
            createdByUserId: "farmer_d1",
            assignedVeterinarianUserId: "vet_d1_only",
            assignedVeterinarianUser: { id: "vet_d1_only", name: "Dr. District D1 Vet", phone: "+919876540002" },
            assignedAt: new Date(),
            assignmentLevel: "DISTRICT",
            reportedAt: new Date(),
            animal: {
              id: "animal_d1_01",
              species: "COW",
              herd: {
                farm: {
                  village: { name: "Farmer Village", block: { name: "Farmer Block", district: { name: "District D1" } } },
                },
              },
            },
          });
        }
        return Promise.resolve(null);
      });

      const duplicateRes = await createCaseReportAction({
        submissionId: "sub_fresh_01",
        animalId: "animal_d1_01",
        symptoms: ["High Fever", "Loss of Appetite"],
        durationDays: 2,
        affectedCount: 1,
        herdSize: 5,
        mortalityCount: 0,
      });

      expect(duplicateRes.success).toBe(true);
      expect(duplicateRes.caseId).toBe("case_fresh_01");
      expect(mockCreateCase).toHaveBeenCalledTimes(1); // Not called again
    });

    it("should route at BLOCK and VILLAGE levels when closer eligible veterinarians exist", async () => {
      // Animal in village_a, block_a, district_a
      const animalHierarchy = {
        villageId: "village_a",
        blockId: "block_a",
        districtId: "district_a",
      };

      const vetVillage = {
        id: "vet_vil",
        name: "Dr. Village",
        role: "VETERINARIAN",
        status: "ACTIVE",
        villageId: "village_a",
        blockId: "block_a",
        districtId: "district_a",
      };

      const vetBlock = {
        id: "vet_blk",
        name: "Dr. Block",
        role: "VETERINARIAN",
        status: "ACTIVE",
        villageId: "village_other",
        blockId: "block_a",
        districtId: "district_a",
      };

      // Test Village level winning
      mockFindManyUsers.mockResolvedValue([vetVillage, vetBlock]);
      mockGroupByCase.mockResolvedValue([]);

      const villageMatch = await findEligibleVeterinarians(animalHierarchy);
      expect(villageMatch?.level).toBe("VILLAGE");
      expect(villageMatch?.eligibleVets[0].id).toBe("vet_vil");

      // Test Block level winning when no village vet exists
      mockFindManyUsers.mockResolvedValue([vetBlock]);
      const blockMatch = await findEligibleVeterinarians(animalHierarchy);
      expect(blockMatch?.level).toBe("BLOCK");
      expect(blockMatch?.eligibleVets[0].id).toBe("vet_blk");
    });
  });
});
