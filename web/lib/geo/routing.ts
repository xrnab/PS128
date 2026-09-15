import prisma from "@/lib/db/prisma";
import { FullAppUser } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";
import { dispatchTelegramNotification } from "@/lib/telegram/delivery";

export enum LocationMatchTier {
  SAME_VILLAGE = "SAME_VILLAGE",
  SAME_BLOCK = "SAME_BLOCK",
  SAME_DISTRICT = "SAME_DISTRICT",
  NO_MATCH = "NO_MATCH",
}

export type AssignmentLevel = "VILLAGE" | "BLOCK" | "DISTRICT";

export interface LocationCoordinates {
  villageId?: string | null;
  blockId?: string | null;
  districtId?: string | null;
}

export interface RoutedLocationInfo {
  villageName?: string | null;
  blockName?: string | null;
  districtName?: string | null;
}

export interface AssignedUserInfo {
  id: string;
  name: string;
  phone?: string | null;
}

/**
 * Calculates matching tier and priority score between a user and a target resource location.
 * Priority:
 * 1. Same village / locality (Score: 100)
 * 2. Same block / subdistrict / town (Score: 50)
 * 3. Same district (Score: 10)
 * 4. Cross-district / No Match (Score: 0)
 */
export function calculateLocationMatch(
  userLoc: LocationCoordinates,
  targetLoc: LocationCoordinates
): { tier: LocationMatchTier; score: number } {
  if (!targetLoc.districtId && !targetLoc.blockId && !targetLoc.villageId) {
    return { tier: LocationMatchTier.NO_MATCH, score: 0 };
  }

  // 1. Same village match
  if (userLoc.villageId && targetLoc.villageId && userLoc.villageId === targetLoc.villageId) {
    return { tier: LocationMatchTier.SAME_VILLAGE, score: 100 };
  }

  // 2. Same block match
  if (userLoc.blockId && targetLoc.blockId && userLoc.blockId === targetLoc.blockId) {
    return { tier: LocationMatchTier.SAME_BLOCK, score: 50 };
  }

  // 3. Same district match
  if (userLoc.districtId && targetLoc.districtId && userLoc.districtId === targetLoc.districtId) {
    return { tier: LocationMatchTier.SAME_DISTRICT, score: 10 };
  }

  // If user has no district assigned (global admin/roaming scenario)
  if (!userLoc.districtId && !userLoc.blockId && !userLoc.villageId) {
    return { tier: LocationMatchTier.SAME_DISTRICT, score: 5 };
  }

  return { tier: LocationMatchTier.NO_MATCH, score: 0 };
}

/**
 * Checks whether an authenticated user is authorized to view/access a resource with the given location.
 * Cross-district access is strictly denied.
 */
export function isLocationAuthorized(
  user: { role: UserRole; districtId?: string | null; blockId?: string | null; villageId?: string | null },
  targetLoc: LocationCoordinates
): boolean {
  if (user.districtId) {
    if (!targetLoc.districtId || user.districtId !== targetLoc.districtId) {
      return false;
    }
  }

  if (user.role === "FIELD_AGENT") {
    if (user.villageId && targetLoc.villageId && user.villageId === targetLoc.villageId) {
      return true;
    }
    if (user.blockId && targetLoc.blockId && user.blockId === targetLoc.blockId) {
      return true;
    }
    if (user.districtId && targetLoc.districtId && user.districtId === targetLoc.districtId) {
      return true;
    }
    return !user.districtId;
  }

  return true;
}

/**
 * Checks whether a user can access a specific health Case.
 */
export function canUserAccessCaseRecord(
  appUser: FullAppUser,
  healthCase: {
    id: string;
    createdByUserId: string;
    assignedVeterinarianUserId?: string | null;
    animal: {
      herd: {
        farm: {
          farmerUserId: string | null;
          fieldAgentUserId: string | null;
          villageId: string;
          village: {
            blockId: string;
            block: {
              districtId: string;
            };
          };
        };
      };
    };
  }
): boolean {
  const farm = healthCase.animal.herd.farm;
  const caseLocation: LocationCoordinates = {
    villageId: farm.villageId,
    blockId: farm.village.blockId,
    districtId: farm.village.block.districtId,
  };

  // 1. Farmer Access: Farmer owns the animal OR created the report
  if (appUser.role === "FARMER") {
    return healthCase.createdByUserId === appUser.id || farm.farmerUserId === appUser.id;
  }

  // 2. Field Agent Access: Agent created report, is assigned to farm, or in scope
  if (appUser.role === "FIELD_AGENT") {
    if (healthCase.createdByUserId === appUser.id || farm.fieldAgentUserId === appUser.id) {
      return true;
    }
    return isLocationAuthorized(appUser, caseLocation);
  }

  // 3. Veterinarian Access: Assigned to this vet OR within Vet's assigned district jurisdiction
  if (appUser.role === "VETERINARIAN") {
    if (healthCase.assignedVeterinarianUserId === appUser.id) return true;
    if (!appUser.districtId) return true;
    return farm.village.block.districtId === appUser.districtId;
  }

  // 4. District Authority Access: Within Authority's assigned district
  if (appUser.role === "DISTRICT_AUTHORITY") {
    if (!appUser.districtId) return true;
    return farm.village.block.districtId === appUser.districtId;
  }

  return false;
}

/**
 * Checks whether a user can access an Assistance Request.
 */
export function canUserAccessAssistanceRequest(
  appUser: FullAppUser,
  request: {
    id: string;
    farmerUserId: string;
    assignedFieldAgentUserId?: string | null;
    village?: {
      id: string;
      blockId: string;
      block: {
        districtId: string;
      };
    } | null;
  }
): boolean {
  if (appUser.role === "FARMER") {
    return request.farmerUserId === appUser.id;
  }

  if (appUser.role === "FIELD_AGENT") {
    if (request.assignedFieldAgentUserId === appUser.id) {
      return true;
    }
    if (!request.village) return true;
    const reqLocation: LocationCoordinates = {
      villageId: request.village.id,
      blockId: request.village.blockId,
      districtId: request.village.block.districtId,
    };
    return isLocationAuthorized(appUser, reqLocation);
  }

  if (appUser.role === "VETERINARIAN" || appUser.role === "DISTRICT_AUTHORITY") {
    if (!appUser.districtId) return true;
    if (!request.village) return true;
    return request.village.block.districtId === appUser.districtId;
  }

  return false;
}

/**
 * Helper to resolve hierarchy (blockId, districtId) from villageId/blockId if missing.
 */
async function resolveHierarchyIds(loc: LocationCoordinates): Promise<{
  resolvedVillageId?: string | null;
  resolvedBlockId?: string | null;
  resolvedDistrictId?: string | null;
}> {
  const resolvedVillageId = loc.villageId || null;
  let resolvedBlockId = loc.blockId || null;
  let resolvedDistrictId = loc.districtId || null;

  if (resolvedVillageId && (!resolvedBlockId || !resolvedDistrictId)) {
    const v = await prisma.village.findUnique({
      where: { id: resolvedVillageId },
      include: { block: true },
    });
    if (v) {
      resolvedBlockId = resolvedBlockId || v.blockId;
      resolvedDistrictId = resolvedDistrictId || v.block.districtId;
    }
  }

  if (resolvedBlockId && !resolvedDistrictId) {
    const b = await prisma.block.findUnique({
      where: { id: resolvedBlockId },
    });
    if (b) {
      resolvedDistrictId = b.districtId;
    }
  }

  return { resolvedVillageId, resolvedBlockId, resolvedDistrictId };
}

/**
 * Finds eligible active VETERINARIANS in hierarchical tiers:
 * Tier 1: Same Village
 * Tier 2: Same Block
 * Tier 3: Same District
 * Within the winning tier, sorts by least active case workload with deterministic ID tie-breaking.
 */
export async function findEligibleVeterinarians(loc: LocationCoordinates): Promise<{
  eligibleVets: Array<{ id: string; name: string; phone?: string | null; activeLoad: number }>;
  level: AssignmentLevel;
} | null> {
  const { resolvedVillageId, resolvedBlockId, resolvedDistrictId } = await resolveHierarchyIds(loc);

  if (!resolvedDistrictId) {
    return null;
  }

  // Strictly forbid cross-district: only users belonging to resolvedDistrictId (or roaming districtId=null)
  const allDistrictVets = await prisma.user.findMany({
    where: {
      role: "VETERINARIAN",
      status: "ACTIVE",
      OR: [
        { districtId: resolvedDistrictId },
        { districtId: null },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      villageId: true,
      blockId: true,
      districtId: true,
    },
  });

  if (allDistrictVets.length === 0) {
    return null;
  }

  // Tier 1: Same Village
  let winningTierCandidates = resolvedVillageId
    ? allDistrictVets.filter((v) => v.villageId === resolvedVillageId)
    : [];
  let level: AssignmentLevel = "VILLAGE";

  // Tier 2: Same Block
  if (winningTierCandidates.length === 0 && resolvedBlockId) {
    winningTierCandidates = allDistrictVets.filter((v) => v.blockId === resolvedBlockId);
    level = "BLOCK";
  }

  // Tier 3: Same District
  if (winningTierCandidates.length === 0) {
    winningTierCandidates = allDistrictVets.filter(
      (v) => v.districtId === resolvedDistrictId || v.districtId === null
    );
    level = "DISTRICT";
  }

  if (winningTierCandidates.length === 0) {
    return null;
  }

  // Calculate active workload for candidates in the winning tier
  const candidateIds = winningTierCandidates.map((c) => c.id);
  const activeCasesPerVet = await prisma.case.groupBy({
    by: ["assignedVeterinarianUserId"],
    where: {
      assignedVeterinarianUserId: { in: candidateIds },
      status: { in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"] },
    },
    _count: { id: true },
  });

  const loadMap = new Map<string, number>();
  for (const row of activeCasesPerVet) {
    if (row.assignedVeterinarianUserId) {
      loadMap.set(row.assignedVeterinarianUserId, row._count.id);
    }
  }

  const scoredVets = winningTierCandidates.map((vet) => ({
    id: vet.id,
    name: vet.name,
    phone: vet.phone,
    activeLoad: loadMap.get(vet.id) || 0,
  }));

  // Sort by lowest activeLoad ASC, and fairly shuffle candidates tied at the same activeLoad
  const loadGroups = new Map<number, typeof scoredVets>();
  for (const vet of scoredVets) {
    const list = loadGroups.get(vet.activeLoad) || [];
    list.push(vet);
    loadGroups.set(vet.activeLoad, list);
  }

  const sortedLoads = Array.from(loadGroups.keys()).sort((a, b) => a - b);
  const resultVets: typeof scoredVets = [];

  for (const load of sortedLoads) {
    const group = loadGroups.get(load)!;
    // Fisher-Yates random shuffle among tied candidates
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
    resultVets.push(...group);
  }

  return { eligibleVets: resultVets, level };
}

/**
 * Finds eligible active FIELD AGENTS in hierarchical tiers:
 * Tier 1: Same Village
 * Tier 2: Same Block
 * Tier 3: Same District
 * Within the winning tier, sorts by least active assistance request workload with deterministic ID tie-breaking.
 */
export async function findEligibleFieldAgents(
  villageId?: string | null,
  blockId?: string | null,
  districtId?: string | null
): Promise<{
  eligibleAgents: Array<{ id: string; name: string; phone?: string | null; activeLoad: number }>;
  level: AssignmentLevel;
} | null> {
  const { resolvedVillageId, resolvedBlockId, resolvedDistrictId } = await resolveHierarchyIds({
    villageId,
    blockId,
    districtId,
  });

  if (!resolvedDistrictId) {
    return null;
  }

  // Strictly forbid cross-district
  const allDistrictAgents = await prisma.user.findMany({
    where: {
      role: "FIELD_AGENT",
      status: "ACTIVE",
      OR: [
        { districtId: resolvedDistrictId },
        { districtId: null },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      villageId: true,
      blockId: true,
      districtId: true,
    },
  });

  if (allDistrictAgents.length === 0) {
    return null;
  }

  // Tier 1: Same Village
  let winningTierCandidates = resolvedVillageId
    ? allDistrictAgents.filter((a) => a.villageId === resolvedVillageId)
    : [];
  let level: AssignmentLevel = "VILLAGE";

  // Tier 2: Same Block
  if (winningTierCandidates.length === 0 && resolvedBlockId) {
    winningTierCandidates = allDistrictAgents.filter((a) => a.blockId === resolvedBlockId);
    level = "BLOCK";
  }

  // Tier 3: Same District
  if (winningTierCandidates.length === 0) {
    winningTierCandidates = allDistrictAgents.filter(
      (a) => a.districtId === resolvedDistrictId || a.districtId === null
    );
    level = "DISTRICT";
  }

  if (winningTierCandidates.length === 0) {
    return null;
  }

  // Calculate active workload for candidates in the winning tier
  const candidateIds = winningTierCandidates.map((c) => c.id);
  const activeRequestsPerAgent = await prisma.assistanceRequest.groupBy({
    by: ["assignedFieldAgentUserId"],
    where: {
      assignedFieldAgentUserId: { in: candidateIds },
      status: { in: ["REQUESTED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
    },
    _count: { id: true },
  });

  const loadMap = new Map<string, number>();
  for (const row of activeRequestsPerAgent) {
    if (row.assignedFieldAgentUserId) {
      loadMap.set(row.assignedFieldAgentUserId, row._count.id);
    }
  }

  const scoredAgents = winningTierCandidates.map((agent) => ({
    id: agent.id,
    name: agent.name,
    phone: agent.phone,
    activeLoad: loadMap.get(agent.id) || 0,
  }));

  // Sort by lowest active load ASC, then deterministic ID ASC
  scoredAgents.sort((a, b) => {
    if (a.activeLoad !== b.activeLoad) {
      return a.activeLoad - b.activeLoad;
    }
    return a.id.localeCompare(b.id);
  });

  return { eligibleAgents: scoredAgents, level };
}

/**
 * Server-side routing: routes a Case to the most appropriate active veterinarian.
 * Idempotent: does not duplicate assignment or notification if already assigned.
 */
export async function routeCaseToVeterinarian(caseId: string): Promise<{
  success: boolean;
  caseId: string;
  caseNumber: string;
  assignedVeterinarian: AssignedUserInfo | null;
  assignmentLevel: AssignmentLevel | null;
  location: RoutedLocationInfo;
}> {
  const healthCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      animal: {
        include: {
          herd: {
            include: {
              farm: {
                include: {
                  village: {
                    include: {
                      block: {
                        include: {
                          district: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      assignedVeterinarianUser: {
        select: { id: true, name: true, phone: true },
      },
    },
  });

  if (!healthCase) {
    throw new Error("Case record not found for veterinarian routing.");
  }

  const farm = healthCase.animal.herd.farm;
  const location: RoutedLocationInfo = {
    villageName: farm.village?.name || null,
    blockName: farm.village?.block?.name || null,
    districtName: farm.village?.block?.district?.name || null,
  };

  // Idempotency check: if already assigned, return existing assignment
  if (healthCase.assignedVeterinarianUserId && healthCase.assignedVeterinarianUser) {
    return {
      success: true,
      caseId: healthCase.id,
      caseNumber: healthCase.caseNumber,
      assignedVeterinarian: healthCase.assignedVeterinarianUser,
      assignmentLevel: (healthCase.assignmentLevel as AssignmentLevel) || "DISTRICT",
      location,
    };
  }

  const locationCoords: LocationCoordinates = {
    villageId: farm.villageId,
    blockId: farm.village?.blockId,
    districtId: farm.village?.block?.districtId,
  };

  const match = await findEligibleVeterinarians(locationCoords);

  if (!match || match.eligibleVets.length === 0) {
    // Awaiting assignment state: leave assignedVeterinarianUserId = null, assignmentLevel = null
    return {
      success: true,
      caseId: healthCase.id,
      caseNumber: healthCase.caseNumber,
      assignedVeterinarian: null,
      assignmentLevel: null,
      location,
    };
  }

  const topVet = match.eligibleVets[0];

  const updatedCase = await prisma.case.update({
    where: { id: caseId },
    data: {
      assignedVeterinarianUserId: topVet.id,
      assignedAt: new Date(),
      assignmentLevel: match.level,
    },
    include: {
      assignedVeterinarianUser: {
        select: { id: true, name: true, phone: true },
      },
    },
  });

  // Create InAppNotification for assigned veterinarian (deduplicated by link)
  const notificationLink = `/vet/cases/${caseId}`;
  const existingNotification = await prisma.inAppNotification.findFirst({
    where: {
      userId: topVet.id,
      link: notificationLink,
    },
  });

  if (!existingNotification) {
    const locString = location.villageName
      ? `${location.villageName}`
      : location.blockName
      ? `${location.blockName}`
      : location.districtName
      ? `${location.districtName}`
      : "your jurisdiction";

    const createdNotification = await prisma.inAppNotification.create({
      data: {
        userId: topVet.id,
        title: `New Case in ${locString}`,
        message: `Case #${healthCase.caseNumber} (${healthCase.animal.species}) requires veterinary review.`,
        link: notificationLink,
        type: "CASE_ASSIGNED",
      },
    });

    if (createdNotification?.id) {
      dispatchTelegramNotification(createdNotification.id).catch((err) => {
        console.error("[Telegram Dispatch Error]:", err);
      });
    }
  }

  return {
    success: true,
    caseId: updatedCase.id,
    caseNumber: updatedCase.caseNumber,
    assignedVeterinarian: updatedCase.assignedVeterinarianUser,
    assignmentLevel: match.level,
    location,
  };
}

/**
 * Server-side routing: routes an AssistanceRequest to the most appropriate active field agent.
 * Idempotent: does not duplicate assignment or notification if already assigned.
 */
export async function routeAssistanceRequestToFieldAgent(requestId: string): Promise<{
  success: boolean;
  requestId: string;
  assignedFieldAgent: AssignedUserInfo | null;
  assignmentLevel: AssignmentLevel | null;
  location: RoutedLocationInfo;
}> {
  const request = await prisma.assistanceRequest.findUnique({
    where: { id: requestId },
    include: {
      farm: {
        include: {
          village: {
            include: {
              block: {
                include: {
                  district: true,
                },
              },
            },
          },
        },
      },
      village: {
        include: {
          block: {
            include: {
              district: true,
            },
          },
        },
      },
      farmerUser: { select: { id: true, name: true, phone: true } },
      assignedFieldAgentUser: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!request) {
    throw new Error("Assistance request record not found for field agent routing.");
  }

  const villageName = request.village?.name || request.farm.village?.name || null;
  const blockName = request.village?.block?.name || request.farm.village?.block?.name || null;
  const districtName = request.village?.block?.district?.name || request.farm.village?.block?.district?.name || null;

  const location: RoutedLocationInfo = {
    villageName,
    blockName,
    districtName,
  };

  // Idempotency check: if already assigned, return existing assignment
  if (request.assignedFieldAgentUserId && request.assignedFieldAgentUser) {
    return {
      success: true,
      requestId: request.id,
      assignedFieldAgent: request.assignedFieldAgentUser,
      assignmentLevel: (request.assignmentLevel as AssignmentLevel) || "DISTRICT",
      location,
    };
  }

  const villageId = request.villageId || request.farm.villageId;
  const blockId = request.blockId || request.village?.blockId || request.farm.village?.blockId;
  const districtId = request.districtId || request.village?.block?.districtId || request.farm.village?.block?.districtId;

  const match = await findEligibleFieldAgents(villageId, blockId, districtId);

  if (!match || match.eligibleAgents.length === 0) {
    // Waiting state: unassigned in queue
    return {
      success: true,
      requestId: request.id,
      assignedFieldAgent: null,
      assignmentLevel: null,
      location,
    };
  }

  const topAgent = match.eligibleAgents[0];

  const updated = await prisma.assistanceRequest.update({
    where: { id: requestId },
    data: {
      assignedFieldAgentUserId: topAgent.id,
      assignedAt: new Date(),
      assignmentLevel: match.level,
      status: "ASSIGNED",
    },
    include: {
      assignedFieldAgentUser: {
        select: { id: true, name: true, phone: true },
      },
    },
  });

  // Create InAppNotification for assigned field agent
  const notificationLink = `/agent?requestId=${requestId}`;
  const existingNotification = await prisma.inAppNotification.findFirst({
    where: {
      userId: topAgent.id,
      link: notificationLink,
    },
  });

  if (!existingNotification) {
    const locString = villageName || blockName || districtName || "your area";
    const createdNotification = await prisma.inAppNotification.create({
      data: {
        userId: topAgent.id,
        title: `New Field Assistance Request in ${locString}`,
        message: `${request.farmerUser.name} requested field assistance at ${request.farm.name}. Reason: "${request.reason}"`,
        link: notificationLink,
        type: "ASSISTANCE_ASSIGNED",
      },
    });

    if (createdNotification?.id) {
      dispatchTelegramNotification(createdNotification.id).catch((err) => {
        console.error("[Telegram Dispatch Error]:", err);
      });
    }
  }

  return {
    success: true,
    requestId: updated.id,
    assignedFieldAgent: updated.assignedFieldAgentUser,
    assignmentLevel: match.level,
    location,
  };
}
