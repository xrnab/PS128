"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { requireActiveUser } from "@/lib/auth/session";
import { cleanupOrphanPhoto } from "@/lib/storage/auth";
import { Prisma } from "@prisma/client";

import {
  routeCaseToVeterinarian,
  AssignmentLevel,
  RoutedLocationInfo,
  AssignedUserInfo,
} from "@/lib/geo/routing";

const caseReportSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required for double-submit protection"),
  animalId: z.string().min(1, "Please select an animal"),
  symptoms: z.array(z.string()).min(1, "Please select at least one observed symptom"),
  durationDays: z.number().int().min(1, "Duration must be at least 1 day"),
  affectedCount: z.number().int().min(1, "Affected count must be at least 1"),
  herdSize: z.number().int().min(1, "Herd size must be at least 1"),
  mortalityCount: z.number().int().min(0, "Mortality count cannot be negative"),
  heartRate: z.number().optional().nullable(),
  gpsLat: z.number().optional().nullable(),
  gpsLng: z.number().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  yoloVisionResult: z.any().optional().nullable(),
  iotData: z
    .object({
      iotDeviceId: z.string().optional().nullable(),
      temperature: z.number().optional().nullable(),
      activity: z.number().optional().nullable(),
      source: z.enum(["REAL", "SIMULATED", "MANUAL"]).optional().nullable(),
      readingId: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type CaseReportInput = z.infer<typeof caseReportSchema>;

export interface CaseReportResult {
  success: boolean;
  error?: string;
  caseNumber?: string;
  caseId?: string;
  reportedAt?: string;
  status?: string;
  assignedVeterinarian?: AssignedUserInfo | null;
  assignmentLevel?: AssignmentLevel | null;
  location?: RoutedLocationInfo;
}

/**
 * Creates a production health Case report.
 * Server-enforces authentication, role derivation, animal access authorization,
 * Zod validation, raw IoT telemetry separation, database-backed idempotency,
 * and deterministic hierarchical routing to an eligible veterinarian.
 */
export async function createCaseReportAction(input: CaseReportInput): Promise<CaseReportResult> {
  try {
    // 1. Require active, authenticated application user
    const appUser = await requireActiveUser();

    // 2. Server-side Zod validation
    const validation = caseReportSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid report input data.",
      };
    }

    const data = validation.data;

    // 3. Primary Idempotency Check via Database submissionId @unique constraint
    const existingCase = await prisma.case.findUnique({
      where: { submissionId: data.submissionId },
    });

    if (existingCase) {
      if (existingCase.createdByUserId === appUser.id) {
        const routeResult = await routeCaseToVeterinarian(existingCase.id);
        return {
          success: true,
          caseNumber: existingCase.caseNumber,
          caseId: existingCase.id,
          reportedAt: existingCase.reportedAt.toISOString(),
          status: existingCase.status,
          assignedVeterinarian: routeResult.assignedVeterinarian,
          assignmentLevel: routeResult.assignmentLevel,
          location: routeResult.location,
        };
      } else {
        return { success: false, error: "Unauthorized: Submission ID collision." };
      }
    }

    // 4. Logic validation: affectedCount cannot exceed herdSize
    if (data.affectedCount > data.herdSize) {
      return {
        success: false,
        error: `Affected animal count (${data.affectedCount}) cannot exceed total herd size (${data.herdSize}).`,
      };
    }

    // 4b. Reject submissions with rejected vision results (defense-in-depth)
    if (
      data.yoloVisionResult &&
      typeof data.yoloVisionResult === "object" &&
      typeof (data.yoloVisionResult as { primary_prediction?: string }).primary_prediction === "string" &&
      (data.yoloVisionResult as { primary_prediction: string }).primary_prediction.startsWith("Rejected")
    ) {
      const reason = (data.yoloVisionResult as { message?: string }).message || (data.yoloVisionResult as { primary_prediction: string }).primary_prediction;
      return {
        success: false,
        error: `Submission blocked: ${reason}`,
      };
    }

    // 5. Derive reportSource strictly from server-side appUser role (do NOT trust client)
    const reportSource = appUser.role === "FIELD_AGENT" ? "FIELD_AGENT" : "FARMER";

    // 6. Load and authorize Animal access
    const animal = await prisma.animal.findUnique({
      where: { id: data.animalId },
      include: {
        herd: {
          include: {
            farm: {
              include: {
                village: {
                  include: {
                    block: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!animal) {
      return { success: false, error: "Selected animal record does not exist." };
    }

    // Authorization check
    if (appUser.role === "FARMER") {
      if (animal.herd.farm.farmerUserId !== appUser.id) {
        return { success: false, error: "Unauthorized: You do not own this animal." };
      }
    } else if (appUser.role === "FIELD_AGENT") {
      const isAssignedAgent = animal.herd.farm.fieldAgentUserId === appUser.id;
      const isSameVillage = appUser.villageId && animal.herd.farm.villageId === appUser.villageId;
      const isSameBlock = appUser.blockId && animal.herd.farm.village.blockId === appUser.blockId;
      const isSameDistrict = appUser.districtId && animal.herd.farm.village.block.districtId === appUser.districtId;

      if (!isAssignedAgent && !isSameVillage && !isSameBlock && !isSameDistrict) {
        return { success: false, error: "Unauthorized: Farm lies outside your field assignment scope." };
      }
    }

    // 7. Secondary heuristic duplicate check (30s window)
    const recentDuplicate = await prisma.case.findFirst({
      where: {
        animalId: data.animalId,
        createdByUserId: appUser.id,
        reportedAt: {
          gte: new Date(Date.now() - 30 * 1000),
        },
      },
    });

    if (recentDuplicate) {
      const routeResult = await routeCaseToVeterinarian(recentDuplicate.id);
      return {
        success: true,
        caseNumber: recentDuplicate.caseNumber,
        caseId: recentDuplicate.id,
        reportedAt: recentDuplicate.reportedAt.toISOString(),
        status: recentDuplicate.status,
        assignedVeterinarian: routeResult.assignedVeterinarian,
        assignmentLevel: routeResult.assignmentLevel,
        location: routeResult.location,
      };
    }

    // 8. Construct Raw IoT Telemetry payload (Separated strictly from AI engine analysisResult)
    const rawIotTelemetry =
      data.iotData || data.heartRate || animal.iotDeviceId
        ? {
            animalId: animal.id,
            deviceId: animal.iotDeviceId || data.iotData?.iotDeviceId || null,
            temperature: data.iotData?.temperature ?? null,
            activity: data.iotData?.activity ?? null,
            heartRate: data.heartRate ?? null,
            source: data.iotData?.source ?? (animal.iotDeviceId ? "REAL" : "MANUAL"),
            readingId: data.iotData?.readingId ?? null,
          }
        : undefined;

    // 9. Generate collision-safe server Case Number
    const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // 10. Create Case record in Prisma with unique submissionId & raw iotTelemetry
    try {
      const newCase = await prisma.case.create({
        data: {
          caseNumber,
          submissionId: data.submissionId,
          animalId: data.animalId,
          createdByUserId: appUser.id,
          reportSource,
          status: "PENDING_REVIEW",
          symptoms: data.symptoms,
          durationDays: data.durationDays,
          affectedCount: data.affectedCount,
          mortalityCount: data.mortalityCount,
          photoUrl: data.photoUrl || null,
          gpsLat: data.gpsLat ? data.gpsLat : null,
          gpsLng: data.gpsLng ? data.gpsLng : null,
          iotTelemetry: rawIotTelemetry,
          analysisResult: undefined, // Reserved strictly for FastAPI /api/analyze
          visionResult: data.yoloVisionResult ?? undefined,
        },
      });

      // 11. Route case to eligible active veterinarian
      let routeResult: {
        assignedVeterinarian: AssignedUserInfo | null;
        assignmentLevel: AssignmentLevel | null;
        location: RoutedLocationInfo;
      };

      try {
        const res = await routeCaseToVeterinarian(newCase.id);
        routeResult = {
          assignedVeterinarian: res.assignedVeterinarian,
          assignmentLevel: res.assignmentLevel,
          location: res.location,
        };
      } catch (routingErr) {
        console.error("[Maitri Case Routing Error]:", routingErr);
        const farm = animal.herd.farm;
        routeResult = {
          assignedVeterinarian: null,
          assignmentLevel: null,
          location: {
            villageName: farm.village?.name || null,
            blockName: farm.village?.block?.name || null,
            districtName: farm.village?.block?.districtId ? farm.village.block.name : null,
          },
        };
      }

      // 12. Invalidate Next.js cache so the newly assigned case appears instantly
      try {
        revalidatePath("/vet");
        revalidatePath("/vet/cases");
        revalidatePath("/farmer");
        revalidatePath("/authority");
        revalidatePath(`/farmer/animals/${data.animalId}`);
      } catch {
        // Safe fallback in testing/non-request environments
      }

      return {
        success: true,
        caseNumber: newCase.caseNumber,
        caseId: newCase.id,
        reportedAt: newCase.reportedAt.toISOString(),
        status: newCase.status,
        assignedVeterinarian: routeResult.assignedVeterinarian,
        assignmentLevel: routeResult.assignmentLevel,
        location: routeResult.location,
      };
    } catch (err: unknown) {
      // Handle potential race condition on unique submissionId
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await prisma.case.findUnique({
          where: { submissionId: data.submissionId },
        });

        if (existing) {
          const routeResult = await routeCaseToVeterinarian(existing.id);
          try {
            revalidatePath("/vet");
            revalidatePath("/vet/cases");
            revalidatePath("/farmer");
            revalidatePath("/authority");
            revalidatePath(`/farmer/animals/${data.animalId}`);
          } catch {
            // Safe fallback
          }
          return {
            success: true,
            caseNumber: existing.caseNumber,
            caseId: existing.id,
            reportedAt: existing.reportedAt.toISOString(),
            status: existing.status,
            assignedVeterinarian: routeResult.assignedVeterinarian,
            assignmentLevel: routeResult.assignmentLevel,
            location: routeResult.location,
          };
        }
      }
      throw err;
    }
  } catch (err: unknown) {
    console.error("[Maitri Case Creation Error]:", err);
    if (input?.photoUrl) {
      await cleanupOrphanPhoto(input.photoUrl).catch(() => {});
    }
    const errorMsg = err instanceof Error ? err.message : "Failed to create health case report.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}
