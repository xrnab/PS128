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
      aria-label="Mobile Navigation Dock"
      className="xl:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/20 dark:border-white/12 bg-[#1E3A2B]/92 dark:bg-[#07150E]/90 backdrop-blur-2xl px-1 sm:px-2 shadow-[0_-8px_32px_rgba(30,58,43,.25)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.6)] pb-safe md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:min-w-140 md:max-w-2xl md:rounded-full md:border md:shadow-[0_16px_42px_rgba(30,58,43,.35)] dark:md:shadow-[0_16px_42px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] md:px-3 md:pb-0"
    >
      <div className="flex w-full items-center justify-between gap-0.5 sm:gap-1 py-1 sm:py-1.5 md:py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex-1 min-w-0 max-w-[62px] sm:max-w-[88px] flex flex-col items-center justify-center py-1 px-0.5 sm:px-1 rounded-xl md:rounded-full transition-all duration-200 min-h-[44px] touch-target ${
                isActive
                  ? "bg-[#3F6B4A] text-[#F4EEE1] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_rgba(30,58,43,0.4)] scale-102"
                  : "text-[#AECEB9] hover:text-[#F4EEE1] hover:bg-[#3F6B4A]/30 active:scale-95"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                  isActive ? "text-[#BDEEC5] scale-110" : "text-[#AECEB9]"
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
