import prisma from "@/lib/db/prisma";
import { getRiskRank } from "@/lib/vet/schemas";
import { Prisma } from "@prisma/client";
import { isValidCoordinate } from "@/components/authority/mapUtils";
import { formatDate } from "@/lib/utils";

export interface DistrictCommandFilterOptions {
  districtId: string | null;
  timeRange?: "today" | "7d" | "30d" | "90d" | "custom" | "all";
  customStartDate?: string | null;
  customEndDate?: string | null;
  blockId?: string | null;
  villageId?: string | null;
}

export interface DistrictSnapshotMetrics {
  totalFarmers: number;
  totalFarms: number;
  totalAnimals: number;
  currentActiveCases: number;
  currentPendingReviews: number;
  currentUnderExam: number;
  currentLabReferrals: number;
  currentConfirmedCases: number;
  currentClosedHarmless: number;
  currentActiveVisits: number;
  currentActiveRequests: number;
  totalVeterinarians: number;
  totalFieldAgents: number;
  currentActiveAlerts: number;
  currentFollowUpsDue: number;
}

export interface SelectedPeriodMetrics {
  periodLabel: string;
  periodSubLabel: string;
  timeRange: "today" | "7d" | "30d" | "90d" | "custom" | "all";
  startDate: string | null;
  endDate: string | null;
  casesReported: number;
  assistanceRequests: number;
  fieldVisits: number;
  veterinaryReports: number;
  alertsCreated: number;
  vaccinationsRecorded: number;
  treatmentsRecorded: number;
  casesConfirmed: number;
  casesReviewed: number;
  avgTimeToReviewHours: number | null;
  avgTimeToConfirmationHours: number | null;
}

export interface KpiSummaryMetrics {
  totalFarmers: number;
  totalFarms: number;
  totalAnimals: number;
  activeCases: number;
  pendingReviews: number;
  underExamination: number;
  labReferrals: number;
  confirmedCases: number;
  closedHarmlessCases: number;
  activeAssistanceRequests: number;
  activeFieldVisits: number;
  totalVeterinarians: number;
  totalFieldAgents: number;
  activeAlerts: number;
  followUpsDue: number;
  avgTimeToReviewHours: number | null;
  avgTimeToConfirmationHours: number | null;
}

export interface VetCoverageItem {
  id: string;
  name: string;
  phone: string;
  serviceArea: string;
  assignedCases: number;
  activeCases: number;
  pendingReviews: number;
  underExam: number;
  labReferrals: number;
  followUps: number;
  farmersUnderCare: number;
  animalsUnderCare: number;
  workloadScore: number;
  assignedCasesList: {
    id: string;
    caseNumber: string;
    status: string;
    riskLevel: string;
    species: string;
    animalTag: string;
    farmerName: string;
    farmName: string;
    villageName: string;
    blockName: string;
    reportedAt: string;
    diagnosis?: string | null;
    followUpDate?: string | null;
    followUpCompleted: boolean;
  }[];
}

export interface FieldAgentCoverageItem {
  id: string;
  name: string;
  phone: string;
  serviceArea: string;
  pendingRequests: number;
  acceptedRequests: number;
  scheduledVisits: number;
  completedVisits: number;
  farmersAssisted: number;
  animalsVisited: number;
  openRequests: number;
  workloadScore: number;
  activeRequestsList: {
    id: string;
    reason: string;
    status: string;
    requestedAt: string;
    scheduledAt?: string | null;
    farmerName: string;
    farmName: string;
    villageName: string;
    blockName: string;
    animalTag?: string | null;
    species?: string | null;
    caseNumber?: string | null;
    visitObservations?: string | null;
    visitCompletedAt?: string | null;
  }[];
}

export interface DistrictPipelineStage {
  status: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  color?: string;
  meta?: string;
}

export const VACCINATION_GAP_THRESHOLD_PERCENT = 60;
export const HIGH_PRIORITY_RISK_LEVELS = ["HIGH", "CRITICAL"] as const;

export interface VillageAnalysisRow {
  villageId: string;
  villageName: string;
  blockName: string;
  farmersCount: number;
  farmsCount: number;
  animalsCount: number;
  totalCases: number;
  activeCases: number;
  activeAlerts: number;
  highestRisk: string;
  vaccinationCoveragePercent: number;
  priorityFlag: boolean;
  gapPriorityScore: number;
  vaccinatedAnimalsCount: number;
}

export interface DistrictMapLayersData {
  heatmapPoints: {
    lat: number;
    lng: number;
    weight: number;
    caseCount: number;
    riskLevel: string;
    locationName: string;
  }[];
  farms: {
    id: string;
    name: string;
    villageName: string;
    blockName: string;
    farmerName: string;
    lat: number;
    lng: number;
    animalCount: number;
    activeCaseCount: number;
  }[];
  cases: {
    id: string;
    caseNumber: string;
    status: string;
    riskLevel: string;
    species: string;
    animalTag: string;
    farmName: string;
    villageName: string;
    blockName: string;
    farmerName: string;
    reportedAt: string;
    diagnosis?: string | null;
    lat: number;
    lng: number;
  }[];
  veterinarians: {
    id: string;
    name: string;
    phone: string;
    serviceArea: string;
    activeCasesCount: number;
    pendingReviewsCount: number;
    lat: number;
    lng: number;
  }[];
  fieldAgents: {
    id: string;
    name: string;
    phone: string;
    serviceArea: string;
    openRequestsCount: number;
    completedVisitsCount: number;
    lat: number;
    lng: number;
  }[];
  fieldVisits: {
    id: string;
    visitDate: string;
    agentName: string;
    farmName: string;
    villageName: string;
    status: string;
    observations?: string | null;
    lat: number;
    lng: number;
  }[];
  alerts: {
    id: string;
    diseaseName: string;
    caseCount: number;
    villageName: string;
    blockName: string;
    windowStart: string;
    windowEnd: string;
    active: boolean;
    lat: number;
    lng: number;
  }[];
}

export interface RecentActivityItem {
  id: string;
  type: "CASE" | "VISIT" | "REPORT" | "ALERT";
  title: string;
  subtitle: string;
  timestamp: string;
  statusBadge: string;
  statusVariant?: string;
  linkUrl?: string;
}

export interface DistrictCommandCenterData {
  districtName: string;
  districtId: string | null;
  activeFilters: {
    timeRange: "today" | "7d" | "30d" | "90d" | "custom" | "all";
    blockId: string | null;
    villageId: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  filterOptions: {
    blocks: { id: string; name: string; villageCount: number }[];
    villages: { id: string; name: string; blockId: string }[];
  };
  snapshot: DistrictSnapshotMetrics;
  periodMetrics: SelectedPeriodMetrics;
  kpis: KpiSummaryMetrics;
  pipeline: DistrictPipelineStage[];
  veterinarians: VetCoverageItem[];
  fieldAgents: FieldAgentCoverageItem[];
  charts: {
    casesByStatus: ChartDataPoint[];
    casesByRisk: ChartDataPoint[];
    casesOverTime: ChartDataPoint[];
    casesByVillage: ChartDataPoint[];
    vetWorkload: ChartDataPoint[];
    agentWorkload: ChartDataPoint[];
    speciesDistribution: ChartDataPoint[];
    alertsBySeverity: ChartDataPoint[];
    assistanceRequestStatus: ChartDataPoint[];
  };
  villageAnalysis: VillageAnalysisRow[];
  mapLayers: DistrictMapLayersData;
  recentActivity: RecentActivityItem[];
}

// Transparent Heatmap Intensity Weighting Model
export function calculateRiskIntensity(riskLevel?: string | null, hasAlert: boolean = false): number {
  const rank = getRiskRank(riskLevel);
  let baseWeight = 1.0;
  if (rank >= 5) baseWeight = 5.0; // CRITICAL
  else if (rank === 4) baseWeight = 4.0; // HIGH
  else if (rank === 3) baseWeight = 3.0; // ELEVATED
  else if (rank === 2) baseWeight = 2.0; // MEDIUM
  else if (rank === 1) baseWeight = 1.0; // LOW

  if (hasAlert) baseWeight += 5.0; // Active village outbreak alert
  return baseWeight;
}

export interface PeriodDateBounds {
  gte?: Date;
  lte?: Date;
  label: string;
  subLabel: string;
  startIso: string | null;
  endIso: string | null;
}

/**
 * Calculates start and end timestamps strictly adhering to Indian Standard Time (Asia/Kolkata / UTC+05:30)
 * so that "Today" covers 00:00:00 IST through 23:59:59.999 IST without UTC boundary clipping.
 */
export function calculateDateRangeBounds(
  timeRange: "today" | "7d" | "30d" | "90d" | "custom" | "all" = "30d",
  customStart?: string | null,
  customEnd?: string | null
): PeriodDateBounds {
  const now = new Date();

  const formatIST = (d: Date, includeYear: boolean = true) => {
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: includeYear ? "numeric" : undefined,
    });
  };

  if (timeRange === "today") {
    // Determine YYYY-MM-DD in Asia/Kolkata timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const istDateString = formatter.format(now); // e.g. "2026-09-12"
    const startOfToday = new Date(`${istDateString}T00:00:00+05:30`);
    const endOfToday = new Date(`${istDateString}T23:59:59.999+05:30`);

    return {
      gte: startOfToday,
      lte: endOfToday,
      label: "Today",
      subLabel: formatIST(startOfToday, true),
      startIso: startOfToday.toISOString(),
      endIso: endOfToday.toISOString(),
    };
  }

  if (timeRange === "7d") {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      gte: sevenDaysAgo,
      lte: now,
      label: "Last 7 Days",
      subLabel: `${formatIST(sevenDaysAgo, false)} – ${formatIST(now, true)}`,
      startIso: sevenDaysAgo.toISOString(),
      endIso: now.toISOString(),
    };
  }

  if (timeRange === "30d") {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      gte: thirtyDaysAgo,
      lte: now,
      label: "Last 30 Days",
      subLabel: `${formatIST(thirtyDaysAgo, false)} – ${formatIST(now, true)}`,
      startIso: thirtyDaysAgo.toISOString(),
      endIso: now.toISOString(),
    };
  }

  if (timeRange === "90d") {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return {
      gte: ninetyDaysAgo,
      lte: now,
      label: "Last 90 Days",
      subLabel: `${formatIST(ninetyDaysAgo, false)} – ${formatIST(now, true)}`,
      startIso: ninetyDaysAgo.toISOString(),
      endIso: now.toISOString(),
    };
  }

  if (timeRange === "custom" && customStart) {
    const start = new Date(`${customStart}T00:00:00+05:30`);
    const end = customEnd ? new Date(`${customEnd}T23:59:59.999+05:30`) : now;
    return {
      gte: start,
      lte: end,
      label: "Custom Range",
      subLabel: `${formatIST(start, false)} – ${formatIST(end, true)}`,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  return {
    label: "All Historical Data",
    subLabel: "Complete database records",
    startIso: null,
    endIso: null,
  };
}

/**
 * Core district command data aggregation engine.
 * STRICTLY DATABASE-BACKED. Zero mock data.
 */
export async function getDistrictAuthorityCommandData(
  options: DistrictCommandFilterOptions
): Promise<DistrictCommandCenterData> {
  const { districtId, timeRange = "30d", customStartDate, customEndDate, blockId, villageId } = options;

  let districtName = "District Authority Scope";
  if (districtId) {
    const districtRecord = await prisma.district.findUnique({
      where: { id: districtId },
      select: { name: true },
    });
    if (districtRecord?.name) {
      districtName = districtRecord.name;
    }
  }

  // 1. Fetch available Geographic Filter Hierarchy for the district
  const blocksInDistrict = await prisma.block.findMany({
    where: districtId ? { districtId } : {},
    select: {
      id: true,
      name: true,
      villages: {
        select: {
          id: true,
          name: true,
          blockId: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const filterBlocks = blocksInDistrict.map((b) => ({
    id: b.id,
    name: b.name,
    villageCount: b.villages.length,
  }));

  const filterVillages = blocksInDistrict.flatMap((b) =>
    b.villages.map((v) => ({
      id: v.id,
      name: v.name,
      blockId: v.blockId,
    }))
  );

  // 2. Build Geographic & Temporal Scopes
  const periodBounds = calculateDateRangeBounds(timeRange, customStartDate, customEndDate);
  const dateFilter = periodBounds.gte || periodBounds.lte ? { gte: periodBounds.gte, lte: periodBounds.lte } : {};

  // Geographic village filter tree
  const villageScopedWhere: Prisma.VillageWhereInput = {};
  if (villageId) {
    villageScopedWhere.id = villageId;
  } else if (blockId) {
    villageScopedWhere.blockId = blockId;
  } else if (districtId) {
    villageScopedWhere.block = { districtId };
  }

  // Farm base where
  const farmWhereClause: Prisma.FarmWhereInput = {
    village: villageScopedWhere,
  };

  // Animal base where
  const animalWhereClause: Prisma.AnimalWhereInput = {
    herd: {
      farm: {
        village: villageScopedWhere,
      },
    },
  };

  // User district where for personnel & farmers
  const userDistrictWhere: Prisma.UserWhereInput = {};
  if (villageId) {
    userDistrictWhere.villageId = villageId;
  } else if (blockId) {
    userDistrictWhere.blockId = blockId;
  } else if (districtId) {
    userDistrictWhere.districtId = districtId;
  }

  // Alert base where
  const alertWhereClause: Prisma.AlertWhereInput = {
    village: villageScopedWhere,
  };

  // Base Case Where (without date restriction, for current snapshot & personnel workload)
  const caseBaseWhere: Prisma.CaseWhereInput = {
    animal: {
      herd: {
        farm: {
          village: villageScopedWhere,
        },
      },
    },
  };

  // Period-Filtered Case Where (with date restriction)
  const periodCaseWhereClause: Prisma.CaseWhereInput = {
    ...caseBaseWhere,
    ...(dateFilter.gte || dateFilter.lte ? { reportedAt: dateFilter } : {}),
  };

  // Period-Filtered Assistance Request Where
  const periodAssistanceWhereClause: Prisma.AssistanceRequestWhereInput = {
    farm: {
      village: villageScopedWhere,
    },
    ...(dateFilter.gte || dateFilter.lte ? { requestedAt: dateFilter } : {}),
  };

  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  // 3. Parallel Database Aggregations
  const [
    farmersCount,
    farmsCount,
    animalsCount,
    allDistrictCases, // All active and cumulative cases for snapshot and personnel
    periodCases, // Period-filtered cases for charts, period metrics, and pipeline
    allAssistanceRequests,
    periodAssistanceRequests,
    allFieldVisits,
    periodFieldVisits,
    allPeriodVetReports,
    veterinariansList,
    fieldAgentsList,
    activeAlertsList,
    periodAlertsList,
    periodVaccinationsCount,
    periodTreatmentsCount,
    allFarmsWithRelations,
    allVillagesInScope,
    recentCases,
    recentVisits,
    recentVetReports,
  ] = await Promise.all([
    // Farmers count (Snapshot)
    prisma.user.count({
      where: {
        role: "FARMER",
        ...userDistrictWhere,
      },
    }),
    // Farms count (Snapshot)
    prisma.farm.count({ where: farmWhereClause }),
    // Animals count (Snapshot)
    prisma.animal.count({ where: animalWhereClause }),
    // All Cases in District scope (Snapshot & Personnel allocation)
    prisma.case.findMany({
      where: caseBaseWhere,
      include: {
        animal: {
          select: {
            id: true,
            tag: true,
            species: true,
            herd: {
              select: {
                farm: {
                  select: {
                    id: true,
                    name: true,
                    latitude: true,
                    longitude: true,
                    farmerUserId: true,
                    farmerUser: { select: { id: true, name: true, phone: true } },
                    village: {
                      select: {
                        id: true,
                        name: true,
                        block: { select: { id: true, name: true } },
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
        veterinaryReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            diagnosis: true,
            action: true,
            followUpDate: true,
            followUpCompleted: true,
            createdAt: true,
            vetUser: { select: { name: true } },
          },
        },
      },
      orderBy: { reportedAt: "desc" },
    }),
    // Period Cases (Filtered by time range)
    prisma.case.findMany({
      where: periodCaseWhereClause,
      include: {
        animal: {
          select: {
            id: true,
            tag: true,
            species: true,
            herd: {
              select: {
                farm: {
                  select: {
                    id: true,
                    name: true,
                    latitude: true,
                    longitude: true,
                    farmerUserId: true,
                    farmerUser: { select: { id: true, name: true, phone: true } },
                    village: {
                      select: {
                        id: true,
                        name: true,
                        block: { select: { id: true, name: true } },
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
        veterinaryReports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            diagnosis: true,
            action: true,
            followUpDate: true,
            followUpCompleted: true,
            createdAt: true,
            vetUser: { select: { name: true } },
          },
        },
      },
      orderBy: { reportedAt: "desc" },
    }),
    // All Assistance Requests (Snapshot)
    prisma.assistanceRequest.findMany({
      where: {
        farm: {
          village: villageScopedWhere,
        },
      },
      select: {
        id: true,
        status: true,
        farmerUserId: true,
        animalId: true,
        assignedFieldAgentUserId: true,
        requestedAt: true,
      },
    }),
    // Period Assistance Requests
    prisma.assistanceRequest.findMany({
      where: periodAssistanceWhereClause,
      include: {
        farmerUser: { select: { id: true, name: true, phone: true } },
        assignedFieldAgentUser: { select: { id: true, name: true, phone: true } },
        farm: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            village: { select: { id: true, name: true, block: { select: { id: true, name: true } } } },
          },
        },
        animal: { select: { id: true, tag: true, species: true } },
        case: { select: { id: true, caseNumber: true, status: true, gpsLat: true, gpsLng: true } },
        visit: {
          select: {
            id: true,
            startedAt: true,
            completedAt: true,
            observations: true,
            measurements: true,
            fieldAgentUser: { select: { name: true } },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    }),
    // All Field Visits (Snapshot)
    prisma.fieldVisit.findMany({
      where: {
        assistanceRequest: {
          farm: {
            village: villageScopedWhere,
          },
        },
      },
      include: {
        assistanceRequest: {
          include: {
            farmerUser: { select: { name: true, phone: true } },
            farm: {
              select: {
                name: true,
                latitude: true,
                longitude: true,
                village: { select: { name: true, block: { select: { name: true } } } },
              },
            },
          },
        },
        fieldAgentUser: { select: { id: true, name: true, phone: true } },
        case: { select: { caseNumber: true, gpsLat: true, gpsLng: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Period Field Visits
    prisma.fieldVisit.findMany({
      where: {
        assistanceRequest: {
          farm: {
            village: villageScopedWhere,
          },
        },
        ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
      },
      select: { id: true, completedAt: true, createdAt: true },
    }),
    // Period Veterinary Reports
    prisma.veterinaryReport.findMany({
      where: {
        case: {
          animal: {
            herd: {
              farm: {
                village: villageScopedWhere,
              },
            },
          },
        },
        ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
      },
      select: { id: true, createdAt: true, action: true, diagnosis: true },
    }),
    // Veterinarians in scope
    prisma.user.findMany({
      where: {
        role: "VETERINARIAN",
        ...userDistrictWhere,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        district: { select: { name: true } },
        block: { select: { name: true } },
        village: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    // Field Agents in scope
    prisma.user.findMany({
      where: {
        role: "FIELD_AGENT",
        ...userDistrictWhere,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        district: { select: { name: true } },
        block: { select: { name: true } },
        village: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    // Active Outbreak Alerts (Snapshot)
    prisma.alert.findMany({
      where: {
        active: true,
        ...alertWhereClause,
      },
      include: {
        village: {
          include: {
            block: true,
            farms: { select: { latitude: true, longitude: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Period Alerts Created
    prisma.alert.findMany({
      where: {
        ...alertWhereClause,
        ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
      },
      include: {
        village: {
          include: {
            block: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Period Vaccinations
    prisma.vaccinationRecord.count({
      where: {
        animal: {
          herd: {
            farm: {
              village: villageScopedWhere,
            },
          },
        },
        ...(dateFilter.gte || dateFilter.lte ? { dateGiven: dateFilter } : {}),
      },
    }),
    // Period Treatments
    prisma.treatmentRecord.count({
      where: {
        animal: {
          herd: {
            farm: {
              village: villageScopedWhere,
            },
          },
        },
        ...(dateFilter.gte || dateFilter.lte ? { dateGiven: dateFilter } : {}),
      },
    }),
    // Farms with relations
    prisma.farm.findMany({
      where: farmWhereClause,
      include: {
        farmerUser: { select: { name: true } },
        village: { select: { name: true, block: { select: { name: true } } } },
        herds: {
          include: {
            animals: {
              select: {
                id: true,
                cases: {
                  where: {
                    status: { in: ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"] },
                  },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    }),
    // Villages in scope
    prisma.village.findMany({
      where: villageScopedWhere,
      include: {
        block: true,
        alerts: { where: { active: true } },
        farms: {
          include: {
            farmerUser: { select: { id: true } },
            herds: {
              include: {
                animals: {
                  include: {
                    cases: {
                      select: {
                        id: true,
                        status: true,
                        analysisResult: true,
                      },
                    },
                    vaccinations: {
                      where: {
                        dateGiven: { gte: twelveMonthsAgo },
                      },
                      select: { id: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    // Recent Cases
    prisma.case.findMany({
      where: periodCaseWhereClause,
      select: {
        id: true,
        caseNumber: true,
        status: true,
        reportedAt: true,
        analysisResult: true,
        animal: {
          select: {
            tag: true,
            species: true,
            herd: {
              select: {
                farm: {
                  select: {
                    name: true,
                    village: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { reportedAt: "desc" },
      take: 6,
    }),
    // Recent Visits
    prisma.fieldVisit.findMany({
      where: {
        assistanceRequest: {
          farm: {
            village: villageScopedWhere,
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        observations: true,
        fieldAgentUser: { select: { name: true } },
        assistanceRequest: {
          select: {
            farm: { select: { name: true, village: { select: { name: true } } } },
            farmerUser: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // Recent Vet Reports
    prisma.veterinaryReport.findMany({
      where: {
        case: {
          animal: {
            herd: {
              farm: {
                village: villageScopedWhere,
              },
            },
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        diagnosis: true,
        action: true,
        vetUser: { select: { name: true } },
        case: {
          select: {
            caseNumber: true,
            animal: {
              select: {
                tag: true,
                species: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  // 4. Compute Current District Status (Snapshot)
  let currentPendingReviews = 0;
  let currentUnderExam = 0;
  let currentLabReferrals = 0;
  let currentConfirmedCases = 0;
  let currentClosedHarmless = 0;
  let currentFollowUpsDue = 0;

  const nowTime = Date.now();

  for (const c of allDistrictCases) {
    if (c.status === "PENDING_REVIEW") currentPendingReviews++;
    else if (c.status === "UNDER_EXAMINATION") currentUnderExam++;
    else if (c.status === "LAB_REFERRAL") currentLabReferrals++;
    else if (c.status === "CONFIRMED") currentConfirmedCases++;
    else if (c.status === "CLOSED_HARMLESS") currentClosedHarmless++;

    const isDue =
      (c.vetFollowUpDate && !c.followUpCompleted && new Date(c.vetFollowUpDate).getTime() <= nowTime) ||
      (c.veterinaryReports[0]?.followUpDate &&
        !c.veterinaryReports[0]?.followUpCompleted &&
        new Date(c.veterinaryReports[0].followUpDate).getTime() <= nowTime);
    if (isDue) {
      currentFollowUpsDue++;
    }
  }

  const currentActiveCases = currentPendingReviews + currentUnderExam + currentLabReferrals;

  let currentActiveRequests = 0;
  for (const r of allAssistanceRequests) {
    if (["REQUESTED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(r.status)) {
      currentActiveRequests++;
    }
  }

  let currentActiveVisits = 0;
  for (const v of allFieldVisits) {
    if (!v.completedAt) {
      currentActiveVisits++;
    }
  }

  const snapshot: DistrictSnapshotMetrics = {
    totalFarmers: farmersCount,
    totalFarms: farmsCount,
    totalAnimals: animalsCount,
    currentActiveCases,
    currentPendingReviews,
    currentUnderExam,
    currentLabReferrals,
    currentConfirmedCases,
    currentClosedHarmless,
    currentActiveVisits,
    currentActiveRequests,
    totalVeterinarians: veterinariansList.length,
    totalFieldAgents: fieldAgentsList.length,
    currentActiveAlerts: activeAlertsList.length,
    currentFollowUpsDue,
  };

  // 5. Compute Selected Period Metrics (Time-Filtered)
  let periodPendingReviews = 0;
  let periodUnderExam = 0;
  let periodLabReferrals = 0;
  let periodConfirmed = 0;
  let periodClosedHarmless = 0;
  let periodReviewedCount = 0;
  let totalReviewMs = 0;
  let totalConfirmationMs = 0;
  let confirmedCasesWithTime = 0;

  for (const c of periodCases) {
    if (c.status === "PENDING_REVIEW") periodPendingReviews++;
    else if (c.status === "UNDER_EXAMINATION") periodUnderExam++;
    else if (c.status === "LAB_REFERRAL") periodLabReferrals++;
    else if (c.status === "CONFIRMED") periodConfirmed++;
    else if (c.status === "CLOSED_HARMLESS") periodClosedHarmless++;

    if (c.reviewedAt) {
      const ms = new Date(c.reviewedAt).getTime() - new Date(c.reportedAt).getTime();
      if (ms >= 0) {
        totalReviewMs += ms;
        periodReviewedCount++;
      }
    }
    if (c.confirmedAt) {
      const ms = new Date(c.confirmedAt).getTime() - new Date(c.reportedAt).getTime();
      if (ms >= 0) {
        totalConfirmationMs += ms;
        confirmedCasesWithTime++;
      }
    }
  }

  const avgTimeToReviewHours =
    periodReviewedCount > 0 ? Math.round((totalReviewMs / (periodReviewedCount * 3600000)) * 10) / 10 : null;

  const avgTimeToConfirmationHours =
    confirmedCasesWithTime > 0
      ? Math.round((totalConfirmationMs / (confirmedCasesWithTime * 3600000)) * 10) / 10
      : null;

  const periodMetrics: SelectedPeriodMetrics = {
    periodLabel: periodBounds.label,
    periodSubLabel: periodBounds.subLabel,
    timeRange: timeRange as "today" | "7d" | "30d" | "90d" | "custom" | "all",
    startDate: periodBounds.startIso,
    endDate: periodBounds.endIso,
    casesReported: periodCases.length,
    assistanceRequests: periodAssistanceRequests.length,
    fieldVisits: periodFieldVisits.length,
    veterinaryReports: allPeriodVetReports.length,
    alertsCreated: periodAlertsList.length,
    vaccinationsRecorded: periodVaccinationsCount,
    treatmentsRecorded: periodTreatmentsCount,
    casesConfirmed: periodConfirmed,
    casesReviewed: periodReviewedCount,
    avgTimeToReviewHours,
    avgTimeToConfirmationHours,
  };

  // KPI summary metrics for backward compatibility
  const kpis: KpiSummaryMetrics = {
    totalFarmers: farmersCount,
    totalFarms: farmsCount,
    totalAnimals: animalsCount,
    activeCases: timeRange === "all" ? currentActiveCases : (periodPendingReviews + periodUnderExam + periodLabReferrals),
    pendingReviews: timeRange === "all" ? currentPendingReviews : periodPendingReviews,
    underExamination: timeRange === "all" ? currentUnderExam : periodUnderExam,
    labReferrals: timeRange === "all" ? currentLabReferrals : periodLabReferrals,
    confirmedCases: timeRange === "all" ? currentConfirmedCases : periodConfirmed,
    closedHarmlessCases: timeRange === "all" ? currentClosedHarmless : periodClosedHarmless,
    activeAssistanceRequests: currentActiveRequests,
    activeFieldVisits: currentActiveVisits,
    totalVeterinarians: veterinariansList.length,
    totalFieldAgents: fieldAgentsList.length,
    activeAlerts: activeAlertsList.length,
    followUpsDue: currentFollowUpsDue,
    avgTimeToReviewHours,
    avgTimeToConfirmationHours,
  };

  // 6. Compute District Case Pipeline from Period Cases
  const pipelineCases = timeRange === "all" ? allDistrictCases : periodCases;
  const pipelineTotal = pipelineCases.length;

  const pPending = pipelineCases.filter((c) => c.status === "PENDING_REVIEW").length;
  const pUnderExam = pipelineCases.filter((c) => c.status === "UNDER_EXAMINATION").length;
  const pLabRef = pipelineCases.filter((c) => c.status === "LAB_REFERRAL").length;
  const pConfirmed = pipelineCases.filter((c) => c.status === "CONFIRMED").length;
  const pClosed = pipelineCases.filter((c) => c.status === "CLOSED_HARMLESS").length;

  const pipeline: DistrictPipelineStage[] = [
    {
      status: "PENDING_REVIEW",
      label: "Pending Review",
      count: pPending,
      percentage: pipelineTotal > 0 ? Math.round((pPending / pipelineTotal) * 100) : 0,
      color: "#F59E0B",
    },
    {
      status: "UNDER_EXAMINATION",
      label: "Under Examination",
      count: pUnderExam,
      percentage: pipelineTotal > 0 ? Math.round((pUnderExam / pipelineTotal) * 100) : 0,
      color: "#EA580C",
    },
    {
      status: "LAB_REFERRAL",
      label: "Lab Referral",
      count: pLabRef,
      percentage: pipelineTotal > 0 ? Math.round((pLabRef / pipelineTotal) * 100) : 0,
      color: "#8B5CF6",
    },
    {
      status: "CONFIRMED",
      label: "Confirmed Case",
      count: pConfirmed,
      percentage: pipelineTotal > 0 ? Math.round((pConfirmed / pipelineTotal) * 100) : 0,
      color: "#DC2626",
    },
    {
      status: "CLOSED_HARMLESS",
      label: "Closed / Harmless",
      count: pClosed,
      percentage: pipelineTotal > 0 ? Math.round((pClosed / pipelineTotal) * 100) : 0,
      color: "#059669",
    },
  ];

  // 7. Compute Personnel & Coverage Overview (Veterinarians & Field Agents)
  const veterinarians: VetCoverageItem[] = veterinariansList.map((vet) => {
    const assignedCases = allDistrictCases.filter((c) => c.assignedVeterinarianUserId === vet.id);
    const activeAssignedCases = assignedCases.filter((c) =>
      ["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"].includes(c.status)
    );

    const pending = assignedCases.filter((c) => c.status === "PENDING_REVIEW").length;
    const underExam = assignedCases.filter((c) => c.status === "UNDER_EXAMINATION").length;
    const labRef = assignedCases.filter((c) => c.status === "LAB_REFERRAL").length;

    let followUps = 0;
    for (const c of assignedCases) {
      if (
        (c.vetFollowUpDate && !c.followUpCompleted) ||
        (c.veterinaryReports[0]?.followUpDate && !c.veterinaryReports[0]?.followUpCompleted)
      ) {
        followUps++;
      }
    }

    const farmerIdSet = new Set<string>();
    const animalIdSet = new Set<string>();

    activeAssignedCases.forEach((c) => {
      if (c.animal?.herd?.farm?.farmerUserId) {
        farmerIdSet.add(c.animal.herd.farm.farmerUserId);
      }
      if (c.animalId) {
        animalIdSet.add(c.animalId);
      }
    });

    const workloadScore = activeAssignedCases.length * 2 + pending;

    const serviceArea = vet.village?.name
      ? `${vet.village.name} (${vet.block?.name || "Block"})`
      : vet.block?.name
      ? `${vet.block.name} Block`
      : vet.district?.name
      ? `${vet.district.name} District`
      : "District-wide Jurisdiction";

    const assignedCasesList = assignedCases.map((c) => {
      const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
      const riskLevel = (analysis.overall_risk_level as string) || "UNKNOWN";
      return {
        id: c.id,
        caseNumber: c.caseNumber,
        status: c.status,
        riskLevel,
        species: c.animal.species,
        animalTag: c.animal.tag,
        farmerName: c.animal.herd.farm.farmerUser?.name || "Farmer",
        farmName: c.animal.herd.farm.name,
        villageName: c.animal.herd.farm.village.name,
        blockName: c.animal.herd.farm.village.block.name,
        reportedAt: c.reportedAt.toISOString(),
        diagnosis: c.vetDiagnosis || c.veterinaryReports[0]?.diagnosis || null,
        followUpDate: c.vetFollowUpDate?.toISOString() || c.veterinaryReports[0]?.followUpDate?.toISOString() || null,
        followUpCompleted: c.followUpCompleted || c.veterinaryReports[0]?.followUpCompleted || false,
      };
    });

    return {
      id: vet.id,
      name: vet.name,
      phone: vet.phone,
      serviceArea,
      assignedCases: assignedCases.length,
      activeCases: activeAssignedCases.length,
      pendingReviews: pending,
      underExam,
      labReferrals: labRef,
      followUps,
      farmersUnderCare: farmerIdSet.size,
      animalsUnderCare: animalIdSet.size,
      workloadScore,
      assignedCasesList,
    };
  });

  const fieldAgents: FieldAgentCoverageItem[] = fieldAgentsList.map((agent) => {
    const assignedRequests = allAssistanceRequests.filter((r) => r.assignedFieldAgentUserId === agent.id);
    const agentVisits = allFieldVisits.filter((v) => v.fieldAgentUserId === agent.id);

    const pending = assignedRequests.filter((r) => ["REQUESTED", "ASSIGNED"].includes(r.status)).length;
    const accepted = assignedRequests.filter((r) => ["ACCEPTED", "IN_PROGRESS"].includes(r.status)).length;
    const openRequests = assignedRequests.filter((r) =>
      ["REQUESTED", "ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(r.status)
    ).length;
    const scheduled = periodAssistanceRequests.filter(
      (r) => r.assignedFieldAgentUserId === agent.id && !!r.scheduledAt && r.status !== "COMPLETED"
    ).length;
    const completed = agentVisits.filter((v) => !!v.completedAt).length;

    const farmerIdSet = new Set<string>();
    const animalIdSet = new Set<string>();

    assignedRequests.forEach((r) => {
      if (r.farmerUserId) farmerIdSet.add(r.farmerUserId);
      if (r.animalId) animalIdSet.add(r.animalId);
    });
    agentVisits.forEach((v) => {
      if (v.assistanceRequest?.farmerUserId) farmerIdSet.add(v.assistanceRequest.farmerUserId);
      if (v.assistanceRequest?.animalId) animalIdSet.add(v.assistanceRequest.animalId);
    });

    const workloadScore = openRequests * 2 + pending;

    const serviceArea = agent.village?.name
      ? `${agent.village.name} (${agent.block?.name || "Block"})`
      : agent.block?.name
      ? `${agent.block.name} Block`
      : agent.district?.name
      ? `${agent.district.name} District`
      : "District-wide Jurisdiction";

    const activeRequestsList = periodAssistanceRequests
      .filter((r) => r.assignedFieldAgentUserId === agent.id)
      .map((r) => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        requestedAt: r.requestedAt.toISOString(),
        scheduledAt: r.scheduledAt ? r.scheduledAt.toISOString() : null,
        farmerName: r.farmerUser?.name || "Farmer",
        farmName: r.farm.name,
        villageName: r.farm.village?.name || "Village",
        blockName: r.farm.village?.block?.name || "Block",
        animalTag: r.animal?.tag || null,
        species: r.animal?.species || null,
        caseNumber: r.case?.caseNumber || null,
        visitObservations: r.visit?.observations || null,
        visitCompletedAt: r.visit?.completedAt ? r.visit.completedAt.toISOString() : null,
      }));

    return {
      id: agent.id,
      name: agent.name,
      phone: agent.phone,
      serviceArea,
      pendingRequests: pending,
      acceptedRequests: accepted,
      scheduledVisits: scheduled,
      completedVisits: completed,
      farmersAssisted: farmerIdSet.size,
      animalsVisited: animalIdSet.size,
      openRequests,
      workloadScore,
      activeRequestsList,
    };
  });

  // 8. Compute 9 Real-Data Charts (Filtered to Selected Period)
  const chartCases = timeRange === "all" ? allDistrictCases : periodCases;

  const casesByStatus: ChartDataPoint[] = pipeline.map((p) => ({
    label: p.label,
    value: p.count,
    color: p.color,
  }));

  const riskCounts: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    ELEVATED: 0,
    MEDIUM: 0,
    LOW: 0,
    UNKNOWN: 0,
  };
  for (const c of chartCases) {
    const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
    const risk = ((analysis.overall_risk_level as string) || "UNKNOWN").toUpperCase();
    if (risk in riskCounts) {
      riskCounts[risk]++;
    } else {
      riskCounts.UNKNOWN++;
    }
  }
  const casesByRisk: ChartDataPoint[] = [
    { label: "Critical", value: riskCounts.CRITICAL, color: "#DC2626" },
    { label: "High", value: riskCounts.HIGH, color: "#EA580C" },
    { label: "Elevated", value: riskCounts.ELEVATED, color: "#F59E0B" },
    { label: "Medium", value: riskCounts.MEDIUM, color: "#3B82F6" },
    { label: "Low", value: riskCounts.LOW, color: "#10B981" },
    { label: "Unclassified", value: riskCounts.UNKNOWN, color: "#9CA3AF" },
  ];

  // Temporal Trend Chart (Mapped strictly in Indian Standard Time)
  const getISTDateKey = (d: Date | string) => {
    const dateObj = typeof d === "string" ? new Date(d) : d;
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dateObj); // "YYYY-MM-DD"
  };

  const temporalMap = new Map<string, number>();
  chartCases.forEach((c) => {
    const dStr = getISTDateKey(c.reportedAt);
    temporalMap.set(dStr, (temporalMap.get(dStr) || 0) + 1);
  });

  let casesOverTime: ChartDataPoint[] = [];

  if (timeRange === "today") {
    // If today is selected, display today's data point
    const todayKey = getISTDateKey(new Date());
    const countToday = chartCases.length;
    if (countToday > 0) {
      casesOverTime = [
        {
          label: formatDate(todayKey, false),
          value: countToday,
          meta: todayKey,
        },
      ];
    }
  } else if (timeRange === "7d") {
    // Generate daily points for the last 7 days
    const points: ChartDataPoint[] = [];
    const nowTime = Date.now();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowTime - i * 24 * 60 * 60 * 1000);
      const dStr = getISTDateKey(d);
      points.push({
        label: formatDate(dStr, false),
        value: temporalMap.get(dStr) || 0,
        meta: dStr,
      });
    }
    const hasAny7d = points.some((p) => p.value > 0);
    casesOverTime = hasAny7d ? points : [];
  } else if (timeRange === "30d") {
    // Generate daily points for the last 30 days
    const points: ChartDataPoint[] = [];
    const nowTime = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(nowTime - i * 24 * 60 * 60 * 1000);
      const dStr = getISTDateKey(d);
      points.push({
        label: formatDate(dStr, false),
        value: temporalMap.get(dStr) || 0,
        meta: dStr,
      });
    }
    const hasAny30d = points.some((p) => p.value > 0);
    casesOverTime = hasAny30d ? points : [];
  } else {
    const sortedDates = Array.from(temporalMap.keys()).sort();
    casesOverTime = sortedDates.map((dateKey) => ({
      label: formatDate(dateKey, false),
      value: temporalMap.get(dateKey) || 0,
      meta: dateKey,
    }));
  }

  const villageCaseCountMap = new Map<string, number>();
  chartCases.forEach((c) => {
    const vName = c.animal?.herd?.farm?.village?.name || "Other";
    villageCaseCountMap.set(vName, (villageCaseCountMap.get(vName) || 0) + 1);
  });
  const casesByVillage: ChartDataPoint[] = Array.from(villageCaseCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([vName, cnt]) => ({
      label: vName,
      value: cnt,
      color: "#059669",
    }));

  const vetWorkload: ChartDataPoint[] = veterinarians.map((v) => ({
    label: v.name,
    value: v.activeCases,
    secondaryValue: v.assignedCases,
    color: "#8B5CF6",
  }));

  const agentWorkload: ChartDataPoint[] = fieldAgents.map((a) => ({
    label: a.name,
    value: a.openRequests,
    secondaryValue: a.completedVisits,
    color: "#3B82F6",
  }));

  const speciesCountMap: Record<string, number> = {};
  chartCases.forEach((c) => {
    const sp = c.animal?.species || "OTHER";
    speciesCountMap[sp] = (speciesCountMap[sp] || 0) + 1;
  });
  const speciesDistribution: ChartDataPoint[] = Object.entries(speciesCountMap).map(([sp, count]) => ({
    label: sp.charAt(0) + sp.slice(1).toLowerCase(),
    value: count,
    color: sp === "COW" ? "#059669" : sp === "BUFFALO" ? "#D97706" : sp === "GOAT" ? "#2563EB" : "#78716C",
  }));

  const alertTypeMap = new Map<string, number>();
  const chartAlerts = timeRange === "all" ? activeAlertsList : periodAlertsList;
  chartAlerts.forEach((a) => {
    const key = a.diseaseName || "General Cluster Alert";
    alertTypeMap.set(key, (alertTypeMap.get(key) || 0) + 1);
  });
  const alertsBySeverity: ChartDataPoint[] = Array.from(alertTypeMap.entries()).map(([disease, count]) => ({
    label: disease,
    value: count,
    color: "#DC2626",
  }));

  const requestStatusCounts: Record<string, number> = {
    REQUESTED: 0,
    ASSIGNED: 0,
    ACCEPTED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };
  periodAssistanceRequests.forEach((r) => {
    if (r.status in requestStatusCounts) {
      requestStatusCounts[r.status]++;
    }
  });
  const assistanceRequestStatus: ChartDataPoint[] = [
    { label: "Requested", value: requestStatusCounts.REQUESTED, color: "#F59E0B" },
    { label: "Assigned", value: requestStatusCounts.ASSIGNED, color: "#3B82F6" },
    { label: "Accepted", value: requestStatusCounts.ACCEPTED, color: "#6366F1" },
    { label: "In Progress", value: requestStatusCounts.IN_PROGRESS, color: "#8B5CF6" },
    { label: "Completed", value: requestStatusCounts.COMPLETED, color: "#10B981" },
    { label: "Cancelled", value: requestStatusCounts.CANCELLED, color: "#6B7280" },
  ];

  // 9. Compute Village Analysis Table Rows
  const villageAnalysis: VillageAnalysisRow[] = allVillagesInScope.map((v) => {
    const farmCount = v.farms.length;
    let animalCount = 0;
    let vaccinatedAnimalsCount = 0;
    let totalCases = 0;
    let activeCases = 0;
    let maxRiskRank = 0;
    let highestRisk = "NONE";
    const farmerIdSet = new Set<string>();

    v.farms.forEach((f) => {
      if (f.farmerUser?.id) farmerIdSet.add(f.farmerUser.id);
      f.herds.forEach((h) => {
        animalCount += h.animals.length;
        h.animals.forEach((a) => {
          if (a.vaccinations && a.vaccinations.length > 0) {
            vaccinatedAnimalsCount++;
          }
          totalCases += a.cases.length;
          a.cases.forEach((c) => {
            if (["PENDING_REVIEW", "UNDER_EXAMINATION", "LAB_REFERRAL"].includes(c.status)) {
              activeCases++;
            }
            const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
            const rLvl = (analysis.overall_risk_level as string) || null;
            const rank = getRiskRank(rLvl);
            if (rank > maxRiskRank) {
              maxRiskRank = rank;
              highestRisk = rLvl || "UNKNOWN";
            }
          });
        });
      });
    });

    const finalHighestRisk = highestRisk === "NONE" && activeCases > 0 ? "LOW" : highestRisk;
    const vaccinationCoveragePercent =
      animalCount > 0 ? Math.round((vaccinatedAnimalsCount / animalCount) * 100) : 0;

    const isHighOrCriticalRisk = HIGH_PRIORITY_RISK_LEVELS.includes(
      finalHighestRisk as (typeof HIGH_PRIORITY_RISK_LEVELS)[number]
    );
    const priorityFlag =
      vaccinationCoveragePercent < VACCINATION_GAP_THRESHOLD_PERCENT && isHighOrCriticalRisk;

    // gapPriorityScore: worst coverage + worst risk sorts first
    const riskRank = getRiskRank(finalHighestRisk);
    const coverageGap = 100 - vaccinationCoveragePercent;
    const gapPriorityScore = riskRank * 100 + coverageGap;

    return {
      villageId: v.id,
      villageName: v.name,
      blockName: v.block.name,
      farmersCount: farmerIdSet.size,
      farmsCount: farmCount,
      animalsCount: animalCount,
      totalCases,
      activeCases,
      activeAlerts: v.alerts.length,
      highestRisk: finalHighestRisk,
      vaccinationCoveragePercent,
      priorityFlag,
      gapPriorityScore,
      vaccinatedAnimalsCount,
    };
  });

  // 10. Compute 7 Real Map Layers with Strict Authoritative Coordinate Hierarchy
  const mapCases: DistrictMapLayersData["cases"] = [];
  const heatmapPoints: DistrictMapLayersData["heatmapPoints"] = [];

  for (const c of chartCases) {
    let lat: number | null = null;
    let lng: number | null = null;

    if (isValidCoordinate(c.gpsLat, c.gpsLng)) {
      lat = c.gpsLat as number;
      lng = c.gpsLng as number;
    } else if (isValidCoordinate(c.animal?.herd?.farm?.latitude, c.animal?.herd?.farm?.longitude)) {
      lat = c.animal.herd.farm.latitude;
      lng = c.animal.herd.farm.longitude;
    }

    if (lat !== null && lng !== null) {
      const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
      const riskLevel = (analysis.overall_risk_level as string) || "UNKNOWN";
      const hasVillageAlert = activeAlertsList.some(
        (a) => a.villageId === c.animal.herd.farm.village.id
      );
      const weight = calculateRiskIntensity(riskLevel, hasVillageAlert);

      mapCases.push({
        id: c.id,
        caseNumber: c.caseNumber,
        status: c.status,
        riskLevel,
        species: c.animal.species,
        animalTag: c.animal.tag,
        farmName: c.animal.herd.farm.name,
        villageName: c.animal.herd.farm.village.name,
        blockName: c.animal.herd.farm.village.block.name,
        farmerName: c.animal.herd.farm.farmerUser?.name || "Farmer",
        reportedAt: c.reportedAt.toISOString(),
        diagnosis: c.vetDiagnosis || c.veterinaryReports[0]?.diagnosis || null,
        lat,
        lng,
      });

      heatmapPoints.push({
        lat,
        lng,
        weight,
        caseCount: 1,
        riskLevel,
        locationName: `${c.animal.herd.farm.village.name} (${c.animal.herd.farm.name})`,
      });
    }
  }

  const mapFarms: DistrictMapLayersData["farms"] = [];
  for (const f of allFarmsWithRelations) {
    if (isValidCoordinate(f.latitude, f.longitude)) {
      let animalCount = 0;
      let activeCaseCount = 0;
      f.herds.forEach((h) => {
        animalCount += h.animals.length;
        h.animals.forEach((a) => {
          activeCaseCount += a.cases.length;
        });
      });

      mapFarms.push({
        id: f.id,
        name: f.name,
        villageName: f.village.name,
        blockName: f.village.block.name,
        farmerName: f.farmerUser?.name || "Farmer",
        lat: f.latitude,
        lng: f.longitude,
        animalCount,
        activeCaseCount,
      });
    }
  }

  const mapVets: DistrictMapLayersData["veterinarians"] = [];
  for (const vet of veterinarians) {
    const activeCaseWithCoord = mapCases.find((c) =>
      allDistrictCases.some((dc) => dc.id === c.id && dc.assignedVeterinarianUserId === vet.id)
    );
    if (activeCaseWithCoord) {
      mapVets.push({
        id: vet.id,
        name: vet.name,
        phone: vet.phone,
        serviceArea: vet.serviceArea,
        activeCasesCount: vet.activeCases,
        pendingReviewsCount: vet.pendingReviews,
        lat: activeCaseWithCoord.lat,
        lng: activeCaseWithCoord.lng,
      });
    }
  }

  const mapAgents: DistrictMapLayersData["fieldAgents"] = [];
  for (const agent of fieldAgents) {
    const activeVisitWithCoord = allFieldVisits.find((v) => {
      if (v.fieldAgentUserId !== agent.id) return false;
      const m = v.measurements as Record<string, unknown> | null;
      if (m && isValidCoordinate(m.latitude, m.longitude)) return true;
      if (m && isValidCoordinate(m.gpsLat, m.gpsLng)) return true;
      if (isValidCoordinate(v.case?.gpsLat, v.case?.gpsLng)) return true;
      if (isValidCoordinate(v.assistanceRequest?.farm?.latitude, v.assistanceRequest?.farm?.longitude)) return true;
      return false;
    });

    if (activeVisitWithCoord) {
      const m = activeVisitWithCoord.measurements as Record<string, unknown> | null;
      let lat = 0;
      let lng = 0;
      if (m && isValidCoordinate(m.latitude, m.longitude)) {
        lat = m.latitude as number;
        lng = m.longitude as number;
      } else if (m && isValidCoordinate(m.gpsLat, m.gpsLng)) {
        lat = m.gpsLat as number;
        lng = m.gpsLng as number;
      } else if (isValidCoordinate(activeVisitWithCoord.case?.gpsLat, activeVisitWithCoord.case?.gpsLng)) {
        lat = activeVisitWithCoord.case!.gpsLat as number;
        lng = activeVisitWithCoord.case!.gpsLng as number;
      } else {
        lat = activeVisitWithCoord.assistanceRequest.farm.latitude;
        lng = activeVisitWithCoord.assistanceRequest.farm.longitude;
      }

      mapAgents.push({
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        serviceArea: agent.serviceArea,
        openRequestsCount: agent.openRequests,
        completedVisitsCount: agent.completedVisits,
        lat,
        lng,
      });
    }
  }

  const mapVisits: DistrictMapLayersData["fieldVisits"] = [];
  for (const v of allFieldVisits) {
    let lat: number | null = null;
    let lng: number | null = null;

    const m = v.measurements as Record<string, unknown> | null;
    if (m && isValidCoordinate(m.latitude, m.longitude)) {
      lat = m.latitude as number;
      lng = m.longitude as number;
    } else if (m && isValidCoordinate(m.gpsLat, m.gpsLng)) {
      lat = m.gpsLat as number;
      lng = m.gpsLng as number;
    } else if (isValidCoordinate(v.case?.gpsLat, v.case?.gpsLng)) {
      lat = v.case!.gpsLat as number;
      lng = v.case!.gpsLng as number;
    } else if (isValidCoordinate(v.assistanceRequest?.farm?.latitude, v.assistanceRequest?.farm?.longitude)) {
      lat = v.assistanceRequest.farm.latitude;
      lng = v.assistanceRequest.farm.longitude;
    }

    if (lat !== null && lng !== null) {
      mapVisits.push({
        id: v.id,
        visitDate: (v.completedAt || v.startedAt || v.createdAt).toISOString(),
        agentName: v.fieldAgentUser?.name || "Field Agent",
        farmName: v.assistanceRequest?.farm?.name || "Farm",
        villageName: v.assistanceRequest?.farm?.village?.name || "Village",
        status: v.completedAt ? "Completed" : v.startedAt ? "In Progress" : "Accepted",
        observations: v.observations || null,
        lat,
        lng,
      });
    }
  }

  const mapAlerts: DistrictMapLayersData["alerts"] = [];
  for (const a of activeAlertsList) {
    const sampleFarm = a.village?.farms[0];
    if (sampleFarm && isValidCoordinate(sampleFarm.latitude, sampleFarm.longitude)) {
      mapAlerts.push({
        id: a.id,
        diseaseName: a.diseaseName || "Cluster Outbreak",
        caseCount: a.caseCount,
        villageName: a.village.name,
        blockName: a.village.block.name,
        windowStart: a.windowStart.toISOString(),
        windowEnd: a.windowEnd.toISOString(),
        active: a.active,
        lat: sampleFarm.latitude,
        lng: sampleFarm.longitude,
      });
    }
  }

  const mapLayers: DistrictMapLayersData = {
    heatmapPoints,
    farms: mapFarms,
    cases: mapCases,
    veterinarians: mapVets,
    fieldAgents: mapAgents,
    fieldVisits: mapVisits,
    alerts: mapAlerts,
  };

  // 11. Compute Recent Activity Stream
  const recentActivity: RecentActivityItem[] = [];

  recentCases.forEach((c) => {
    const analysis = (c.analysisResult as Record<string, unknown> | null) || {};
    const risk = (analysis.overall_risk_level as string) || "UNKNOWN";
    recentActivity.push({
      id: `case-${c.id}`,
      type: "CASE",
      title: `Case #${c.caseNumber} • ${c.animal.species} (${c.animal.tag})`,
      subtitle: `${c.animal.herd.farm.name}, ${c.animal.herd.farm.village.name} • Status: ${c.status}`,
      timestamp: c.reportedAt.toISOString(),
      statusBadge: risk,
      statusVariant: risk === "CRITICAL" ? "destructive" : "default",
      linkUrl: `/authority/cases?caseId=${c.id}`,
    });
  });

  recentVisits.forEach((v) => {
    recentActivity.push({
      id: `visit-${v.id}`,
      type: "VISIT",
      title: `Field Visit by ${v.fieldAgentUser?.name || "Agent"}`,
      subtitle: `${v.assistanceRequest?.farm.name || "Farm"} (${v.assistanceRequest?.farm.village?.name || "Village"})`,
      timestamp: v.createdAt.toISOString(),
      statusBadge: v.observations ? "Report Filed" : "In Progress",
      statusVariant: "secondary",
    });
  });

  recentVetReports.forEach((r) => {
    recentActivity.push({
      id: `report-${r.id}`,
      type: "REPORT",
      title: `Vet Diagnosis: ${r.diagnosis}`,
      subtitle: `Dr. ${r.vetUser.name} • Case #${r.case.caseNumber} • Action: ${r.action}`,
      timestamp: r.createdAt.toISOString(),
      statusBadge: r.action,
      statusVariant: "outline",
    });
  });

  activeAlertsList.slice(0, 4).forEach((a) => {
    recentActivity.push({
      id: `alert-${a.id}`,
      type: "ALERT",
      title: `Outbreak Alert: ${a.diseaseName || "Cluster Disease"}`,
      subtitle: `${a.village.name}, ${a.village.block.name} • ${a.caseCount} Cases Detected`,
      timestamp: a.createdAt.toISOString(),
      statusBadge: "ACTIVE ALERT",
      statusVariant: "destructive",
      linkUrl: `/authority/alerts?villageId=${a.villageId}`,
    });
  });

  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    districtName,
    districtId,
    activeFilters: {
      timeRange: timeRange as "today" | "7d" | "30d" | "90d" | "custom" | "all",
      blockId: blockId || null,
      villageId: villageId || null,
      startDate: customStartDate || null,
      endDate: customEndDate || null,
    },
    filterOptions: {
      blocks: filterBlocks,
      villages: filterVillages,
    },
    snapshot,
    periodMetrics,
    kpis,
    pipeline,
    veterinarians,
    fieldAgents,
    charts: {
      casesByStatus,
      casesByRisk,
      casesOverTime,
      casesByVillage,
      vetWorkload,
      agentWorkload,
      speciesDistribution,
      alertsBySeverity,
      assistanceRequestStatus,
    },
    villageAnalysis,
    mapLayers,
    recentActivity: recentActivity.slice(0, 10),
  };
}

// Backward compatibility helper for lightweight metrics queries
export async function getAuthorityDashboardMetrics(districtId: string | null) {
  const fullData = await getDistrictAuthorityCommandData({ districtId, timeRange: "7d" });
  return {
    districtName: fullData.districtName,
    animalsMonitored: fullData.snapshot.totalAnimals,
    reportsThisWeek: fullData.periodMetrics.casesReported,
    highRiskCases: fullData.charts.casesByRisk.find((r) => r.label === "High")?.value || 0,
    confirmedCases: fullData.snapshot.currentConfirmedCases,
    activeAlerts: fullData.snapshot.currentActiveAlerts,
    pendingApprovalsCount: 0,
    avgTimeToReviewHours: fullData.periodMetrics.avgTimeToReviewHours,
    avgTimeToConfirmationHours: fullData.periodMetrics.avgTimeToConfirmationHours,
  };
}
