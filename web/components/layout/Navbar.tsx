"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import {
  ShieldCheck,
  Stethoscope,
  Building2,
  User,
  Home,
  Settings,
  Activity,
  ClipboardList,
  FlaskConical,
  Calendar,
  BellRing,
  UserCheck,
  FileSpreadsheet,
  LayoutDashboard,
  PlusCircle,
  Cpu,
  MessageSquareText,
  ScrollText,
  MapPin,
  FilePlus2,
  ChevronDown,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/layout/LocaleProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Navbar() {
  const pathname = usePathname();
  const { locale, dictionary, setLocale } = useLocale();
  const { user } = useUser();
  const [portalMenuOpen, setPortalMenuOpen] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);

  // Close portal switcher dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (portalRef.current && !portalRef.current.contains(event.target as Node)) {
        setPortalMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userRole = (user?.publicMetadata?.role as string | undefined);
  const activeRoleKey = userRole || (
    pathname.startsWith("/admin")
      ? "ADMIN"
      : pathname.startsWith("/authority")
      ? "DISTRICT_AUTHORITY"
      : pathname.startsWith("/vet")
      ? "VETERINARIAN"
      : pathname.startsWith("/agent")
      ? "FIELD_AGENT"
      : "FARMER"
  );
  const roleLabel = dictionary.roles[activeRoleKey as keyof typeof dictionary.roles] || dictionary.roles.FARMER;

  // Contextual section navigation based on active URL
  type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };
  let contextualLinks: NavItem[] = [];
  let currentPortalName = "Portals";

  if (pathname.startsWith("/vet")) {
    currentPortalName = "Veterinarian";
    contextualLinks = [
      { href: "/vet", label: "Triage Queue", icon: Activity, exact: true },
      { href: "/vet/cases", label: "All Cases", icon: ClipboardList },
      { href: "/vet/samples", label: "Lab Samples", icon: FlaskConical },
      { href: "/vet/follow-ups", label: "Visits & Schedule", icon: Calendar },
      { href: "/vet/profile", label: "Profile", icon: User },
    ];
  } else if (pathname.startsWith("/authority")) {
    currentPortalName = "District Authority";
    contextualLinks = [
      { href: "/authority", label: "Control Center", icon: Activity, exact: true },
      { href: "/authority/alerts", label: "Outbreak Alerts", icon: BellRing },
      { href: "/authority/approvals", label: "Approvals", icon: UserCheck },
      { href: "/authority/locations", label: "Geography", icon: MapPin },
      { href: "/authority/reports", label: "Reports", icon: FileSpreadsheet },
    ];
  } else if (pathname.startsWith("/farmer")) {
    currentPortalName = "Farmer Portal";
    contextualLinks = [
      { href: "/farmer", label: "Livestock Herd", icon: LayoutDashboard, exact: true },
      { href: "/farmer/report", label: "Report Symptoms", icon: PlusCircle },
      { href: "/farmer/iot", label: "IoT Telemetry", icon: Cpu },
      { href: "/farmer/request-help", label: "Request Agent", icon: UserCheck },
      { href: "/farmer/talk", label: "Maitri AI", icon: MessageSquareText },
      { href: "/farmer/profile", label: "Profile", icon: User },
    ];
  } else if (pathname.startsWith("/admin")) {
    currentPortalName = "Admin Cockpit";
    contextualLinks = [
      { href: "/admin", label: "Cockpit", icon: LayoutDashboard, exact: true },
      { href: "/admin/audit-log", label: "Audit Ledger", icon: ScrollText },
      { href: "/admin/geography", label: "Geography", icon: MapPin },
    ];
  } else if (pathname.startsWith("/agent")) {
    currentPortalName = "Field Agent";
    contextualLinks = [
      { href: "/agent", label: "Workstation", icon: ShieldCheck, exact: true },
      { href: "/agent/report", label: "Inspection Report", icon: FilePlus2 },
    ];
  } else {
    currentPortalName = "Portals";
    contextualLinks = [
      { href: "/farmer", label: dictionary.nav.farmer, icon: User },
      { href: "/agent", label: dictionary.nav.agent, icon: ShieldCheck },
      { href: "/vet", label: dictionary.nav.vet, icon: Stethoscope },
      { href: "/authority", label: dictionary.nav.authority, icon: Building2 },
      { href: "/admin", label: dictionary.nav.admin || "Admin", icon: Settings },
    ];
  }

  const allPortals = [
    { href: "/vet", label: "Veterinarian", desc: "Triage & clinical cases", icon: Stethoscope },
    { href: "/authority", label: "District Authority", desc: "Surveillance & approvals", icon: Building2 },
    { href: "/farmer", label: "Farmer Portal", desc: "Herd registry & illness", icon: User },
    { href: "/agent", label: "Field Agent", desc: "Inspection & visits", icon: ShieldCheck },
    { href: "/admin", label: "Admin Panel", desc: "Platform master ledger", icon: Settings },
  ];

  return (
    <header className="sticky top-2 sm:top-3 z-50 w-full px-3 sm:px-6 max-w-[1440px] mx-auto mb-3 sm:mb-4 transition-all duration-300">
      <div className="h-16 sm:h-18 px-3.5 sm:px-5 flex items-center justify-between gap-2 rounded-2xl md:rounded-full bg-[#1E3A2B]/92 dark:bg-[#0A1610]/88 backdrop-blur-[16px] border border-white/25 dark:border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_2px_8px_rgba(30,58,43,0.06),0_8px_20px_rgba(30,58,43,0.10)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_32px_rgba(0,0,0,0.5)]">
        {/* Brand Identity */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0 select-none">
          <div className="flex h-9 w-9 sm:h-9.5 sm:w-9.5 shrink-0 items-center justify-center rounded-xl md:rounded-full bg-white/95 overflow-hidden shadow-[inset_0_1px_rgba(255,255,255,.95),0_4px_12px_rgba(0,0,0,0.15)] transition-all group-hover:scale-105">
            <Image
              src="/images/maitri-livestock-logo.png"
              alt="Maitri logo"
              width={38}
              height={38}
              className="h-full w-full object-contain scale-120"
              priority
            />
          </div>
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="font-display text-base sm:text-lg lg:text-xl font-bold tracking-tight text-[#F4EEE1] whitespace-nowrap">
              Maitri
            </span>
            <span className="hidden sm:inline-block text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#3F6B4A]/70 text-[#BDEEC5] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] shrink-0 whitespace-nowrap">
              Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Contextual Navigation Links (Liquid Glass Capsule) */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 p-1 rounded-full bg-[#072417]/55 dark:bg-black/35 backdrop-blur-md border border-white/10 shadow-[inset_0_1px_1px_0_rgba(0,0,0,0.3)] shrink-0">
          {contextualLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-2.5 xl:px-3.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#3F6B4A]/80 text-[#F4EEE1] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.3),0_4px_12px_rgba(30,58,43,0.35)] font-semibold"
                    : "text-[#AECEB9] hover:text-[#F4EEE1] hover:bg-[#3F6B4A]/30"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-[#BDEEC5]" : "text-[#AECEB9]"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Fast Portal Switcher Dropdown */}
          <div className="relative" ref={portalRef}>
            <button
              onClick={() => setPortalMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#072417]/60 dark:bg-white/10 hover:bg-[#072417]/80 dark:hover:bg-white/15 border border-white/15 text-xs text-[#BDEEC5] font-medium transition-all shadow-xs cursor-pointer whitespace-nowrap"
              title="Switch role portal"
            >
              <Layers className="h-3.5 w-3.5 text-[#D9A441] shrink-0" />
              <span className="hidden md:inline font-semibold">{currentPortalName}</span>
              <ChevronDown className={`h-3 w-3 text-[#AECEB9] transition-transform shrink-0 ${portalMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Apple Liquid Glass Dropdown Menu */}
            {portalMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#1E3A2B]/95 dark:bg-[#0D1B14]/95 backdrop-blur-[24px] border border-white/20 dark:border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#AECEB9]/70 px-3 py-1">
                  Switch Active Portal
                </div>
                {allPortals.map((p) => {
                  const Icon = p.icon;
                  const isCurrent = pathname.startsWith(p.href);
                  return (
                    <Link
                      key={p.href}
                      href={p.href}
                      onClick={() => setPortalMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                        isCurrent
                          ? "bg-[#3F6B4A]/70 text-white font-bold shadow-xs"
                          : "text-[#F4EEE1] hover:bg-white/10"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isCurrent ? "text-[#BDEEC5]" : "text-[#D9A441]"}`} />
                      <div>
                        <div className="font-semibold">{p.label}</div>
                        <div className="text-[10px] text-[#AECEB9]/80 font-normal">{p.desc}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dark / Light Mode Toggle */}
          <ThemeToggle />

          {/* Language Switcher Toggle */}
          <div className="flex items-center rounded-full border border-white/15 bg-[#072417]/60 p-0.5 text-xs font-semibold shadow-[inset_0_1px_rgba(255,255,255,.1)] backdrop-blur-xl shrink-0" role="group" aria-label="Language switcher">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`px-2 py-0.5 rounded-full transition-all text-[11px] cursor-pointer ${
                locale === "en"
                  ? "bg-[#3F6B4A] text-[#F4EEE1] shadow-sm font-bold"
                  : "text-[#AECEB9] hover:text-[#F4EEE1]"
              }`}
              aria-label="English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale("mr")}
              className={`px-2 py-0.5 rounded-full transition-all text-[11px] cursor-pointer ${
                locale === "mr"
                  ? "bg-[#3F6B4A] text-[#F4EEE1] shadow-sm font-bold"
                  : "text-[#AECEB9] hover:text-[#F4EEE1]"
              }`}
              aria-label="मराठी"
            >
              मराठी
            </button>
          </div>

          <Show when="signed-out">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <SignInButton mode="modal">
                <Button variant="outline" size="sm" className="text-xs h-8 px-3 text-[#F4EEE1] bg-white/10 hover:bg-white/20 border-white/20 rounded-full">
                  {dictionary.nav.signIn}
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm" className="text-xs h-8 px-3.5 hidden xs:inline-flex sm:inline-flex bg-[#F4EEE1] text-[#1E3A2B] hover:bg-white shadow-md rounded-full font-semibold">
                  {dictionary.nav.signUp}
                </Button>
              </SignUpButton>
            </div>
          </Show>

          <Show when="signed-in">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Link href="/dashboard" title="Dashboard">
                <Button size="sm" variant="outline" className="text-xs h-8 px-2.5 sm:px-3 text-[#F4EEE1] bg-white/10 hover:bg-white/20 border-white/20 flex items-center gap-1.5 rounded-full shrink-0">
                  <Home className="h-3.5 w-3.5 text-[#BDEEC5]" />
                  <span className="hidden xl:inline">{dictionary.nav.dashboard}</span>
                </Button>
              </Link>
              <div className="shrink-0 flex items-center">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "h-8 w-8 sm:h-8.5 sm:w-8.5 border border-[#BDEEC5]/60 hover:border-[#BDEEC5] transition-all rounded-full shadow-sm",
                    },
                  }}
                />
              </div>
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
}
