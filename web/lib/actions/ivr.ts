"use server";

import prisma from "@/lib/db/prisma";
import { requireFarmer } from "@/lib/auth/permissions";
import { createCaseReportAction } from "@/lib/actions/cases";
import { runCaseAnalysisAction } from "@/lib/actions/analysis";
import { createAssistanceRequestAction } from "@/lib/actions/assistance";
import { ensureFarmerPrimaryFarmAction } from "@/lib/actions/farmer";

export type IvrStep =
  | "MENU"
  | "REPORT_SELECT_ANIMAL"
  | "REPORT_SELECT_SYMPTOMS"
  | "REPORT_DURATION_AFFECTED"
  | "REPORT_CONFIRM"
  | "REPORT_DONE"
  | "HELP_SELECT_FARM"
  | "HELP_SELECT_ANIMAL"
  | "HELP_REASON"
  | "HELP_REASON_CUSTOM"
  | "HELP_CONFIRM"
  | "HELP_DONE";

export interface IvrState {
  step: IvrStep;
  // Report fields
  animalId?: string;
  animalTag?: string;
  animalBreed?: string;
  symptomId?: string;
  symptomLabel?: string;
  durationDays?: number;
  affectedCount?: number;
  herdSize?: number;
  // Assistance fields
  farmId?: string;
  farmName?: string;
  helpAnimalId?: string | null;
  helpAnimalTag?: string | null;
  reason?: string;
  submissionId?: string;
  locale?: string;
}

export interface IvrTurnResult {
  reply: string;
  options?: { key: string; label: string }[];
  newState: IvrState | null;
  done: boolean;
  allowCustomInput?: boolean;
  result?: {
    kind: "REPORT" | "ASSISTANCE";
    caseNumber?: string;
    riskLevel?: string;
    riskScore?: number;
    advisorySummary?: string;
    assignedVeterinarian?: string | null;
    requestId?: string;
    assignedFieldAgent?: string | null;
    assignmentLevel?: string | null;
  };
}

const CANONICAL_IVR_SYMPTOMS = [
  { id: "Fever", label: "High Fever", mr: "तीव्र ताप (High Fever)" },
  { id: "Skin Lesions", label: "Skin Nodules / Lumps", mr: "त्वचेवर गाठी किंवा फोड (Skin Nodules)" },
  { id: "Salivation", label: "Excessive Salivation", mr: "तोंडातून लाळ गळणे (Excessive Salivation)" },
  { id: "Reduced Eating", label: "Loss of Appetite / Reduced Feeding", mr: "चारा न खाणे / भूक मंदावणे" },
  { id: "Labored Breathing", label: "Respiratory Distress / Rapid Breathing", mr: "श्वास घेण्यास त्रास / धाप लागणे" },
];

/**
 * Normalizes voice or DTMF text input by trimming and lowercasing.
 */
function normalizeInput(input?: string | null): string {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

/**
 * Step-based IVR Telephony State Machine.
 * Authenticates farmer, walks through minimal field reporting or assistance request,
 * and interacts with real production database and AI Master Analysis Engine.
 */
export async function processIvrTurn(
  currentState: IvrState | null,
  rawInput: string = "",
  clientLocale: string = "en"
): Promise<IvrTurnResult> {
  try {
    const farmer = await requireFarmer();
    const isMr = clientLocale === "mr";
    const safeRawInput = typeof rawInput === "string" ? rawInput : "";
    const input = normalizeInput(safeRawInput);

    // 1. Fetch farmer's registered farms & animals
    let farms = await prisma.farm.findMany({
      where: { farmerUserId: farmer.id },
      include: {
        village: true,
        herds: {
          include: {
            animals: {
              select: {
                id: true,
                tag: true,
                species: true,
                breed: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (farms.length === 0 && farmer.villageId) {
      await ensureFarmerPrimaryFarmAction(farmer.id);
      farms = await prisma.farm.findMany({
        where: { farmerUserId: farmer.id },
        include: {
          village: true,
          herds: {
            include: {
              animals: {
                select: {
                  id: true,
                  tag: true,
                  species: true,
                  breed: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
    }

    // Flatten all animals across all herds
    const allAnimals = farms.flatMap((f) => f.herds.flatMap((h) => h.animals));

    // Handle initial greeting or reset
    if (!currentState || input === "restart" || input === "reset" || input === "start") {
      return {
        reply: isMr
          ? "मैत्री स्वयंचलित पशुधन व्हॉइस सेवेमध्ये आपले स्वागत आहे. आज आम्ही आपल्या जनावरांसाठी काय मदत करू शकतो? खालीलपैकी एक क्रमांक दाबा किंवा बोला:"
          : "Welcome to Maitri Automated Livestock Voice Service. How can we assist your herd today? Please press or speak a numbered option:",
        options: [
          { key: "1", label: isMr ? "१. जनावरांच्या आजाराची तक्रार नोंदवा" : "1. Report a livestock health concern" },
          { key: "2", label: isMr ? "२. तातडीने फील्ड एजंटची मदत मागा" : "2. Request an urgent field agent visit" },
        ],
        newState: { step: "MENU", locale: clientLocale },
        done: false,
      };
    }

    // -------------------------------------------------------------
    // STEP: MENU
    // -------------------------------------------------------------
    if (currentState.step === "MENU") {
      if (input === "1" || input.includes("report") || input.includes("health") || input.includes("तक्रार") || input.includes("आजार")) {
        if (allAnimals.length === 0) {
          return {
            reply: isMr
              ? "आपल्या खात्यावर कोणतीही जनावरे नोंदवलेली नाहीत. कृपया प्रथम शेतकरी पोर्टलवरून जनावर जोडा."
              : "No registered animals were found in your herd. Please register an animal in the farmer portal first.",
            newState: null,
            done: true,
          };
        }

        const animalOptions = allAnimals.map((a, idx) => ({
          key: String(idx + 1),
          label: `${idx + 1}. ${a.breed || a.species} (Tag #${a.tag})`,
        }));

        return {
          reply: isMr
            ? "कोणत्या जनावरामध्ये आजाराची लक्षणे दिसत आहेत? कृपया आपल्या कळपातून क्रमांक निवडा किंवा टॅग सांगा:"
            : "Which animal is showing health symptoms? Please select an animal from your registered herd:",
          options: animalOptions,
          newState: { step: "REPORT_SELECT_ANIMAL", locale: clientLocale },
          done: false,
        };
      }

      if (input === "2" || input.includes("agent") || input.includes("help") || input.includes("मदत") || input.includes("भेट")) {
        if (farms.length === 0) {
          return {
            reply: isMr
              ? "आपल्या खात्यावर कोणतेही शेत किंवा गोठा सापडला नाही. कृपया प्रथम आपले शेत नोंदवा."
              : "No registered farm location found for your account. Please set up a farm first.",
            newState: null,
            done: true,
          };
        }

        // If multiple farms, prompt farm selection; else auto-select primary farm
        if (farms.length > 1) {
          const farmOptions = farms.map((f, idx) => ({
            key: String(idx + 1),
            label: `${idx + 1}. ${f.name} (${f.village?.name || "Village"})`,
          }));

          return {
            reply: isMr
              ? "फील्ड एजंट भेटीसाठी कृपया आपले शेत/गोठा निवडा:"
              : "Please select your farm location for the field agent visit:",
            options: farmOptions,
            newState: { step: "HELP_SELECT_FARM", locale: clientLocale },
            done: false,
          };
        }

        const primaryFarm = farms[0];
        const farmAnimals = primaryFarm.herds.flatMap((h) => h.animals);

        const animalHelpOptions = [
          { key: "0", label: isMr ? "०. संपूर्ण कळप किंवा सामान्य शेत भेट" : "0. General herd / entire farm visit" },
          ...farmAnimals.map((a, idx) => ({
            key: String(idx + 1),
            label: `${idx + 1}. ${a.breed || a.species} (Tag #${a.tag})`,
          })),
        ];

        return {
          reply: isMr
            ? `आपले शेत "${primaryFarm.name}" निवडले आहे. भेटीसाठी विशिष्ट जनावर निवडायचे आहे की संपूर्ण कळपासाठी भेट हवी आहे?`
            : `Selected farm "${primaryFarm.name}". Would you like to tag a specific animal, or request a general herd visit?`,
          options: animalHelpOptions,
          newState: {
            step: "HELP_SELECT_ANIMAL",
            farmId: primaryFarm.id,
            farmName: primaryFarm.name,
            locale: clientLocale,
          },
          done: false,
        };
      }

      return {
        reply: isMr
          ? "तो पर्याय ओळखता आला नाही. कृपया १ (आजाराची तक्रार) किंवा २ (फील्ड एजंट मदत) निवडा."
          : "We didn't catch that choice. Please press 1 to report a health concern, or 2 to request a field agent.",
        options: [
          { key: "1", label: isMr ? "१. जनावरांच्या आजाराची तक्रार नोंदवा" : "1. Report a livestock health concern" },
          { key: "2", label: isMr ? "२. तातडीने फील्ड एजंटची मदत मागा" : "2. Request an urgent field agent visit" },
        ],
        newState: { step: "MENU", locale: clientLocale },
        done: false,
      };
    }

    // -------------------------------------------------------------
    // BRANCH 1: REPORT HEALTH CONCERN
    // -------------------------------------------------------------

    // STEP: REPORT_SELECT_ANIMAL
    if (currentState.step === "REPORT_SELECT_ANIMAL") {
      let selectedAnimal = null;
      const indexMatch = parseInt(input, 10);
      if (!isNaN(indexMatch) && indexMatch >= 1 && indexMatch <= allAnimals.length) {
        selectedAnimal = allAnimals[indexMatch - 1];
      } else {
        selectedAnimal = allAnimals.find((a) => a.tag.toLowerCase() === input || input.includes(a.tag.toLowerCase()));
      }

      if (!selectedAnimal) {
        const animalOptions = allAnimals.map((a, idx) => ({
          key: String(idx + 1),
          label: `${idx + 1}. ${a.breed || a.species} (Tag #${a.tag})`,
        }));
        return {
          reply: isMr
            ? "कृपया जनावराचा वैध क्रमांक किंवा टॅग नंबर निवडा:"
            : "Please select a valid animal number or tag from the list:",
          options: animalOptions,
          newState: currentState,
          done: false,
        };
      }

      const symptomOptions = CANONICAL_IVR_SYMPTOMS.map((s, idx) => ({
        key: String(idx + 1),
        label: isMr ? `${idx + 1}. ${s.mr}` : `${idx + 1}. ${s.label}`,
      }));

      return {
        reply: isMr
          ? `निवडले: ${selectedAnimal.breed || selectedAnimal.species} (टॅग #${selectedAnimal.tag}). जनावरामध्ये कोणते मुख्य लक्षण दिसत आहे?`
          : `Selected ${selectedAnimal.breed || selectedAnimal.species} (Tag #${selectedAnimal.tag}). What is the primary observed symptom?`,
        options: symptomOptions,
        newState: {
          ...currentState,
          step: "REPORT_SELECT_SYMPTOMS",
          animalId: selectedAnimal.id,
          animalTag: selectedAnimal.tag,
          animalBreed: selectedAnimal.breed || selectedAnimal.species,
        },
        done: false,
      };
    }

    // STEP: REPORT_SELECT_SYMPTOMS
    if (currentState.step === "REPORT_SELECT_SYMPTOMS") {
      let symptom = null;
      const indexMatch = parseInt(input, 10);
      if (!isNaN(indexMatch) && indexMatch >= 1 && indexMatch <= CANONICAL_IVR_SYMPTOMS.length) {
        symptom = CANONICAL_IVR_SYMPTOMS[indexMatch - 1];
      } else {
        symptom = CANONICAL_IVR_SYMPTOMS.find(
          (s) => s.id.toLowerCase() === input || s.label.toLowerCase().includes(input)
        );
      }

      if (!symptom) {
        const symptomOptions = CANONICAL_IVR_SYMPTOMS.map((s, idx) => ({
          key: String(idx + 1),
          label: isMr ? `${idx + 1}. ${s.mr}` : `${idx + 1}. ${s.label}`,
        }));
        return {
          reply: isMr
            ? "कृपया खालीलपैकी एका लक्षणाचा क्रमांक निवडा किंवा बोला:"
            : "Please select or speak one of the following symptom options:",
          options: symptomOptions,
          newState: currentState,
          done: false,
        };
      }

      const durationOptions = [
        { key: "1", label: isMr ? "१. आजच सुरू झाले आहे (१ जनावर)" : "1. Just started today (1 animal affected)" },
        { key: "2", label: isMr ? "२. २ ते ३ दिवसांपासून (१ जनावर)" : "2. 2 to 3 days (1 animal affected)" },
        { key: "3", label: isMr ? "३. ३ दिवसांपेक्षा जास्त किंवा अनेक जनावरे" : "3. More than 3 days or multiple animals" },
      ];

      return {
        reply: isMr
          ? `लक्षण नोंदवले: ${symptom.mr}. जनावर किती दिवसांपासून आजारी आहे?`
          : `Noted symptom: ${symptom.label}. How long has the animal been affected?`,
        options: durationOptions,
        newState: {
          ...currentState,
          step: "REPORT_DURATION_AFFECTED",
          symptomId: symptom.id,
          symptomLabel: isMr ? symptom.mr : symptom.label,
        },
        done: false,
      };
    }

    // STEP: REPORT_DURATION_AFFECTED
    if (currentState.step === "REPORT_DURATION_AFFECTED") {
      let durationDays = 1;
      let affectedCount = 1;

      if (input === "1" || input.includes("today") || input.includes("आज")) {
        durationDays = 1;
        affectedCount = 1;
      } else if (input === "2" || input.includes("2") || input.includes("3") || input.includes("दिवस")) {
        durationDays = 3;
        affectedCount = 1;
      } else if (input === "3" || input.includes("more") || input.includes("multiple") || input.includes("अनेक")) {
        durationDays = 4;
        affectedCount = 2;
      } else {
        const durationOptions = [
          { key: "1", label: isMr ? "१. आजच सुरू झाले आहे (१ जनावर)" : "1. Just started today (1 animal affected)" },
          { key: "2", label: isMr ? "२. २ ते ३ दिवसांपासून (१ जनावर)" : "2. 2 to 3 days (1 animal affected)" },
          { key: "3", label: isMr ? "३. ३ दिवसांपेक्षा जास्त किंवा अनेक जनावरे" : "3. More than 3 days or multiple animals" },
        ];
        return {
          reply: isMr
            ? "कृपया कालावधीचा पर्याय निवडा (१, २ किंवा ३):"
            : "Please select the duration option (1, 2, or 3):",
          options: durationOptions,
          newState: currentState,
          done: false,
        };
      }

      const confirmOptions = [
        { key: "1", label: isMr ? "१. नोंदणी निश्चित करा (Confirm)" : "1. Confirm and Submit Report" },
        { key: "2", label: isMr ? "२. रद्द करा व सुरुवातीला जा" : "2. Cancel and Start Over" },
      ];

      return {
        reply: isMr
          ? `सारांश: ${currentState.animalBreed} (टॅग #${currentState.animalTag}), लक्षण: ${currentState.symptomLabel}, कालावधी: ${durationDays} दिवस. अहवाल पाठवण्यासाठी १ दाबा, किंवा रद्द करण्यासाठी २ दाबा.`
          : `Summary: ${currentState.animalBreed} (Tag #${currentState.animalTag}), symptom: ${currentState.symptomLabel}, duration: ${durationDays} day(s). Press 1 to confirm submission, or 2 to start over.`,
        options: confirmOptions,
        newState: {
          ...currentState,
          step: "REPORT_CONFIRM",
          durationDays,
          affectedCount,
          herdSize: Math.max(affectedCount, 10),
        },
        done: false,
      };
    }

    // STEP: REPORT_CONFIRM
    if (currentState.step === "REPORT_CONFIRM") {
      if (input === "2" || input.includes("cancel") || input.includes("रद्द")) {
        return {
          reply: isMr
            ? "अहवाल रद्द केला आहे. मैत्री मेनूवर परत आलो आहोत. १ किंवा २ निवडा:"
            : "Report cancelled. Returning to main menu. Please press 1 or 2:",
          options: [
            { key: "1", label: isMr ? "१. जनावरांच्या आजाराची तक्रार नोंदवा" : "1. Report a livestock health concern" },
            { key: "2", label: isMr ? "२. तातडीने फील्ड एजंटची मदत मागा" : "2. Request an urgent field agent visit" },
          ],
          newState: { step: "MENU", locale: clientLocale },
          done: false,
        };
      }

      if (input === "1" || input.includes("confirm") || input.includes("submit") || input.includes("होय") || input.includes("निश्चित")) {
        // Execute real creation & analysis pipeline
        const submissionId = currentState.submissionId || `ivr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const reportResult = await createCaseReportAction({
          submissionId,
          animalId: currentState.animalId!,
          symptoms: [currentState.symptomId || "Fever"],
          durationDays: currentState.durationDays || 1,
          affectedCount: currentState.affectedCount || 1,
          herdSize: currentState.herdSize || 10,
          mortalityCount: 0,
        });

        if (!reportResult.success || !reportResult.caseId) {
          return {
            reply: isMr
              ? `तक्रार नोंदवताना अडचण आली: ${reportResult.error || "तांत्रिक त्रुटी"}. पुन्हा प्रयत्न करण्यासाठी १ दाबा.`
              : `Unable to submit case report: ${reportResult.error || "System error"}. Press 1 to retry.`,
            options: [
              { key: "1", label: isMr ? "१. पुन्हा प्रयत्न करा" : "1. Retry Submission" },
              { key: "2", label: isMr ? "२. रद्द करा" : "2. Cancel" },
            ],
            newState: currentState,
            done: false,
          };
        }

        // Run real Master Analysis Engine
        let riskScore = 45;
        let riskLevel = "MEDIUM";
        let advisorySummary = "Keep animal isolated and provide fresh water.";

        try {
          const analysisRes = await runCaseAnalysisAction(reportResult.caseId);
          if (analysisRes.success && analysisRes.analysisResult) {
            const rawAnalysis = analysisRes.analysisResult as Record<string, unknown>;
            riskScore = typeof rawAnalysis.overall_risk_score === "number" ? rawAnalysis.overall_risk_score : 45;
            riskLevel = typeof rawAnalysis.overall_risk_level === "string" ? rawAnalysis.overall_risk_level : "MEDIUM";

            const advisoryObj = rawAnalysis.farmer_advisory as { advisory?: string } | undefined;
            if (advisoryObj?.advisory && typeof advisoryObj.advisory === "string") {
              advisorySummary = advisoryObj.advisory.split(".")[0] + ".";
            }
          }
        } catch (err: unknown) {
          console.warn("[IVR Analysis Warning]:", err);
        }

        const rawVetName = reportResult.assignedVeterinarian?.name?.trim();
        const vetName = rawVetName
          ? rawVetName.startsWith("Dr.") ? rawVetName : `Dr. ${rawVetName}`
          : isMr ? "नियुक्त पशुवैद्यक" : "Territory Veterinarian";

        const reply = isMr
          ? `आपली आरोग्य तक्रार केस क्रमांक #${reportResult.caseNumber} अंतर्गत नोंदवली गेली आहे. AI रोग विश्लेषणानुसार जोखीम पातळी: ${riskLevel} (${riskScore}/१००). सल्ला: ${advisorySummary} नियुक्त डॉक्टर ${vetName} लवकरच तपासणी करतील.`
          : `Your health concern has been recorded under Case Number #${reportResult.caseNumber}. AI Risk Assessment evaluates overall risk as ${riskLevel} (${riskScore} out of 100). Clinical Advisory: ${advisorySummary} Assigned veterinarian ${vetName} will review shortly.`;

        return {
          reply,
          newState: { step: "REPORT_DONE", locale: clientLocale },
          done: true,
          result: {
            kind: "REPORT",
            caseNumber: reportResult.caseNumber,
            riskLevel,
            riskScore,
            advisorySummary,
            assignedVeterinarian: vetName,
          },
        };
      }

      return {
        reply: isMr
          ? "अहवाल पाठवण्यासाठी १ दाबा, किंवा रद्द करण्यासाठी २ दाबा:"
          : "Press 1 to confirm and submit the report, or 2 to start over:",
        options: [
          { key: "1", label: isMr ? "१. नोंदणी निश्चित करा" : "1. Confirm and Submit Report" },
          { key: "2", label: isMr ? "२. रद्द करा व सुरुवातीला जा" : "2. Cancel and Start Over" },
        ],
        newState: currentState,
        done: false,
      };
    }

    // -------------------------------------------------------------
    // BRANCH 2: REQUEST FIELD AGENT
    // -------------------------------------------------------------

    // STEP: HELP_SELECT_FARM
    if (currentState.step === "HELP_SELECT_FARM") {
      let selectedFarm = null;
      const indexMatch = parseInt(input, 10);
      if (!isNaN(indexMatch) && indexMatch >= 1 && indexMatch <= farms.length) {
        selectedFarm = farms[indexMatch - 1];
      }

      if (!selectedFarm) {
        const farmOptions = farms.map((f, idx) => ({
          key: String(idx + 1),
          label: `${idx + 1}. ${f.name} (${f.village?.name || "Village"})`,
        }));
        return {
          reply: isMr ? "कृपया शेताचा योग्य क्रमांक निवडा:" : "Please select a valid farm number:",
          options: farmOptions,
          newState: currentState,
          done: false,
        };
      }

      const farmAnimals = selectedFarm.herds.flatMap((h) => h.animals);
      const animalHelpOptions = [
        { key: "0", label: isMr ? "०. संपूर्ण कळप किंवा सामान्य शेत भेट" : "0. General herd / entire farm visit" },
        ...farmAnimals.map((a, idx) => ({
          key: String(idx + 1),
          label: `${idx + 1}. ${a.breed || a.species} (Tag #${a.tag})`,
        })),
      ];

      return {
        reply: isMr
          ? `शेत निवडले: "${selectedFarm.name}". विशिष्ट जनावरासाठी भेट हवी आहे की संपूर्ण कळपासाठी?`
          : `Selected farm: "${selectedFarm.name}". Tag a specific animal, or request a general herd visit?`,
        options: animalHelpOptions,
        newState: {
          step: "HELP_SELECT_ANIMAL",
          farmId: selectedFarm.id,
          farmName: selectedFarm.name,
          locale: clientLocale,
        },
        done: false,
      };
    }

    // STEP: HELP_SELECT_ANIMAL
    if (currentState.step === "HELP_SELECT_ANIMAL") {
      const selectedFarm = farms.find((f) => f.id === currentState.farmId) || farms[0];
      const farmAnimals = selectedFarm?.herds.flatMap((h) => h.animals) || [];

      let helpAnimalId: string | null = null;
      let helpAnimalTag: string | null = null;

      if (input === "0" || input.includes("general") || input.includes("all") || input.includes("संपूर्ण")) {
        helpAnimalId = null;
        helpAnimalTag = isMr ? "संपूर्ण कळप" : "Entire Herd";
      } else {
        const idx = parseInt(input, 10);
        if (!isNaN(idx) && idx >= 1 && idx <= farmAnimals.length) {
          const a = farmAnimals[idx - 1];
          helpAnimalId = a.id;
          helpAnimalTag = `Tag #${a.tag}`;
        } else {
          const a = farmAnimals.find((animal) => animal.tag.toLowerCase() === input || input.includes(animal.tag.toLowerCase()));
          if (a) {
            helpAnimalId = a.id;
            helpAnimalTag = `Tag #${a.tag}`;
          }
        }
      }

      const reasonOptions = [
        { key: "1", label: isMr ? "१. प्रत्यक्ष शारीरिक तपासणीची गरज" : "1. General physical examination" },
        { key: "2", label: isMr ? "२. नियमित लसीकरण सल्ला" : "2. Routine vaccination advisory" },
        { key: "3", label: isMr ? "३. जनावराची प्रकृती अचानक खालावणे" : "3. Sudden condition deterioration" },
        { key: "4", label: isMr ? "४. इतर — स्वतःचे कारण बोला किंवा टाइप करा" : "4. Other — speak or type custom description" },
      ];

      return {
        reply: isMr
          ? `नोंदवले: ${helpAnimalTag || "सामान्य भेट"}. फील्ड एजंट भेटीचे मुख्य कारण काय आहे?`
          : `Noted: ${helpAnimalTag || "General visit"}. What is the primary reason for requesting a field agent?`,
        options: reasonOptions,
        newState: {
          ...currentState,
          step: "HELP_REASON",
          helpAnimalId,
          helpAnimalTag,
        },
        done: false,
      };
    }

    // STEP: HELP_REASON
    if (currentState.step === "HELP_REASON") {
      if (input === "1" || input.includes("exam") || input.includes("तपासणी")) {
        const reason = isMr ? "प्रत्यक्ष शारीरिक वैद्यकीय तपासणीची आवश्यकता" : "General physical clinical examination needed";
        return buildHelpConfirmResult(currentState, reason, isMr, clientLocale);
      }
      if (input === "2" || input.includes("vaccin") || input.includes("लस")) {
        const reason = isMr ? "नियमित कळप लसीकरण व औषधोपचार सल्ला" : "Routine herd vaccination consultation and scheduling";
        return buildHelpConfirmResult(currentState, reason, isMr, clientLocale);
      }
      if (input === "3" || input.includes("sudden") || input.includes("decline") || input.includes("खालावणे")) {
        const reason = isMr ? "जनावराची शारीरिक प्रकृती अचानक खालावली आहे" : "Sudden physical condition deterioration observed";
        return buildHelpConfirmResult(currentState, reason, isMr, clientLocale);
      }
      if (input === "4" || input.includes("other") || input.includes("इतर")) {
        return {
          reply: isMr
            ? "कृपया फील्ड एजंट भेटीचे कारण बोला किंवा टाइप करा (किमान ५ अक्षरे):"
            : "Please speak or type your reason for the field agent visit (minimum 5 characters):",
          options: [],
          newState: {
            ...currentState,
            step: "HELP_REASON_CUSTOM",
          },
          allowCustomInput: true,
          done: false,
        };
      }

      const reasonOptions = [
        { key: "1", label: isMr ? "१. प्रत्यक्ष शारीरिक तपासणीची गरज" : "1. General physical examination" },
        { key: "2", label: isMr ? "२. नियमित लसीकरण सल्ला" : "2. Routine vaccination advisory" },
        { key: "3", label: isMr ? "३. जनावराची प्रकृती अचानक खालावणे" : "3. Sudden condition deterioration" },
        { key: "4", label: isMr ? "४. इतर — स्वतःचे कारण बोला किंवा टाइप करा" : "4. Other — speak or type custom description" },
      ];
      return {
        reply: isMr ? "कृपया १, २, ३ किंवा ४ पैकी एका पर्यायावर टॅप करा किंवा बोला:" : "Please tap or speak option 1, 2, 3, or 4:",
        options: reasonOptions,
        newState: currentState,
        done: false,
      };
    }

    // STEP: HELP_REASON_CUSTOM
    if (currentState.step === "HELP_REASON_CUSTOM") {
      const customReason = rawInput.trim();
      if (customReason.length < 5) {
        return {
          reply: isMr
            ? "कारणाचे वर्णन थोडे लहान आहे. कृपया किमान ५ अक्षरांमध्ये कारण सांगा किंवा टाइप करा:"
            : "The description is too short. Please speak or type at least 5 characters for your reason:",
          options: [],
          newState: currentState,
          allowCustomInput: true,
          done: false,
        };
      }

      return buildHelpConfirmResult(currentState, customReason, isMr, clientLocale);
    }

    // STEP: HELP_CONFIRM
    if (currentState.step === "HELP_CONFIRM") {
      if (input === "2" || input.includes("cancel") || input.includes("रद्द")) {
        return {
          reply: isMr
            ? "विनंती रद्द केली. मुख्य मेनूवर परत आलो आहोत. १ किंवा २ निवडा:"
            : "Request cancelled. Returning to main menu. Please press 1 or 2:",
          options: [
            { key: "1", label: isMr ? "१. जनावरांच्या आजाराची तक्रार नोंदवा" : "1. Report a livestock health concern" },
            { key: "2", label: isMr ? "२. तातडीने फील्ड एजंटची मदत मागा" : "2. Request an urgent field agent visit" },
          ],
          newState: { step: "MENU", locale: clientLocale },
          done: false,
        };
      }

      if (input === "1" || input.includes("confirm") || input.includes("dispatch") || input.includes("होय") || input.includes("निश्चित")) {
        const assistResult = await createAssistanceRequestAction({
          farmId: currentState.farmId!,
          animalId: currentState.helpAnimalId,
          reason: currentState.reason!,
        });

        if (!assistResult.success || !assistResult.requestId) {
          return {
            reply: isMr
              ? `मदत विनंती पाठवताना अडचण आली: ${assistResult.error || "तांत्रिक त्रुटी"}. पुन्हा प्रयत्न करण्यासाठी १ दाबा.`
              : `Unable to submit assistance request: ${assistResult.error || "System error"}. Press 1 to retry.`,
            options: [
              { key: "1", label: isMr ? "१. पुन्हा प्रयत्न करा" : "1. Retry Request" },
              { key: "2", label: isMr ? "२. रद्द करा" : "2. Cancel" },
            ],
            newState: currentState,
            done: false,
          };
        }

        const agentName = assistResult.assignedFieldAgent?.name
          ? assistResult.assignedFieldAgent.name
          : isMr ? "स्थानिक पशुसखी" : "Local Field Agent";
        const level = assistResult.assignmentLevel || "territory";

        const reply = isMr
          ? `आपली मदत विनंती #${assistResult.requestId.substring(0, 8)} यशस्वीरित्या नोंदवली गेली आहे. नियुक्त फील्ड एजंट ${agentName} (${level} स्तर) यांना सूचित करण्यात आले असून ते आपल्याशी संपर्क साधतील.`
          : `Your assistance request #${assistResult.requestId.substring(0, 8)} has been placed. Assigned field agent ${agentName} (${level} tier) has been alerted and will coordinate your visit.`;

        return {
          reply,
          newState: { step: "HELP_DONE", locale: clientLocale },
          done: true,
          result: {
            kind: "ASSISTANCE",
            requestId: assistResult.requestId,
            assignedFieldAgent: agentName,
            assignmentLevel: level,
          },
        };
      }

      return {
        reply: isMr
          ? "विनंती निश्चित करण्यासाठी १ दाबा, किंवा रद्द करण्यासाठी २ दाबा:"
          : "Press 1 to confirm and dispatch the request, or 2 to start over:",
        options: [
          { key: "1", label: isMr ? "१. विनंती पाठवा (Confirm)" : "1. Confirm and Dispatch Request" },
          { key: "2", label: isMr ? "२. रद्द करा व सुरुवातीला जा" : "2. Cancel and Start Over" },
        ],
        newState: currentState,
        done: false,
      };
    }

    // Default catch-all
    return {
      reply: isMr
        ? "कॉल पूर्ण झाला आहे. नवीन कॉल सुरू करण्यासाठी खालील बटणावर टॅप करा."
        : "Call completed. Tap below to start a new call session.",
      options: [
        { key: "start", label: isMr ? "नवीन कॉल सुरू करा" : "Start New Call" },
      ],
      newState: null,
      done: true,
    };
  } catch (err: unknown) {
    console.error("[processIvrTurn Error]:", err);
    const msg = err instanceof Error ? err.message : "System error";
    return {
      reply: clientLocale === "mr"
        ? `सिस्टमशी संपर्क साधताना त्रुटी आली: ${msg}. कृपया पुन्हा प्रयत्न करा.`
        : `Maitri Voice Service encountered an error: ${msg}. Let's retry this step.`,
      options: [
        { key: "restart", label: clientLocale === "mr" ? "सुरुवातीपासून करा" : "Restart Call" },
      ],
      newState: null,
      done: false,
    };
  }
}

function buildHelpConfirmResult(
  state: IvrState,
  reason: string,
  isMr: boolean,
  locale: string
): IvrTurnResult {
  const confirmOptions = [
    { key: "1", label: isMr ? "१. विनंती निश्चित करा (Confirm)" : "1. Confirm and Dispatch Request" },
    { key: "2", label: isMr ? "२. रद्द करा व सुरुवातीला जा" : "2. Cancel and Start Over" },
  ];

  const animalText = state.helpAnimalTag || (isMr ? "संपूर्ण कळप" : "Entire Herd");

  return {
    reply: isMr
      ? `सारांश: शेत "${state.farmName}", जनावर: ${animalText}, कारण: "${reason}". विनंती निश्चित करण्यासाठी १ दाबा, किंवा रद्द करण्यासाठी २ दाबा.`
      : `Summary: Farm "${state.farmName}", Animal: ${animalText}, Reason: "${reason}". Press 1 to confirm request, or 2 to start over.`,
    options: confirmOptions,
    newState: {
      ...state,
      step: "HELP_CONFIRM",
      reason,
      locale,
    },
    done: false,
  };
}
