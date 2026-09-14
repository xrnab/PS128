import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = React.useState(value || defaultValue || "");

  const activeTab = value !== undefined ? value : active;
  const setActiveTab = (val: string) => {
    if (value === undefined) setActive(val);
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center justify-start rounded-2xl bg-[#FAF8F3] dark:bg-black/40 p-1 text-stone-600 dark:text-stone-300 border border-[#E5E0D8] dark:border-white/12 backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be inside Tabs");

  const isActive = context.activeTab === value;

  return (
    <button
      type="button"
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
        isActive
          ? "bg-white dark:bg-white/15 text-[#047857] dark:text-[#F4EEE1] border border-[#E5E0D8] dark:border-white/20 shadow-xs dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
          : "text-stone-600 dark:text-stone-300 hover:text-[#191F1C] dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/8",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be inside Tabs");

  if (context.activeTab !== value) return null;

  return <div className={cn("mt-4 animate-in fade-in-50 duration-200", className)}>{children}</div>;
}
