import prisma from "../lib/db/prisma";



async function main() {
  console.log("🌱 Starting Maitri Database Deterministic Seed...");

  // 1. District
  const district = await prisma.district.upsert({
    where: { name: "Pune District" },
    update: {},
    create: {
      id: "district_pune",
      name: "Pune District",
    },
  });

  // 2. Blocks
  const blockHaveli = await prisma.block.upsert({
    where: { districtId_name: { districtId: district.id, name: "Haveli Block" } },
    update: {},
    create: {
      id: "block_haveli",
      districtId: district.id,
      name: "Haveli Block",
    },
  });

  await prisma.block.upsert({
    where: { districtId_name: { districtId: district.id, name: "Shirur Block" } },
    update: {},
    create: {
      id: "block_shirur",
      districtId: district.id,
      name: "Shirur Block",
    },
  });

  // 3. Villages
  const villageWagholi = await prisma.village.upsert({
    where: { blockId_name: { blockId: blockHaveli.id, name: "Wagholi Village" } },
    update: {},
    create: {
      id: "village_wagholi",
      blockId: blockHaveli.id,
      name: "Wagholi Village",
    },
  });

  const villageLonikand = await prisma.village.upsert({
    where: { blockId_name: { blockId: blockHaveli.id, name: "Lonikand Village" } },
    update: {},
    create: {
      id: "village_lonikand",
      blockId: blockHaveli.id,
      name: "Lonikand Village",
    },
  });

  // 4. Seed Users (Clerk Development Seed Identities)
  const farmerUser = await prisma.user.upsert({
    where: { clerkId: "seed_farmer" },
    update: {},
    create: {
      id: "user_farmer_01",
      clerkId: "seed_farmer",
      name: "Ramesh Patil",
      phone: "+919822012345",
      role: "FARMER",
      status: "ACTIVE",
      districtId: district.id,
      blockId: blockHaveli.id,
      villageId: villageWagholi.id,
      preferredLanguage: "en",
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { clerkId: "seed_agent" },
    update: {},
    create: {
      id: "user_agent_01",
      clerkId: "seed_agent",
      name: "Suresh Deshmukh",
      phone: "+919822054321",
      role: "FIELD_AGENT",
      status: "ACTIVE",
      districtId: district.id,
      blockId: blockHaveli.id,
      villageId: villageWagholi.id,
      preferredLanguage: "mr",
    },
  });

  const vetUser = await prisma.user.upsert({
    where: { clerkId: "seed_vet" },
    update: {},
    create: {
      id: "user_vet_01",
      clerkId: "seed_vet",
      name: "Dr. Anjali Kulkarni",
      phone: "+919822099999",
      role: "VETERINARIAN",
      status: "ACTIVE",
      districtId: district.id,
      blockId: blockHaveli.id,
      telegramChatId: "987654321",
      preferredLanguage: "en",
    },
  });

  await prisma.user.upsert({
    where: { clerkId: "seed_authority" },
    update: {},
    create: {
      id: "user_authority_01",
      clerkId: "seed_authority",
      name: "Dr. Vikram Shinde",
      phone: "+919822088888",
      role: "DISTRICT_AUTHORITY",
      status: "ACTIVE", // Bootstrap authority for Phase 3 approval workflow
      districtId: district.id,
      preferredLanguage: "en",
    },
  });

  // 5. Farms
  const farm1 = await prisma.farm.upsert({
    where: { id: "farm_patil_dairy" },
    update: {},
    create: {
      id: "farm_patil_dairy",
      name: "Patil Dairy & Livestock Farm",
      villageId: villageWagholi.id,
      farmerUserId: farmerUser.id,
      fieldAgentUserId: agentUser.id,
      latitude: 18.5793,
      longitude: 73.9806,
    },
  });

  const farm2 = await prisma.farm.upsert({
    where: { id: "farm_green_pastures" },
    update: {},
    create: {
      id: "farm_green_pastures",
      name: "Green Pastures Cattle Farm",
      villageId: villageLonikand.id,
      farmerUserId: farmerUser.id,
      fieldAgentUserId: agentUser.id,
      latitude: 18.6201,
      longitude: 74.0212,
    },
  });

  // 6. Herds
  const herdCows = await prisma.herd.upsert({
    where: { id: "herd_cows_01" },
    update: {},
    create: {
      id: "herd_cows_01",
      farmId: farm1.id,
      species: "COW",
      name: "Holstein-Friesian Dairy Herd",
    },
  });

  await prisma.herd.upsert({
    where: { id: "herd_goats_01" },
    update: {},
    create: {
      id: "herd_goats_01",
      farmId: farm2.id,
      species: "GOAT",
      name: "Osmanabadi Goat Breeding Herd",
    },
  });

  // 7. Animals
  const animalCow1 = await prisma.animal.upsert({
    where: { herdId_tag: { herdId: herdCows.id, tag: "IN-MH-COW-101" } },
    update: {},
    create: {
      id: "animal_cow_101",
      herdId: herdCows.id,
      tag: "IN-MH-COW-101",
      species: "COW",
      breed: "Holstein Friesian Cross",
      ageMonths: 36,
      iotDeviceId: "ESP32-COW-01",
    },
  });

  const animalCow2 = await prisma.animal.upsert({
    where: { herdId_tag: { herdId: herdCows.id, tag: "IN-MH-COW-102" } },
    update: {},
    create: {
      id: "animal_cow_102",
      herdId: herdCows.id,
      tag: "IN-MH-COW-102",
      species: "COW",
      breed: "Gir Cow",
      ageMonths: 48,
    },
  });

  // 8. Cases (With representative FastAPI JSON payloads)
  const masterAnalysisPayload = {
    overall_risk_score: 90,
    overall_risk_level: "CRITICAL",
    disease_prediction: {
      suspected_condition: "Foot and Mouth Disease",
      confidence: 0.85,
      animal_type: "Cow",
      vitals_evaluated: { body_temp: 40.1, heart_rate: 95 },
      symptoms_analyzed: "Fever Nasal Discharge Labored Breathing",
    },
    iot_telemetry_analysis: {
      animal_id: "ESP32-COW-01",
      temperature: 40.1,
      activity_index: 22,
      has_anomaly: true,
      anomalies: ["Hyperthermia: 40.1°C", "Lethargy: Activity index 22"],
    },
    weather_analysis: {
      temperature: 28.0,
      humidity: 80.0,
      precipitation: 0.0,
      vector_breeding_risk: "HIGH",
      weather_advisory: "High humidity indicates elevated vector risk.",
      source: "Live Open-Meteo API",
    },
    outbreak_surge_analysis: {
      latest_cases: 48,
      historical_mean: 13.0,
      z_score: 35.0,
      is_outbreak_spike: true,
    },
    farmer_advisory: {
      language: "English",
      advisory: "🚨 CRITICAL: Isolate affected cow immediately from the main herd. Disinfect water troughs and notify district vet.",
      provider_used: "Gemini (Key 1)",
    },
  };

  const visionAnalysisPayload = {
    visual_anomaly_detected: true,
    primary_prediction: "Lumpy Skin Disease",
    confidence: 92.4,
    top_predictions: [
      { condition: "Lumpy Skin Disease", confidence: 92.4 },
      { condition: "Healthy", confidence: 5.1 },
    ],
  };

  await prisma.case.upsert({
    where: { caseNumber: "CASE-2026-001" },
    update: {},
    create: {
      id: "case_001",
      caseNumber: "CASE-2026-001",
      animalId: animalCow1.id,
      createdByUserId: farmerUser.id,
      reportSource: "FARMER",
      status: "PENDING_REVIEW",
      symptoms: ["Fever", "Nasal Discharge", "Labored Breathing"],
      durationDays: 3,
      affectedCount: 2,
      mortalityCount: 0,
      gpsLat: 18.5793,
      gpsLng: 73.9806,
      analysisResult: masterAnalysisPayload,
      visionResult: visionAnalysisPayload,
      reportedAt: new Date(Date.now() - 3600 * 1000 * 2), // 2 hours ago
    },
  });

  const case2 = await prisma.case.upsert({
    where: { caseNumber: "CASE-2026-002" },
    update: {},
    create: {
      id: "case_002",
      caseNumber: "CASE-2026-002",
      animalId: animalCow2.id,
      createdByUserId: agentUser.id,
      reviewedByUserId: vetUser.id,
      reportSource: "FIELD_AGENT",
      status: "CONFIRMED",
      symptoms: ["Skin Lesions", "High Fever", "Reduced Milk Yield"],
      durationDays: 5,
      affectedCount: 4,
      mortalityCount: 0,
      photoUrl: "/images/clinical/cattle_skin_lesions.jpg",
      gpsLat: 18.5795,
      gpsLng: 73.981,
      analysisResult: masterAnalysisPayload,
      visionResult: visionAnalysisPayload,
      vetDiagnosis: "Lumpy Skin Disease (Nodule lesions present on thorax and udder)",
      vetRecommendedAction: "ISOLATE",
      vetFollowUpDate: new Date(Date.now() + 86400 * 1000 * 3), // 3 days in future
      vetNotes: "Strict herd quarantine. Ring vaccination around Wagholi village radius required.",
      reportedAt: new Date(Date.now() - 86400 * 1000 * 2), // 2 days ago
      reviewedAt: new Date(Date.now() - 86400 * 1000 * 1),
      confirmedAt: new Date(Date.now() - 3600 * 1000 * 5),
    },
  });

  // 9. Vaccination Records
  await prisma.vaccinationRecord.upsert({
    where: { id: "vac_001" },
    update: {},
    create: {
      id: "vac_001",
      animalId: animalCow1.id,
      vaccineName: "FMD Quadrivalent Vaccine",
      dateGiven: new Date("2026-01-15"),
      nextDueDate: new Date("2026-07-15"),
      administeredByUserId: vetUser.id,
    },
  });

  // 10. Treatment Records
  await prisma.treatmentRecord.upsert({
    where: { id: "treat_001" },
    update: {},
    create: {
      id: "treat_001",
      animalId: animalCow2.id,
      caseId: case2.id,
      medication: "Long-acting Oxytetracycline & Meloxicam antipyretic",
      dateGiven: new Date(Date.now() - 86400 * 1000),
      notes: "Topical antiseptic spray applied on skin nodules.",
      administeredByUserId: vetUser.id,
    },
  });

  // 11. Sample
  await prisma.sample.upsert({
    where: { id: "sample_001" },
    update: {},
    create: {
      id: "sample_001",
      caseId: case2.id,
      collectedByUserId: vetUser.id,
      collectedAt: new Date(Date.now() - 86400 * 1000),
      labName: "Western Regional Disease Diagnostic Laboratory (WRDDL)",
      sentAt: new Date(Date.now() - 3600 * 1000 * 12),
      status: "SENT",
    },
  });

  // 12. Alert
  await prisma.alert.upsert({
    where: { id: "alert_001" },
    update: {},
    create: {
      id: "alert_001",
      villageId: villageWagholi.id,
      diseaseName: "Lumpy Skin Disease",
      caseCount: 5,
      windowStart: new Date(Date.now() - 86400 * 1000 * 7),
      windowEnd: new Date(),
      active: true,
      notifiedAt: new Date(Date.now() - 3600 * 1000 * 4),
    },
  });

  // 13. Deterministic Seed for North 24 Parganas / Bidhannagar (High-Risk Vaccination Gap)
  const districtN24 = await prisma.district.upsert({
    where: { name: "North 24 Parganas" },
    update: {},
    create: {
      id: "district_north_24_parganas",
      name: "North 24 Parganas",
    },
  });

  const blockBidhannagar = await prisma.block.upsert({
    where: { districtId_name: { districtId: districtN24.id, name: "Bidhannagar Block" } },
    update: {},
    create: {
      id: "block_bidhannagar_01",
      districtId: districtN24.id,
      name: "Bidhannagar Block",
    },
  });

  const villageBidhannagar = await prisma.village.upsert({
    where: { blockId_name: { blockId: blockBidhannagar.id, name: "Bidhannagar" } },
    update: {},
    create: {
      id: "village_bidhannagar_01",
      blockId: blockBidhannagar.id,
      name: "Bidhannagar",
    },
  });

  const farmN24 = await prisma.farm.upsert({
    where: { id: "farm_bidhannagar_01" },
    update: {},
    create: {
      id: "farm_bidhannagar_01",
      name: "Bidhannagar Model Livestock Farm",
      villageId: villageBidhannagar.id,
      farmerUserId: farmerUser.id,
      fieldAgentUserId: agentUser.id,
      latitude: 22.5867,
      longitude: 88.4178,
    },
  });

  const herdN24 = await prisma.herd.upsert({
    where: { id: "herd_bidhannagar_01" },
    update: {},
    create: {
      id: "herd_bidhannagar_01",
      farmId: farmN24.id,
      species: "COW",
      name: "Bidhannagar Crossbred Herd",
    },
  });

  const animalN24_1 = await prisma.animal.upsert({
    where: { herdId_tag: { herdId: herdN24.id, tag: "IN-WB-COW-201" } },
    update: {},
    create: {
      id: "animal_n24_cow_201",
      herdId: herdN24.id,
      tag: "IN-WB-COW-201",
      species: "COW",
      breed: "Jersey Cross",
      ageMonths: 28,
    },
  });

  await prisma.animal.upsert({
    where: { herdId_tag: { herdId: herdN24.id, tag: "IN-WB-COW-202" } },
    update: {},
    create: {
      id: "animal_n24_cow_202",
      herdId: herdN24.id,
      tag: "IN-WB-COW-202",
      species: "COW",
      breed: "Sahiwal",
      ageMonths: 34,
    },
  });

  await prisma.case.upsert({
    where: { caseNumber: "CASE-2026-N24-SEED-01" },
    update: {},
    create: {
      id: "case_n24_seed_01",
      caseNumber: "CASE-2026-N24-SEED-01",
      animalId: animalN24_1.id,
      createdByUserId: farmerUser.id,
      reportSource: "FARMER",
      status: "UNDER_EXAMINATION",
      symptoms: ["High Fever", "Blisters in Mouth and Feet"],
      durationDays: 2,
      affectedCount: 3,
      mortalityCount: 0,
      analysisResult: masterAnalysisPayload,
      reportedAt: new Date(Date.now() - 3600 * 1000 * 6),
    },
  });

  await prisma.vaccinationRecord.upsert({
    where: { id: "vac_n24_001" },
    update: {},
    create: {
      id: "vac_n24_001",
      animalId: animalN24_1.id,
      vaccineName: "Foot and Mouth Disease (FMD) Oil Adjuvant Vaccine",
      dateGiven: new Date(Date.now() - 30 * 86400 * 1000),
      nextDueDate: new Date(Date.now() + 150 * 86400 * 1000),
      administeredByUserId: vetUser.id,
    },
  });

  console.log("✅ Maitri seed completed successfully against Neon PostgreSQL!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

