import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { START_DATE } from "@/lib/constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getWeekLabel(date: Date): string {
  const start = new Date(START_DATE);
  start.setHours(0, 0, 0, 0);

  // Monday of the week containing `date`
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((dow + 6) % 7)); // Monday

  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6); // Sunday

  // Week number: how many weeks since start date
  const diffMs = mon.getTime() - start.getTime();
  const weekNum = Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);

  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `Week ${weekNum} \u00b7 ${fmt(mon)}\u2013${fmt(sun)}`;
}
