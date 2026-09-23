// import "server-only";
import prisma from "@/lib/db/prisma";
import { getCurrentAppUser, FullAppUser } from "@/lib/auth/session";
import { storageProvider } from "./index";

export class PhotoAuthorizationError extends Error {
  constructor(message: string = "Unauthorized to access animal photograph") {
    super(message);
    this.name = "PhotoAuthorizationError";
  }
}

export interface CaseLocationData {
  id: string;
  photoUrl: string | null;
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

/**
 * Checks whether the given authenticated user has authorization to access the specified Case photo.
 */
export function canUserAccessCase(appUser: FullAppUser, healthCase: CaseLocationData): boolean {
  // 0. Administrator Access: Universal access across all cases and media
  if (appUser.role === "ADMIN") {
    return true;
  }

  // 1. Farmer Access: Farmer owns the animal OR created the report
  if (appUser.role === "FARMER") {
    return (
      healthCase.createdByUserId === appUser.id ||
      healthCase.animal.herd.farm.farmerUserId === appUser.id
    );
  }

  // 2. Field Agent Access: Agent created the report, is assigned to the farm, or farm lies within agent's geographic scope
  if (appUser.role === "FIELD_AGENT") {
    const farm = healthCase.animal.herd.farm;
    const isReporter = healthCase.createdByUserId === appUser.id;
    const isAssigned = farm.fieldAgentUserId === appUser.id;
    const isSameVillage = Boolean(appUser.villageId && farm.villageId === appUser.villageId);
    const isSameBlock = Boolean(appUser.blockId && farm.village.blockId === appUser.blockId);
    const isSameDistrict = Boolean(
      appUser.districtId && farm.village.block.districtId === appUser.districtId
    );

    return isReporter || isAssigned || isSameVillage || isSameBlock || isSameDistrict;
  }

  // 3. Veterinarian Access: Directly assigned to Vet OR lies within Vet's assigned district (or unassigned/global vet)
  if (appUser.role === "VETERINARIAN" || (appUser.role as string) === "VET") {
    if (healthCase.assignedVeterinarianUserId === appUser.id) return true;
    if (!appUser.districtId) return true;
    return healthCase.animal.herd.farm.village.block.districtId === appUser.districtId;
  }

  // 4. District Authority Access: Case lies within Authority's assigned district (or unassigned/global authority)
  if (appUser.role === "DISTRICT_AUTHORITY") {
    if (!appUser.districtId) return true;
    return healthCase.animal.herd.farm.village.block.districtId === appUser.districtId;
  }

  return false;
}

/**
 * Server-side function to retrieve private access information for a Case photo.
 * Authenticates current user, loads Case, verifies role authorization, and returns photo reference.
 */
export async function getAuthorizedCasePhoto(caseId: string): Promise<{
  success: boolean;
  photoUrl?: string;
  error?: string;
}> {
  try {
    const appUser = await getCurrentAppUser();
    if (!appUser || appUser.status !== "ACTIVE") {
      return { success: false, error: "Unauthorized access: Active user required." };
    }

    const healthCase = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        photoUrl: true,
        createdByUserId: true,
        assignedVeterinarianUserId: true,
        animal: {
          select: {
            herd: {
              select: {
                farm: {
                  select: {
                    farmerUserId: true,
                    fieldAgentUserId: true,
                    villageId: true,
                    village: {
                      select: {
                        blockId: true,
                        block: {
                          select: {
                            districtId: true,
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

    if (!healthCase) {
      return { success: false, error: "Health case not found." };
    }

    if (!healthCase.photoUrl) {
      return { success: false, error: "No photo attached to this case." };
    }

    const isAuthorized = canUserAccessCase(appUser, healthCase);
    if (!isAuthorized) {
      return { success: false, error: "Unauthorized access to case photograph." };
    }

    return {
      success: true,
      photoUrl: healthCase.photoUrl,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to authorize photo access.";
    return { success: false, error: message };
  }
}

/**
 * Server-only helper for authorized photo deletion/replacement.
 */
export async function deleteCasePhoto(caseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const appUser = await getCurrentAppUser();
    if (!appUser || appUser.status !== "ACTIVE") {
      return { success: false, error: "Unauthorized access: Active user required." };
    }

    const healthCase = await prisma.case.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        photoUrl: true,
        createdByUserId: true,
        assignedVeterinarianUserId: true,
        animal: {
          select: {
            herd: {
              select: {
                farm: {
                  select: {
                    farmerUserId: true,
                    fieldAgentUserId: true,
                    villageId: true,
                    village: {
                      select: {
                        blockId: true,
                        block: {
                          select: {
                            districtId: true,
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

    if (!healthCase) {
      return { success: false, error: "Case not found." };
    }

    if (!canUserAccessCase(appUser, healthCase)) {
      return { success: false, error: "Unauthorized to delete case photo." };
    }

    if (healthCase.photoUrl) {
      // Delete object from blob storage
      await storageProvider.delete(healthCase.photoUrl);

      // Update case reference
      await prisma.case.update({
        where: { id: caseId },
        data: { photoUrl: null },
      });
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete case photo.";
    return { success: false, error: message };
  }
}

/**
 * Safely cleans up orphaned blob storage objects when database association fails.
 */
export async function cleanupOrphanPhoto(photoUrl: string | null | undefined): Promise<void> {
  if (!photoUrl) return;
  try {
    await storageProvider.delete(photoUrl);
  } catch (err) {
    console.error("[Storage Cleanup Orphan Error]:", err);
  }
}
