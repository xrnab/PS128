import Link from "next/link";
import { requireFarmer } from "@/lib/auth/permissions";
import prisma from "@/lib/db/prisma";
import { AssistanceRequestForm } from "@/components/farmer/AssistanceRequestForm";
import { ensureFarmerPrimaryFarmAction } from "@/lib/actions/farmer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function FarmerRequestHelpPage({

  searchParams,
}: {
  searchParams?: Promise<{ animalId?: string }>;
}) {
  const farmer = await requireFarmer();
  const t = await getTranslations("farmer");
  const params = searchParams ? await searchParams : {};
  const preSelectedAnimalId = params.animalId || null;

  // 1. Query all registered farms belonging to the authenticated farmer
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
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. If zero farms exist, check whether the farmer has a registered village location to auto-provision strictly idempotently
  if (farms.length === 0 && farmer.villageId) {
    const provisionResult = await ensureFarmerPrimaryFarmAction(farmer.id);
    if (provisionResult.farm) {
      const freshFarm = await prisma.farm.findUnique({
        where: { id: provisionResult.farm.id },
        include: {
          village: true,
          herds: {
            include: {
              animals: {
                select: {
                  id: true,
                  tag: true,
                  species: true,
                },
              },
            },
          },
        },
      });
      if (freshFarm) {
        farms = [freshFarm];
      }
    }
  }

  const farmOptions = farms.map((f) => ({
    id: f.id,
    name: f.name,
    villageName: f.village ? f.village.name : "Registered Location",
    animals: f.herds.flatMap((h) => h.animals),
  }));

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 space-y-6 text-[#1D1C14]">
      <div className="flex items-center justify-between border-b border-[#1E3A2B]/8 pb-4">
        <div>
          <span className="text-xs font-bold text-[#D9A441] uppercase tracking-wide">
            {t("doorstepFieldSupport")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E3A2B] tracking-tight font-display mt-1">
            {t("requestFieldAgentVisit")}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A3324]/75 mt-0.5">
            {t("requestFieldAgentLead")}
          </p>
        </div>

        <Link href="/farmer">
          <button
            type="button"
            className="h-9 px-4 text-xs font-semibold border border-white/80 bg-white/80 hover:bg-white text-[#1E3A2B] gap-1.5 rounded-full shadow-xs inline-flex items-center cursor-pointer transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("farmerPortal")}</span>
          </button>
        </Link>
      </div>

      <AssistanceRequestForm
        farms={farmOptions}
        preSelectedAnimalId={preSelectedAnimalId}
      />
    </div>
  );
}
