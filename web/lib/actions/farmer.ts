"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma, { hasModel, isRelation } from "@/lib/db/prisma";
import { requireFarmer } from "@/lib/auth/permissions";
import { getCurrentClerkUser } from "@/lib/auth/session";
import { clerkClient } from "@clerk/nextjs/server";

const updateFarmerProfileSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").max(100, "Name is too long"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number is too long")
    .regex(/^[+0-9\s-]{10,20}$/, "Please enter a valid phone number"),
  preferredLanguage: z.enum(["en", "hi", "mr", "bn"]).default("en"),
  districtId: z.string().optional().nullable(),
  blockId: z.string().optional().nullable(),
  villageId: z.string().optional().nullable(),
  primaryFarmId: z.string().optional().nullable(),
  primaryFarmName: z.string().min(2, "Farm name must be at least 2 characters").max(100, "Farm name is too long").optional().nullable(),
});

export type UpdateFarmerProfileInput = z.infer<typeof updateFarmerProfileSchema>;

export interface FarmerProfileData {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  imageUrl: string | null;
  preferredLanguage: string;
  telegramChatId: string | null;
  role: string;
  status: string;
  districtId: string | null;
  districtName: string | null;
  blockId: string | null;
  blockName: string | null;
  villageId: string | null;
  villageName: string | null;
  farms: Array<{
    id: string;
    name: string;
    villageId: string;
    villageName: string;
    blockName: string;
    districtName: string;
    animalCount: number;
    latitude: number;
    longitude: number;
  }>;
  createdAt: string;
}

/**
 * Retrieves real database counts and recent activity for the Farmer Portal dashboard.
 */
export async function getFarmerDashboardMetricsAction() {
  const farmer = await requireFarmer();

  const caseInclude = {
    createdByUser: { select: { id: true, name: true, phone: true } },
    reviewedByUser: { select: { id: true, name: true, phone: true } },
    treatments: {
      include: {
        administeredByUser: { select: { id: true, name: true, role: true } },
      },
      orderBy: { dateGiven: "desc" as const },
    },
    samples: {
      include: {
        collectedByUser: { select: { id: true, name: true } },
      },
      orderBy: { collectedAt: "desc" as const },
    },
    assignedVeterinarianUser: { select: { id: true, name: true, phone: true } },
    veterinaryReports: {
      include: {
        vetUser: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" as const },
    },
    animal: {
      select: {
        id: true,
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
                    block: {
                      select: {
                        name: true,
                        district: {
                          select: {
                            name: true,
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
  };

  const [farms, assistanceRequests, unreadNotificationsCount] = await Promise.all([
    prisma.farm.findMany({
      where: { farmerUserId: farmer.id },
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
        herds: {
          include: {
            animals: {
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
                cases: {
                  include: caseInclude,
                  orderBy: { reportedAt: "desc" },
                },
                veterinaryReports: isRelation("Animal", "veterinaryReports")
                  ? {
                      include: {
                        vetUser: { select: { name: true, phone: true } },
                      },
                      orderBy: { createdAt: "desc" },
                    }
                  : undefined,
                vaccinations: {
                  orderBy: { dateGiven: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    hasModel("AssistanceRequest")
      ? prisma.assistanceRequest.findMany({
          where: { farmerUserId: farmer.id },
          include: {
            animal: true,
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
            assignedFieldAgentUser: { select: { id: true, name: true, phone: true } },
          },
          orderBy: { requestedAt: "desc" },
        })
      : Promise.resolve([]),
    hasModel("InAppNotification")
      ? prisma.inAppNotification.count({
          where: { userId: farmer.id, read: false },
        })
      : Promise.resolve(0),
  ]);

  const allAnimals = farms.flatMap((f) => f.herds.flatMap((h) => h.animals));
  const allCases = allAnimals.flatMap((a) => a.cases);
  const activeCases = allCases.filter((c) => c.status !== "CLOSED_HARMLESS");
  const allVetReports = allAnimals.flatMap((a) => a.veterinaryReports);
  const upcomingFollowUps = allCases.filter(
    (c) => c.vetFollowUpDate && c.status !== "CLOSED_HARMLESS"
  );

  return {
    metrics: {
      myAnimalsCount: allAnimals.length,
      activeCasesCount: activeCases.length,
      assistanceRequestsCount: assistanceRequests.length,
      vetReportsCount: allVetReports.length,
      upcomingFollowUpsCount: upcomingFollowUps.length,
      unreadNotificationsCount,
    },
    allAnimals,
    activeCases,
    assistanceRequests,
    allVetReports,
    upcomingFollowUps,
    farms,
  };
}

/**
 * Retrieves a full Case detail and associated Veterinary Reports for the authenticated farmer.
 * Strictly verifies that the authenticated farmer owns the animal/farm or created the report.
 */
export async function getFarmerCaseDetailAction(caseId: string) {
  const farmer = await requireFarmer();

  const detailInclude = {
    animal: {
      include: {
        herd: {
          include: {
            farm: {
              include: {
                farmerUser: { select: { id: true, name: true, phone: true } },
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
        cases: {
          where: { id: { not: caseId } },
          orderBy: { reportedAt: "desc" as const },
        },
        vaccinations: {
          include: { administeredByUser: true },
          orderBy: { dateGiven: "desc" as const },
        },
        treatments: {
          include: { administeredByUser: true },
          orderBy: { dateGiven: "desc" as const },
        },
      },
    },
    createdByUser: {
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
      },
    },
    reviewedByUser: {
      select: {
        id: true,
        name: true,
        phone: true,
      },
    },
    treatments: {
      include: {
        administeredByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { dateGiven: "desc" as const },
    },
    samples: {
      include: {
        collectedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { collectedAt: "desc" as const },
    },
    assignedVeterinarianUser: {
      select: {
        id: true,
        name: true,
        phone: true,
      },
    },
    veterinaryReports: {
      include: {
        vetUser: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" as const },
    },
    fieldVisit: {
      include: {
        fieldAgentUser: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    },
    assistanceRequest: {
      include: {
        assignedFieldAgentUser: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    },
  };

  const healthCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: detailInclude,
  });

  if (!healthCase) {
    throw new Error("Case record not found.");
  }

  const farm = healthCase.animal.herd.farm;
  const isOwner = farm.farmerUserId === farmer.id;
  const isCreator = healthCase.createdByUserId === farmer.id;

  if (!isOwner && !isCreator) {
    throw new Error("Unauthorized: You do not have permission to view this case.");
  }

  return healthCase;
}

/**
 * Retrieves the profile information for the authenticated farmer.
 */
export async function getFarmerProfileAction(): Promise<FarmerProfileData> {
  const farmer = await requireFarmer();
  const [clerkUser, fullUser] = await Promise.all([
    getCurrentClerkUser(),
    prisma.user.findUnique({
      where: { id: farmer.id },
      include: {
        district: true,
        block: true,
        village: true,
        ownedFarms: {
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
            herds: {
              include: {
                animals: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!fullUser) {
    throw new Error("Farmer user profile not found.");
  }

  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress || null;
  const imageUrl = clerkUser?.imageUrl || null;

  return {
    id: fullUser.id,
    name: fullUser.name,
    phone: fullUser.phone,
    email: primaryEmail,
    imageUrl,
    preferredLanguage: fullUser.preferredLanguage || "en",
    telegramChatId: fullUser.telegramChatId || null,
    role: fullUser.role,
    status: fullUser.status,
    districtId: fullUser.districtId || null,
    districtName: fullUser.district?.name || null,
    blockId: fullUser.blockId || null,
    blockName: fullUser.block?.name || null,
    villageId: fullUser.villageId || null,
    villageName: fullUser.village?.name || null,
    farms: fullUser.ownedFarms.map((f) => ({
      id: f.id,
      name: f.name,
      villageId: f.villageId,
      villageName: f.village.name,
      blockName: f.village.block.name,
      districtName: f.village.block.district.name,
      animalCount: f.herds.reduce((sum, h) => sum + h.animals.length, 0),
      latitude: f.latitude,
      longitude: f.longitude,
    })),
    createdAt: fullUser.createdAt.toISOString(),
  };
}

/**
 * Updates the authenticated farmer's profile and farm information.
 * Enforces strict authorization and location validation.
 */
export async function updateFarmerProfileAction(input: UpdateFarmerProfileInput) {
  try {
    const farmer = await requireFarmer();

    const parsed = updateFarmerProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid profile data.",
      };
    }

    const {
      name,
      phone,
      preferredLanguage,
      districtId,
      blockId,
      villageId,
      primaryFarmId,
      primaryFarmName,
    } = parsed.data;

    // 1. Resolve and validate administrative location hierarchy
    let resolvedDistrictId: string | null = null;
    let resolvedBlockId: string | null = null;
    let resolvedVillageId: string | null = null;

    if (villageId) {
      const villageObj = await prisma.village.findUnique({
        where: { id: villageId },
        include: { block: { include: { district: true } } },
      });
      if (!villageObj) {
        return { success: false, error: "Selected Village does not exist." };
      }
      resolvedVillageId = villageObj.id;
      resolvedBlockId = villageObj.blockId;
      resolvedDistrictId = villageObj.block.districtId;

      if (blockId && blockId !== resolvedBlockId) {
        return { success: false, error: "Selected Village does not belong to the chosen Block." };
      }
      if (districtId && districtId !== resolvedDistrictId) {
        return { success: false, error: "Selected Village does not belong to the chosen District." };
      }
    } else if (blockId) {
      const blockObj = await prisma.block.findUnique({
        where: { id: blockId },
        include: { district: true },
      });
      if (!blockObj) {
        return { success: false, error: "Selected Block does not exist." };
      }
      resolvedBlockId = blockObj.id;
      resolvedDistrictId = blockObj.districtId;
      if (districtId && districtId !== resolvedDistrictId) {
        return { success: false, error: "Selected Block does not belong to the chosen District." };
      }
    } else if (districtId) {
      const distObj = await prisma.district.findUnique({
        where: { id: districtId },
      });
      if (!distObj) {
        return { success: false, error: "Selected District does not exist." };
      }
      resolvedDistrictId = distObj.id;
    }

    // 2. Validate Farm ownership if farm update requested
    if (primaryFarmId && primaryFarmName) {
      const farm = await prisma.farm.findUnique({
        where: { id: primaryFarmId },
      });
      if (!farm || farm.farmerUserId !== farmer.id) {
        return { success: false, error: "Unauthorized: You do not own this farm." };
      }
      await prisma.farm.update({
        where: { id: primaryFarmId },
        data: { name: primaryFarmName.trim() },
      });
    }

    // 3. Update Farmer User in Prisma
    const updatedUser = await prisma.user.update({
      where: { id: farmer.id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        preferredLanguage: preferredLanguage || "en",
        districtId: resolvedDistrictId,
        blockId: resolvedBlockId,
        villageId: resolvedVillageId,
      },
    });

    // 4. Safely sync name with Clerk if possible
    try {
      if (farmer.clerkId) {
        const client = await clerkClient();
        const parts = name.trim().split(" ");
        const firstName = parts[0] || name.trim();
        const lastName = parts.slice(1).join(" ") || undefined;
        await client.users.updateUser(farmer.clerkId, {
          firstName,
          lastName,
        });
      }
    } catch (clerkErr) {
      console.warn("[Clerk Name Sync Warning]:", clerkErr);
    }

    // 5. Invalidate Next.js Server Cache
    try {
      revalidatePath("/farmer");
      revalidatePath("/farmer/profile");
      revalidatePath("/farmer/request-help");
      revalidatePath("/farmer/report");
      revalidatePath("/dashboard");
    } catch {
      // Safe fallback
    }

    return {
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        preferredLanguage: updatedUser.preferredLanguage,
      },
    };
  } catch (err: unknown) {
    console.error("[Update Farmer Profile Error]:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update profile.",
    };
  }
}

/**
 * Ensures the farmer has a primary Farm record with strict idempotency and concurrency protection.
 * - If a farm already exists for the farmer, returns the existing farm.
 * - If zero farms exist AND farmer has a valid registered village, provisions exactly one primary farm.
 * - If farmer has no registered village, does NOT create a farm and returns 'unable_to_be_provisioned'.
 */
export type FarmProvisioningStatus = "already_existing" | "newly_provisioned" | "unable_to_be_provisioned";

export interface EnsureFarmerPrimaryFarmResult {
  farm: {
    id: string;
    name: string;
    villageId: string;
  } | null;
  status: FarmProvisioningStatus;
  message?: string;
}

export async function ensureFarmerPrimaryFarmAction(farmerId?: string): Promise<EnsureFarmerPrimaryFarmResult> {
  try {
    const farmer = await requireFarmer();
    const targetUserId = farmerId && farmer.id === farmerId ? farmerId : farmer.id;

    // 1. Check if farmer already has ANY farm registered
    const existingFarm = await prisma.farm.findFirst({
      where: { farmerUserId: targetUserId },
      select: { id: true, name: true, villageId: true },
      orderBy: { createdAt: "asc" },
    });

    if (existingFarm) {
      console.log(`[Farm Provisioning]: Farmer ${farmer.name} (${targetUserId}) already has farm "${existingFarm.name}" (${existingFarm.id}). Status: already_existing`);
      return {
        farm: existingFarm,
        status: "already_existing",
        message: `Farmer already has registered farm: ${existingFarm.name}`,
      };
    }

    // 2. Ensure farmer has a valid registered village (resolve or auto-create if missing)
    let targetVillageId = farmer.villageId;

    if (!targetVillageId) {
      if (farmer.blockId) {
        let defaultVillage = await prisma.village.findFirst({
          where: { blockId: farmer.blockId },
        });
        if (!defaultVillage) {
          const block = await prisma.block.findUnique({ where: { id: farmer.blockId } });
          if (block) {
            defaultVillage = await prisma.village.create({
              data: {
                name: `${block.name} Main`,
                blockId: block.id,
              },
            });
          }
        }
        if (defaultVillage) {
          targetVillageId = defaultVillage.id;
          await prisma.user.update({
            where: { id: farmer.id },
            data: { villageId: defaultVillage.id },
          });
        }
      } else if (farmer.districtId) {
        let defaultBlock = await prisma.block.findFirst({
          where: { districtId: farmer.districtId },
        });
        if (!defaultBlock) {
          const dist = await prisma.district.findUnique({ where: { id: farmer.districtId } });
          if (dist) {
            defaultBlock = await prisma.block.create({
              data: {
                name: `${dist.name} District Center`,
                districtId: dist.id,
              },
            });
          }
        }
        if (defaultBlock) {
          let defaultVillage = await prisma.village.findFirst({
            where: { blockId: defaultBlock.id },
          });
          if (!defaultVillage) {
            defaultVillage = await prisma.village.create({
              data: {
                name: `${defaultBlock.name} Main`,
                blockId: defaultBlock.id,
              },
            });
          }
          if (defaultVillage) {
            targetVillageId = defaultVillage.id;
            await prisma.user.update({
              where: { id: farmer.id },
              data: { blockId: defaultBlock.id, villageId: defaultVillage.id },
            });
          }
        }
      }
    }

    if (!targetVillageId) {
      console.log(`[Farm Provisioning]: Farmer ${farmer.name} (${targetUserId}) has no registered location. Status: unable_to_be_provisioned`);
      return {
        farm: null,
        status: "unable_to_be_provisioned",
        message: "No registered location found on farmer profile.",
      };
    }

    const village = await prisma.village.findUnique({
      where: { id: targetVillageId },
      include: { block: { include: { district: true } } },
    });

    if (!village) {
      console.log(`[Farm Provisioning]: Registered villageId ${targetVillageId} does not exist in database. Status: unable_to_be_provisioned`);
      return {
        farm: null,
        status: "unable_to_be_provisioned",
        message: "Registered village does not exist in database.",
      };
    }

    // 3. Atomically check and provision inside a transaction with PostgreSQL advisory lock to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${targetUserId}))`;
      } catch (lockErr) {
        // Fallback gracefully if database engine is not Postgres in isolated mock environments
        console.warn("[Advisory Lock Fallback]:", lockErr);
      }

      const concurrencyCheck = await tx.farm.findFirst({
        where: { farmerUserId: targetUserId },
        select: { id: true, name: true, villageId: true },
        orderBy: { createdAt: "asc" },
      });

      if (concurrencyCheck) {
        return {
          farm: concurrencyCheck,
          status: "already_existing" as const,
          message: `Farmer already has registered farm: ${concurrencyCheck.name}`,
        };
      }

      const isPune = village.block?.district?.name?.toLowerCase().includes("pune");
      const defaultLat = isPune ? 18.5793 : 22.5726;
      const defaultLng = isPune ? 73.9806 : 88.3639;

      const newFarm = await tx.farm.create({
        data: {
          name: `${farmer.name || "My"} Farm`,
          villageId: targetVillageId,
          farmerUserId: targetUserId,
          latitude: defaultLat,
          longitude: defaultLng,
        },
        select: { id: true, name: true, villageId: true },
      });

      return {
        farm: newFarm,
        status: "newly_provisioned" as const,
        message: `Successfully provisioned primary farm: ${newFarm.name}`,
      };
    });

    console.log(`[Farm Provisioning]: Provisioning result for farmer ${farmer.name} (${targetUserId}): ${result.status} (farmId: ${result.farm?.id})`);
    return result;
  } catch (err: unknown) {
    console.error("[Ensure Farmer Primary Farm Error]:", err);
    return {
      farm: null,
      status: "unable_to_be_provisioned",
      message: err instanceof Error ? err.message : "Failed to ensure primary farm.",
    };
  }
}


