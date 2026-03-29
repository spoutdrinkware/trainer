"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Sparkles,
  UtensilsCrossed,
  ShoppingCart,
  PieChart,
  Dumbbell,
  TrendingUp,
} from "lucide-react";

const tabs = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Planner", href: "/planner", icon: Sparkles },
  { name: "Meals", href: "/meals", icon: UtensilsCrossed },
  { name: "Groceries", href: "/groceries", icon: ShoppingCart },
  { name: "Macros", href: "/macros", icon: PieChart },
  { name: "Workouts", href: "/workouts", icon: Dumbbell },
  { name: "Progress", href: "/progress", icon: TrendingUp },
];

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh overflow-hidden bg-[#0a0a0f]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-[#1e1e2e] bg-[#0a0a0f]">
        <div className="p-6 border-b border-[#1e1e2e]">
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-[#c8441a]">75</span>
            <span className="text-white ml-1">HARD</span>
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#c8441a] text-white glow-red"
                    : "text-[#6b7280] hover:text-white hover:bg-[#111118]"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/95 backdrop-blur-lg border-t border-[#1e1e2e] z-50 safe-bottom">
        <div className="flex justify-around items-center h-16 px-1">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl text-[9px] font-bold tracking-wide transition-colors ${
                  active
                    ? "text-[#c8441a]"
                    : "text-[#6b7280]"
                }`}
              >
                <tab.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                {tab.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
