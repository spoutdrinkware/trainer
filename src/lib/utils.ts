import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { START_DATE } from "@/lib/constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns the Monday-like week start anchored to the program start (March 30 2026).
 *  Weeks run in 7-day blocks from the start date. Before start → returns start. */
export function getCurrentWeekStart(): Date {
  const programStart = new Date(START_DATE);
  programStart.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (today < programStart) return programStart;

  const daysSinceStart = Math.floor((today.getTime() - programStart.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(daysSinceStart / 7);

  const weekStart = new Date(programStart);
  weekStart.setDate(programStart.getDate() + weekNumber * 7);
  return weekStart;
}

/** Returns week start with an offset (in weeks) from the current program week. */
export function getWeekStartWithOffset(offset: number): Date {
  const current = getCurrentWeekStart();
  const result = new Date(current);
  result.setDate(current.getDate() + offset * 7);
  return result;
}

/** Formats a week start date as "2026-03-30" for Supabase queries. */
export function formatWeekStart(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns "Week X · M/D–M/D" label for a given week start date. */
export function getWeekLabel(weekStart: Date): string {
  const programStart = new Date(START_DATE);
  programStart.setHours(0, 0, 0, 0);

  const ws = new Date(weekStart);
  ws.setHours(0, 0, 0, 0);

  const weekEnd = new Date(ws);
  weekEnd.setDate(ws.getDate() + 6);

  const daysSinceStart = Math.floor((ws.getTime() - programStart.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.max(1, Math.floor(daysSinceStart / 7) + 1);

  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `Week ${weekNumber} \u00b7 ${fmt(ws)}\u2013${fmt(weekEnd)}`;
}
