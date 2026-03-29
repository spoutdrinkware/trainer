"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  PieChart,
  Dumbbell,
  BrainCircuit,
  TrendingUp,
} from "lucide-react";

const tabs = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Meals", href: "/meals", icon: UtensilsCrossed },
  { name: "Macros", href: "/macros", icon: PieChart },
  { name: "Workouts", href: "/workouts", icon: Dumbbell },
  { name: "Planner", href: "/planner", icon: BrainCircuit },
  { name: "Progress", href: "/progress", icon: TrendingUp },
];

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-[var(--sidebar)]">
        <div className="p-5 border-b border-border">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-[var(--color-accent-red)]">75</span> HQ
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-accent-red)] text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--sidebar)] border-t border-border z-50 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16 px-1">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  active
                    ? "text-[var(--color-accent-red)]"
                    : "text-muted-foreground"
                }`}
              >
                <tab.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                {tab.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
