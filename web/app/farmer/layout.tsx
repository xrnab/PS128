import React from "react";
import Link from "next/link";
import { requireFarmer } from "@/lib/auth/permissions";
import { LayoutDashboard, PlusCircle, Cpu, UserCheck, MessageSquareText, User } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function FarmerLayout({ children }: { children: React.ReactNode }) {
  await requireFarmer();

  return (
    <div className="w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
