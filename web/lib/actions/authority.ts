"use server";

import prisma from "@/lib/db/prisma";
import { requireDistrictAuthority } from "@/lib/auth/permissions";
import { syncClerkApplicationState } from "@/lib/auth/metadata";
import { getAuthorityDashboardMetrics, getDistrictAuthorityCommandData } from "@/lib/authority/metrics";
import { logAuditEvent } from "@/lib/audit/log";
import { createInAppNotification } from "@/lib/actions/notifications";
import { findEligibleFieldAgents } from "@/lib/geo/routing";
import { revalidatePath } from "next/cache";

/**
 * Retrieves the complete, production-ready, database-backed District Command Center data.
 * Strictly derives the district from the authenticated authority session.
 */
export async function getDistrictAuthorityCommandDataAction(filters?: {
  timeRange?: "today" | "7d" | "30d" | "90d" | "custom" | "all";
  customStartDate?: string | null;
  customEndDate?: string | null;
  blockId?: string | null;
  villageId?: string | null;
}) {
  const authority = await requireDistrictAuthority();

  let safeBlockId = filters?.blockId || null;
  let safeVillageId = filters?.villageId || null;

  if (authority.districtId && safeBlockId) {
    const block = await prisma.block.findFirst({
      where: { id: safeBlockId, districtId: authority.districtId },
    });
    if (!block) safeBlockId = null;
  }

  if (authority.districtId && safeVillageId) {
    const village = await prisma.village.findFirst({
      where: { id: safeVillageId, block: { districtId: authority.districtId } },
    });
    if (!village) safeVillageId = null;
  }

  return await getDistrictAuthorityCommandData({
    districtId: authority.districtId,
    timeRange: filters?.timeRange || "30d",
    customStartDate: filters?.customStartDate,
    customEndDate: filters?.customEndDate,
    blockId: safeBlockId,
    villageId: safeVillageId,
  });
}

/**
 * Lists all users with PENDING_APPROVAL status within the authority's jurisdiction.
 */
export async function listPendingApprovals() {
  const authority = await requireDistrictAuthority();

  const whereClause: { status: "PENDING_APPROVAL"; districtId?: string } = {
    status: "PENDING_APPROVAL",
  };

  if (authority.districtId) {
    whereClause.districtId = authority.districtId;
  }

  const pendingUsers = await prisma.user.findMany({
    where: whereClause,
    include: {
      district: true,
      block: true,
      village: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return pendingUsers;
}

/**
 * Approves a pending user account (Field Agent, Vet, or District Authority).
 * Updates Prisma status to ACTIVE and syncs Clerk publicMetadata.
 */
export async function approveUserAction(targetUserId: string) {
  const authority = await requireDistrictAuthority();

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    return { success: false, error: "Target user record not found." };
  }

  if (targetUser.status !== "PENDING_APPROVAL") {
    return { success: false, error: "User is not in PENDING_APPROVAL status." };
  }

  // Geographic jurisdiction check
  if (authority.districtId && targetUser.districtId && authority.districtId !== targetUser.districtId) {
    return { success: false, error: "Unauthorized: Target user belongs to another district." };
  }

  // Update status in Prisma
  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { status: "ACTIVE" },
  });

  // Sync Clerk publicMetadata
  await syncClerkApplicationState(updatedUser.clerkId, updatedUser.role, updatedUser.status);

  revalidatePath("/authority");
  revalidatePath("/authority/approvals");
  return { success: true, message: `Approved ${updatedUser.name} successfully.` };
}

/**
 * Rejects a pending user account.
 * Updates Prisma status to REJECTED and syncs Clerk publicMetadata.
 */
export async function rejectUserAction(targetUserId: string) {
  const authority = await requireDistrictAuthority();

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    return { success: false, error: "Target user record not found." };
  }

  // Geographic jurisdiction check
  if (authority.districtId && targetUser.districtId && authority.districtId !== targetUser.districtId) {
    return { success: false, error: "Unauthorized: Target user belongs to another district." };
  }

  // Update status in Prisma
  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { status: "REJECTED" },
  });

  // Sync Clerk publicMetadata
  await syncClerkApplicationState(updatedUser.clerkId, updatedUser.role, updatedUser.status);

  revalidatePath("/authority");
  revalidatePath("/authority/approvals");
  return { success: true, message: `Rejected ${updatedUser.name}.` };
}

/**
 * Retrieves summary surveillance metrics for the authority's district.
 */
export async function getAuthorityDashboardMetricsAction() {
  const authority = await requireDistrictAuthority();
  return await getAuthorityDashboardMetrics(authority.districtId);
}

/**
 * Retrieves active and historical alerts for the authority's district.
 */
export async function getDistrictAlertsAction() {
  const authority = await requireDistrictAuthority();

  const whereClause: { village?: { block: { districtId: string } } } = {};
  if (authority.districtId) {
    whereClause.village = {
      block: {
        districtId: authority.districtId,
      },
    };
  }

  const alerts = await prisma.alert.findMany({
    where: whereClause,
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
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });

  return alerts;
}

/**
 * Retrieves geographic surveillance hierarchy data (District -> Blocks -> Villages -> Farms -> Herds).
 */
export async function getGeographicHierarchyAction() {
  const authority = await requireDistrictAuthority();

  const districtWhere = authority.districtId ? { id: authority.districtId } : {};

  const hierarchy = await prisma.district.findMany({
    where: districtWhere,
    include: {
      blocks: {
        include: {
          villages: {
            include: {
              alerts: { where: { active: true } },
              farms: {
                include: {
                  herds: {
                    include: {
                      animals: {
                        include: {
                          cases: {
                            select: { id: true, status: true, reportedAt: true },
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
      },
    },
  });

  return hierarchy;
}

/**
 * Retrieves surveillance-scoped cases for authority inspection (no sensitive clinical notes).
 */
export async function getAuthorityCaseListAction() {
  const authority = await requireDistrictAuthority();

  const whereClause: { animal?: { herd: { farm: { village: { block: { districtId: string } } } } } } = {};
  if (authority.districtId) {
    whereClause.animal = {
      herd: {
        farm: {
          village: {
            block: {
              districtId: authority.districtId,
            },
          },
        },
      },
    };
  }

  const cases = await prisma.case.findMany({
    where: whereClause,
    select: {
      id: true,
      caseNumber: true,
      status: true,
      reportedAt: true,
      reviewedAt: true,
      confirmedAt: true,
      affectedCount: true,
      mortalityCount: true,
      analysisResult: true,
      vetDiagnosis: true,
      animal: {
        select: {
          tag: true,
          species: true,
          herd: {
            select: {
              farm: {
                select: {
                  name: true,
                  village: {
                    select: {
                      name: true,
                      block: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { reportedAt: "desc" },
    take: 50,
  });

  return cases;
}

/**
 * Broadcasts a vaccination drive recommendation to field agents covering a village
 * with an identified vaccination coverage gap and high epidemic risk.
 * Strictly protected by requireDistrictAuthority RBAC and audited via logAuditEvent.
 */
export async function recommendVaccinationDriveAction(input: {
  villageId: string;
  reason?: string | null;
}) {
  const authority = await requireDistrictAuthority();

  const village = await prisma.village.findUnique({
    where: { id: input.villageId },
    include: {
      block: {
        include: {
          district: true,
        },
      },
    },
  });

  if (!village) {
    return { success: false, error: "Village record not found." };
  }

  // Geographic jurisdiction validation
  if (authority.districtId && village.block.districtId !== authority.districtId) {
    return {
      success: false,
      error: "Unauthorized: Target village belongs to another district jurisdiction.",
    };
  }

  // 1. Locate eligible field agents covering this village / block / district
  const agentsResult = await findEligibleFieldAgents(
    village.id,
    village.blockId,
    village.block.districtId
  );

  const targetAgents = agentsResult?.eligibleAgents || [];

  // Fallback: If no tiered agents found via routing, find active field agents in the district
  let notifiedUsers = targetAgents;
  if (notifiedUsers.length === 0) {
    const districtAgents = await prisma.user.findMany({
      where: {
        role: "FIELD_AGENT",
        status: "ACTIVE",
        OR: [
          { districtId: village.block.districtId },
          { districtId: null },
        ],
      },
      select: { id: true, name: true, phone: true },
    });
    notifiedUsers = districtAgents.map((a) => ({ ...a, activeLoad: 0 }));
  }

  const notificationTitle = "Vaccination Drive Recommendation";
  const notificationMessage = `District Authority (${authority.name}) has recommended an urgent targeted vaccination drive in ${village.name} (${village.block.name}, ${village.block.district.name}) due to high disease risk and critical vaccination gap.`;

  let sentCount = 0;
  for (const agent of notifiedUsers) {
    const notif = await createInAppNotification({
      userId: agent.id,
      title: notificationTitle,
      message: notificationMessage,
      link: "/agent",
      type: "VACCINATION_RECOMMENDATION",
    });
    if (notif) sentCount++;
  }

  // 2. Immutable AuditLog entry
  await logAuditEvent(
    authority.id,
    "RECOMMEND_VACCINATION_DRIVE",
    null,
    null,
    {
      villageId: village.id,
      villageName: village.name,
      blockId: village.blockId,
      blockName: village.block.name,
      districtId: village.block.districtId,
      districtName: village.block.district.name,
      notifiedCount: sentCount,
      notifiedAgentIds: notifiedUsers.map((a) => a.id),
      reason: input.reason || "Under-vaccinated high-risk cluster overlay action",
    },
    input.reason || `Recommended vaccination drive for ${village.name}`
  );

  try {
    revalidatePath("/authority");
  } catch {
    // Safe fallback in test or non-request context
  }

  return {
    success: true,
    notifiedCount: sentCount,
    villageName: village.name,
    message: `Vaccination drive recommendation successfully broadcasted to ${sentCount} field agent(s).`,
  };
}
