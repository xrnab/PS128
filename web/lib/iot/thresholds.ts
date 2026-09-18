import { Species } from "@prisma/client";

export interface SpeciesThreshold {
  speciesName: string;
  marathiName: string;
  normalLow: number;
  normalHigh: number;
  feverAt: number;
  hypothermiaAt: number;
  clinicalNotes: string;
}

export type TemperatureVitalState = "NORMAL" | "ELEVATED" | "FEVER" | "HYPOTHERMIA";

export interface TemperatureClassification {
  state: TemperatureVitalState;
  temperature: number;
  species: string;
  thresholdConfig: SpeciesThreshold;
  isAbnormal: boolean;
  alertTitleEn: string;
  alertTitleMr: string;
  alertMessageEn: string;
  alertMessageMr: string;
  recoveryMessageEn: string;
  recoveryMessageMr: string;
}

/**
 * Veterinary physiological temperature reference ranges (in Celsius).
 * Verified against FAO, Merck Veterinary Manual, and ICAR livestock health references.
 */
export const SPECIES_TEMP_THRESHOLDS: Record<string, SpeciesThreshold> = {
  COW: {
    speciesName: "Cow",
    marathiName: "गाय",
    normalLow: 38.0,
    normalHigh: 39.3,
    feverAt: 39.5,
    hypothermiaAt: 37.0,
    clinicalNotes: "Bovine normal range 38.0°C–39.3°C; calves may baseline up to 39.5°C.",
  },
  BUFFALO: {
    speciesName: "Buffalo",
    marathiName: "म्हैस",
    normalLow: 37.5,
    normalHigh: 39.0,
    feverAt: 39.2,
    hypothermiaAt: 37.0,
    clinicalNotes: "Water buffaloes have lower heat tolerance; fever onset occurs earlier at >39.2°C.",
  },
  GOAT: {
    speciesName: "Goat",
    marathiName: "शेळी",
    normalLow: 38.5,
    normalHigh: 39.7,
    feverAt: 40.0,
    hypothermiaAt: 37.5,
    clinicalNotes: "Caprine species naturally maintain higher baseline temperatures (39.5°C–39.8°C is normal).",
  },
  SHEEP: {
    speciesName: "Sheep",
    marathiName: "मेंढी",
    normalLow: 38.5,
    normalHigh: 39.9,
    feverAt: 40.0,
    hypothermiaAt: 37.5,
    clinicalNotes: "Ovine species baseline varies with fleece density; fever triggers at >40.0°C.",
  },
  DOG: {
    speciesName: "Dog",
    marathiName: "श्वान/कुत्रा",
    normalLow: 38.3,
    normalHigh: 39.2,
    feverAt: 39.5,
    hypothermiaAt: 37.2,
    clinicalNotes: "Canine normal range 38.3°C–39.2°C; hyperthermia flagged at >39.5°C.",
  },
  CAT: {
    speciesName: "Cat",
    marathiName: "मांजर",
    normalLow: 38.1,
    normalHigh: 39.2,
    feverAt: 39.5,
    hypothermiaAt: 37.2,
    clinicalNotes: "Feline normal range 38.1°C–39.2°C; hyperthermia flagged at >39.5°C.",
  },
  PET: {
    speciesName: "Pet",
    marathiName: "पाळीव प्राणी",
    normalLow: 38.2,
    normalHigh: 39.2,
    feverAt: 39.5,
    hypothermiaAt: 37.2,
    clinicalNotes: "Companion animal baseline; hyperthermia flagged at >39.5°C.",
  },
  OTHER: {
    speciesName: "Livestock",
    marathiName: "पशुधन",
    normalLow: 38.0,
    normalHigh: 39.3,
    feverAt: 39.5,
    hypothermiaAt: 37.0,
    clinicalNotes: "General livestock fallback threshold.",
  },
};

/**
 * Resolves the SpeciesThreshold configuration given a Prisma Species enum or string.
 */
export function getSpeciesThreshold(speciesInput?: string | Species | null): SpeciesThreshold {
  if (!speciesInput) {
    return SPECIES_TEMP_THRESHOLDS.COW;
  }

  const normalized = String(speciesInput).trim().toUpperCase();

  if (SPECIES_TEMP_THRESHOLDS[normalized]) {
    return SPECIES_TEMP_THRESHOLDS[normalized];
  }

  // Handle aliases and common names
  if (normalized.includes("COW") || normalized.includes("CATTLE")) {
    return SPECIES_TEMP_THRESHOLDS.COW;
  }
  if (normalized.includes("BUFFALO")) {
    return SPECIES_TEMP_THRESHOLDS.BUFFALO;
  }
  if (normalized.includes("GOAT") || normalized.includes("CAPRINE")) {
    return SPECIES_TEMP_THRESHOLDS.GOAT;
  }
  if (normalized.includes("SHEEP") || normalized.includes("OVINE")) {
    return SPECIES_TEMP_THRESHOLDS.SHEEP;
  }
  if (normalized.includes("DOG") || normalized.includes("CANINE")) {
    return SPECIES_TEMP_THRESHOLDS.DOG;
  }
  if (normalized.includes("CAT") || normalized.includes("FELINE")) {
    return SPECIES_TEMP_THRESHOLDS.CAT;
  }
  if (normalized.includes("PET")) {
    return SPECIES_TEMP_THRESHOLDS.PET;
  }

  return SPECIES_TEMP_THRESHOLDS.OTHER;
}

/**
 * Evaluates and classifies a vital temperature reading against the species-specific threshold.
 */
export function classifyTemperature(
  speciesInput: string | Species | null | undefined,
  tempCelsius: number,
  animalTag: string = "Animal"
): TemperatureClassification {
  const config = getSpeciesThreshold(speciesInput);
  const roundedTemp = Math.round(tempCelsius * 10) / 10;

  let state: TemperatureVitalState = "NORMAL";
  let isAbnormal = false;

  if (roundedTemp >= config.feverAt) {
    state = "FEVER";
    isAbnormal = true;
  } else if (roundedTemp <= config.hypothermiaAt) {
    state = "HYPOTHERMIA";
    isAbnormal = true;
  } else if (roundedTemp > config.normalHigh) {
    state = "ELEVATED";
    isAbnormal = false; // Elevated is monitoring band, not high-alarm fever
  } else {
    state = "NORMAL";
    isAbnormal = false;
  }

  // Pre-generate localized alert texts
  const alertTitleEn =
    state === "FEVER"
      ? `🚨 High Fever Alert: [${animalTag}] ${config.speciesName}`
      : state === "HYPOTHERMIA"
      ? `❄️ Hypothermia Alert: [${animalTag}] ${config.speciesName}`
      : `ℹ️ Temperature Update: [${animalTag}] ${config.speciesName}`;

  const alertTitleMr =
    state === "FEVER"
      ? `🚨 गंभीर ताप इशारा: [${animalTag}] ${config.marathiName}`
      : state === "HYPOTHERMIA"
      ? `❄️ तापमान घट इशारा: [${animalTag}] ${config.marathiName}`
      : `ℹ️ तापमान नोंद: [${animalTag}] ${config.marathiName}`;

  const alertMessageEn =
    state === "FEVER"
      ? `🚨 [${animalTag}] ${config.speciesName} shows fever: ${roundedTemp}°C recorded (normal <${config.feverAt}°C). Check your Maitri app for guidance.`
      : state === "HYPOTHERMIA"
      ? `❄️ [${animalTag}] ${config.speciesName} shows hypothermia: ${roundedTemp}°C recorded (normal >${config.hypothermiaAt}°C). Ensure warm bedding immediately.`
      : `ℹ️ [${animalTag}] ${config.speciesName} temperature is ${roundedTemp}°C (normal range ${config.normalLow}°C–${config.normalHigh}°C).`;

  const alertMessageMr =
    state === "FEVER"
      ? `🚨 [${animalTag}] ${config.marathiName}: ताप आढळला: ${roundedTemp}°C नोंदवला गेला (सामान्य मर्यादा <${config.feverAt}°C). अधिक माहितीसाठी मैत्री ॲप पहा.`
      : state === "HYPOTHERMIA"
      ? `❄️ [${animalTag}] ${config.marathiName}: तापमान अत्यंत कमी: ${roundedTemp}°C नोंदवला गेला (सामान्य मर्यादा >${config.hypothermiaAt}°C). त्वरित ऊबदार जागा द्या.`
      : `ℹ️ [${animalTag}] ${config.marathiName}: तापमान ${roundedTemp}°C (सामान्य मर्यादा ${config.normalLow}°C–${config.normalHigh}°C).`;

  const recoveryMessageEn = `✅ [${animalTag}] ${config.speciesName} temperature normalized: ${roundedTemp}°C recorded (normal range ${config.normalLow}°C–${config.normalHigh}°C). Vitals stable.`;
  const recoveryMessageMr = `✅ [${animalTag}] ${config.marathiName}: तापमान सामान्य झाले: ${roundedTemp}°C नोंदवला गेला (सामान्य मर्यादा ${config.normalLow}°C–${config.normalHigh}°C). प्रकृती स्थिर.`;

  return {
    state,
    temperature: roundedTemp,
    species: config.speciesName,
    thresholdConfig: config,
    isAbnormal,
    alertTitleEn,
    alertTitleMr,
    alertMessageEn,
    alertMessageMr,
    recoveryMessageEn,
    recoveryMessageMr,
  };
}
