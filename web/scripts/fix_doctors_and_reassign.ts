import prisma from "../lib/db/prisma";
import { findEligibleVeterinarians } from "../lib/geo/routing";

async function main() {
  console.log("====================================================");
  console.log("FIXING VETERINARIAN ROUTING & CLEANING UP TEST VETS");
  console.log("====================================================\n");

  // 1. Locate real veterinarian Arpan Atha
  const arpan = await prisma.user.findFirst({
    where: { clerkId: "user_3J6FcGMmSCet9tfcM9RgOarhnrQ" },
  });

  if (!arpan) {
    throw new Error("Could not find real veterinarian account (Arpan Atha)!");
  }
  console.log(`Found real veterinarian: ${arpan.name} (ID: ${arpan.id})`);

  // 2. Locate real geographic jurisdiction (North 24 Parganas -> Rajarhat -> Bidhannagar)
  const district = await prisma.district.findUnique({
    where: { id: "cmtubnmh10001y0u2smzw8dnt" }, // North 24 Parganas
  });
  const block = await prisma.block.findUnique({
    where: { id: "cmtubnmwr0002y0u2pwwujc7j" }, // Rajarhat
  });
  const village = await prisma.village.findUnique({
    where: { id: "cmtubnne00003y0u2x0hoxfrm" }, // Bidhannagar
  });

  if (!district || !block || !village) {
    throw new Error("Could not find North 24 Parganas / Rajarhat / Bidhannagar location records!");
  }

  // 3. Update Arpan Atha to cover the active service jurisdiction
  const updatedArpan = await prisma.user.update({
    where: { id: arpan.id },
    data: {
      districtId: district.id,
      blockId: block.id,
      villageId: village.id,
      status: "ACTIVE",
    },
  });
  console.log(`Updated Arpan Atha's jurisdiction to District "${district.name}", Block "${block.name}", Village "${village.name}"\n`);

  // 4. Reassign all cases currently assigned to Alpha Medic and Beta Clinician to Arpan Atha
  const alphaBetaVets = await prisma.user.findMany({
    where: {
      clerkId: { in: ["clerk_e2e_vet_1", "clerk_e2e_vet_2"] },
    },
    select: { id: true, name: true, clerkId: true },
  });

  const alphaBetaIds = alphaBetaVets.map((v) => v.id);

  if (alphaBetaIds.length > 0) {
    const reassignedCount = await prisma.case.updateMany({
      where: {
        assignedVeterinarianUserId: { in: alphaBetaIds },
      },
      data: {
        assignedVeterinarianUserId: updatedArpan.id,
      },
    });
    console.log(`Reassigned ${reassignedCount.count} cases from Alpha/Beta to ${updatedArpan.name}`);

    // Remove any in-app notifications for Alpha / Beta
    await prisma.inAppNotification.deleteMany({
      where: { userId: { in: alphaBetaIds } },
    });

    // Delete the mock test users Alpha Medic and Beta Clinician
    await prisma.user.deleteMany({
      where: { id: { in: alphaBetaIds } },
    });
    console.log(`Deleted mock test vets (${alphaBetaVets.map((v) => v.name).join(", ")}) from database.\n`);
  }

  // 5. Deactivate other mock test veterinarians from past test runs
  const otherTestVets = await prisma.user.updateMany({
    where: {
      role: "VETERINARIAN",
      status: "ACTIVE",
      NOT: {
        clerkId: { in: ["user_3J6FcGMmSCet9tfcM9RgOarhnrQ", "seed_vet"] },
      },
    },
    data: {
      status: "REJECTED",
    },
  });
  console.log(`Deactivated ${otherTestVets.count} other stale test/mock veterinarians (set status to REJECTED).\n`);

  // 6. Test routing for Bidhannagar to ensure Arpan Atha is now matched
  const eligibility = await findEligibleVeterinarians({
    villageId: village.id,
    blockId: block.id,
    districtId: district.id,
  });

  console.log("--- ROUTING VERIFICATION FOR BIDHANNAGAR ---");
  console.log(`Tier matched: ${eligibility?.level}`);
  console.log(`Eligible veterinarians:`, eligibility?.eligibleVets);

  // 7. Verify Arpan's active case load
  const arpanCaseCount = await prisma.case.count({
    where: { assignedVeterinarianUserId: updatedArpan.id },
  });
  console.log(`Total cases now assigned to Dr. Arpan Atha: ${arpanCaseCount}`);

  console.log("\n====================================================");
  console.log("FIX COMPLETED SUCCESSFULLY");
  console.log("====================================================");
}

main()
  .catch((err) => {
    console.error("Fix script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
