import React from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/permissions";
import { LayoutDashboard, ScrollText, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
