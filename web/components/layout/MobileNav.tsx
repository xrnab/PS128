"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, ShieldCheck, Stethoscope, Building2, Settings } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";

export function MobileNav() {
  const pathname = usePathname();
  const { dictionary } = useLocale();

  const navItems = [
    { href: "/", label: dictionary.nav.home, icon: Home },
    { href: "/farmer", label: dictionary.nav.farmer, icon: User },
    { href: "/agent", label: dictionary.nav.agent, icon: ShieldCheck },
    { href: "/vet", label: dictionary.nav.vet, icon: Stethoscope },
    { href: "/authority", label: dictionary.nav.authority, icon: Building2 },
    { href: "/admin", label: dictionary.nav.admin || "Admin", icon: Settings },
  ];

  return (
    <nav
      aria-label="Mobile and Tablet Navigation"
      className="xl:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[#C9BFA0] bg-[#F3EFE5]/95 backdrop-blur-md px-1 sm:px-2 shadow-lg pb-safe md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:min-w-[560px] md:max-w-2xl md:rounded-2xl md:border md:shadow-2xl md:px-3 md:pb-0"
    >
      <div className="flex w-full items-center justify-between gap-0.5 py-1.5 md:py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex-1 min-w-0 max-w-[72px] sm:max-w-[88px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 min-h-[44px] touch-target ${
                isActive
                  ? "bg-[#274C36] text-[#F3EFE5] shadow-xs scale-102"
                  : "text-[#5C5645] hover:text-[#20271F] hover:bg-[#EAE4D0]/60 active:scale-95"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                  isActive ? "text-[#EDE7D3] scale-110" : "text-[#5C5645]"
                }`}
              />
              <span className="w-full text-center truncate text-[9px] sm:text-[10px] font-medium leading-tight mt-0.5 tracking-tight px-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
