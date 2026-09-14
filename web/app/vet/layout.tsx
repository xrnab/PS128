import React from "react";
import Link from "next/link";
import { requireVeterinarian } from "@/lib/auth/permissions";
import { Activity, ClipboardList, FlaskConical, Calendar, User } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function VetLayout({ children }: { children: React.ReactNode }) {
  await requireVeterinarian();

  return (
    <div className="w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
