import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import prisma from "@/lib/db/prisma";
import { processIvrTurn } from "@/lib/actions/ivr";
import * as authPermissions from "@/lib/auth/permissions";
import * as authSession from "@/lib/auth/session";

describe("IVR End-to-End Database Integration & Data Persistence", () => {
  const testPrefix = `ivr_db_${Date.now()}_`;
  let district: any;
  let block: any;
  let village: any;
  let farmerUser: any;
  let vetUser: any;
  let agentUser: any;
  let farm: any;
  let herd: any;
  let animal: any;

  beforeAll(async () => {
    // 1. Create real geographical hierarchy
    district = await prisma.district.create({
      data: { name: `${testPrefix}District` },
    });

    block = await prisma.block.create({
      data: { name: `${testPrefix}Block`, districtId: district.id },
    });

    village = await prisma.village.create({
      data: { name: `${testPrefix}Village`, blockId: block.id },
    });

    // 2. Create Farmer user
    farmerUser = await prisma.user.create({
      data: {
        clerkId: `clerk_${testPrefix}farmer`,
        role: "FARMER",
        status: "ACTIVE",
        name: "Santosh Patil",
        phone: "+919811223344",
        preferredLanguage: "en",
        districtId: district.id,
        blockId: block.id,
        villageId: village.id,
      },
    });

    // 3. Create active Veterinarian for routing
    vetUser = await prisma.user.create({
      data: {
        clerkId: `clerk_${testPrefix}vet`,
        role: "VETERINARIAN",
        status: "ACTIVE",
        name: "Dr. Sandeep Kulkarni",
        phone: "+919811223355",
        districtId: district.id,
        blockId: block.id,
        villageId: village.id,
      },
    });

    // 4. Create active Field Agent for routing
    agentUser = await prisma.user.create({
      data: {
        clerkId: `clerk_${testPrefix}agent`,
        role: "FIELD_AGENT",
        status: "ACTIVE",
        name: "Rekha Tai Pashu Sakhi",
        phone: "+919811223366",
        districtId: district.id,
        blockId: block.id,
        villageId: village.id,
      },
    });

    // 5. Create Farm, Herd, and Animal
    farm = await prisma.farm.create({
      data: {
        name: "Patil Organic Dairy",
        farmerUserId: farmerUser.id,
        villageId: village.id,
        latitude: 18.5204,
        longitude: 73.8567,
      },
    });

    herd = await prisma.herd.create({
      data: {
        name: "Milking Herd",
        farmId: farm.id,
        species: "COW",
      },
    });

    animal = await prisma.animal.create({
      data: {
        tag: `IVR-${Math.floor(1000 + Math.random() * 9000)}`,
        species: "COW",
        breed: "Sahiwal",
        herdId: herd.id,
      },
    });

    // Mock requireFarmer and requireActiveUser to return our real persisted DB user
    vi.spyOn(authPermissions, "requireFarmer").mockResolvedValue({
      ...farmerUser,
      village,
      block,
      district,
    } as any);

    vi.spyOn(authSession, "requireActiveUser").mockResolvedValue({
      ...farmerUser,
      village,
      block,
      district,
    } as any);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    // Clean up created entities
    try {
      if (animal?.id) await prisma.case.deleteMany({ where: { animalId: animal.id } });
      if (farm?.id) await prisma.assistanceRequest.deleteMany({ where: { farmId: farm.id } });
      if (animal?.id) await prisma.animal.deleteMany({ where: { id: animal.id } });
      if (herd?.id) await prisma.herd.deleteMany({ where: { id: herd.id } });
      if (farm?.id) await prisma.farm.deleteMany({ where: { id: farm.id } });
      if (farmerUser?.id) await prisma.user.deleteMany({ where: { id: farmerUser.id } });
      if (vetUser?.id) await prisma.user.deleteMany({ where: { id: vetUser.id } });
      if (agentUser?.id) await prisma.user.deleteMany({ where: { id: agentUser.id } });
      if (village?.id) await prisma.village.deleteMany({ where: { id: village.id } });
      if (block?.id) await prisma.block.deleteMany({ where: { id: block.id } });
      if (district?.id) await prisma.district.deleteMany({ where: { id: district.id } });
    } catch {
      // Ignored in cleanup
    }
  });

  it("persists a real Case record to Prisma database when completing Branch 1 (Report Health Concern)", async () => {
    // 1. Initial menu -> select Option 1
    const t0 = await processIvrTurn(null, "", "en");
    expect(t0.newState?.step).toBe("MENU");

    // 2. Select 1 (Report Concern) -> fetches real animal from DB
    const t1 = await processIvrTurn(t0.newState, "1", "en");
    expect(t1.newState?.step).toBe("REPORT_SELECT_ANIMAL");
    expect(t1.options?.some((opt) => opt.label.includes(animal.tag))).toBe(true);

    // 3. Select animal 1 -> prompt symptoms
    const t2 = await processIvrTurn(t1.newState, "1", "en");
    expect(t2.newState?.step).toBe("REPORT_SELECT_SYMPTOMS");
    expect(t2.newState?.animalId).toBe(animal.id);

    // 4. Select symptom 1 (High Fever) -> prompt duration
    const t3 = await processIvrTurn(t2.newState, "1", "en");
    expect(t3.newState?.step).toBe("REPORT_DURATION_AFFECTED");

    // 5. Select duration 1 (Today) -> prompt confirm
    const t4 = await processIvrTurn(t3.newState, "1", "en");
    expect(t4.newState?.step).toBe("REPORT_CONFIRM");

    // 6. Confirm 1 -> executes real database transaction and AI analysis
    const t5 = await processIvrTurn(t4.newState, "1", "en");
    expect(t5.done).toBe(true);
    expect(t5.result?.kind).toBe("REPORT");
    expect(t5.result?.caseNumber).toBeDefined();

    // Verify record directly in Prisma Database
    const persistedCase = await prisma.case.findFirst({
      where: { animalId: animal.id },
      include: {
        assignedVeterinarianUser: true,
        animal: true,
      },
    });

    expect(persistedCase).not.toBeNull();
    expect(persistedCase?.caseNumber).toBe(t5.result?.caseNumber);
    expect(persistedCase?.status).toBe("PENDING_REVIEW");
    expect(persistedCase?.symptoms).toContain("Fever");
    expect(persistedCase?.createdByUserId).toBe(farmerUser.id);
    expect(persistedCase?.assignedVeterinarianUserId).toBe(vetUser.id);
  });

  it("persists a real AssistanceRequest record to Prisma database when completing Branch 2 (Field Agent Request)", async () => {
    // 1. Initial menu -> select Option 2 (Field Agent)
    const t0 = await processIvrTurn(null, "", "en");
    const t1 = await processIvrTurn(t0.newState, "2", "en");
    expect(t1.newState?.step).toBe("HELP_SELECT_ANIMAL");

    // 2. Select 0 (General herd visit)
    const t2 = await processIvrTurn(t1.newState, "0", "en");
    expect(t2.newState?.step).toBe("HELP_REASON");

    // 3. Select 4 (Custom reason)
    const t3 = await processIvrTurn(t2.newState, "4", "en");
    expect(t3.newState?.step).toBe("HELP_REASON_CUSTOM");

    // 4. Enter custom reason >= 5 characters
    const customReason = "Cows showing sudden lethargy and reduced milk yield";
    const t4 = await processIvrTurn(t3.newState, customReason, "en");
    expect(t4.newState?.step).toBe("HELP_CONFIRM");
    expect(t4.newState?.reason).toBe(customReason);

    // 5. Confirm 1 -> executes real database transaction and agent routing
    const t5 = await processIvrTurn(t4.newState, "1", "en");
    expect(t5.done).toBe(true);
    expect(t5.result?.kind).toBe("ASSISTANCE");
    expect(t5.result?.requestId).toBeDefined();

    // Verify record directly in Prisma Database
    const persistedRequest = await prisma.assistanceRequest.findUnique({
      where: { id: t5.result?.requestId },
      include: {
        assignedFieldAgentUser: true,
        farm: true,
      },
    });

    expect(persistedRequest).not.toBeNull();
    expect(persistedRequest?.farmId).toBe(farm.id);
    expect(persistedRequest?.farmerUserId).toBe(farmerUser.id);
    expect(persistedRequest?.reason).toBe(customReason);
    expect(persistedRequest?.status).toBe("ASSIGNED");
    expect(persistedRequest?.assignedFieldAgentUserId).toBe(agentUser.id);
  });
});
