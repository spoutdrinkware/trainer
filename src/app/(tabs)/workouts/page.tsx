"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { DAYS, todayString } from "@/lib/constants";
import { getWeekLabel, getWeekStartWithOffset, formatWeekStart } from "@/lib/utils";
import { Dumbbell, TreePine, Building2, Check, ChevronDown, ChevronUp } from "lucide-react";

export const dynamic = "force-dynamic";

interface Workout {
  id: string;
  day_of_week: number;
  session: string;
  name: string;
  environment: string;
  exercises_json: { name: string; sets?: number; reps?: string; notes?: string }[] | null;
  completed: boolean;
  week_start: string;
}

export default function WorkoutsPage() {
  const userId = useUser();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedDay, setExpandedDay] = useState<number | null>(new Date().getDay());

  const weekDate = getWeekStartWithOffset(weekOffset);
  const weekStart = formatWeekStart(weekDate);

  const loadWorkouts = useCallback(async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId!)
      .eq("week_start", weekStart)
      .order("day_of_week")
      .order("session");
    console.log("[Workouts] query:", { userId, weekStart, rows: data?.length, error: error?.message });
    if (data) setWorkouts(data);
  }, [weekStart, userId]);

  useEffect(() => {
    if (!userId) return;
    loadWorkouts();
  }, [loadWorkouts]);

  async function toggleComplete(workout: Workout) {
    const newVal = !workout.completed;
    await supabase.from("workouts").update({ completed: newVal }).eq("id", workout.id);

    const today = todayString();
    const checkItem = workout.session === "AM" ? "Workout 1 (outdoor)" : "Workout 2";

    const { data: existing } = await supabase
      .from("checklist_logs")
      .select("id")
      .eq("user_id", userId!)
      .eq("date", today)
      .eq("item", checkItem)
      .maybeSingle();

    if (existing) {
      await supabase.from("checklist_logs").update({ completed: newVal }).eq("id", existing.id);
    } else {
      await supabase.from("checklist_logs").insert({ user_id: userId!, date: today, item: checkItem, completed: newVal });
    }

    loadWorkouts();
  }

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Workouts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#111118] border border-[#1e1e2e] text-[#6b7280] hover:text-white transition-colors"
          >
            Prev
          </button>
          <span className="text-xs text-[#6b7280] font-mono">{getWeekLabel(weekDate)}</span>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#111118] border border-[#1e1e2e] text-[#6b7280] hover:text-white transition-colors"
          >
            Next
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 text-xs font-bold rounded-full bg-[#c8441a] text-white hover:bg-[#e05a2e] transition-colors"
            >
              This Week
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {DAYS.map((day, i) => {
          const dayWorkouts = workouts.filter((w) => w.day_of_week === i);
          const isExpanded = expandedDay === i;
          const allDone = dayWorkouts.length > 0 && dayWorkouts.every((w) => w.completed);
          const isToday = i === new Date().getDay();

          return (
            <div key={i} className={`bg-[#111118] border rounded-2xl overflow-hidden transition-colors ${isToday ? "border-[#c8441a]/30" : "border-[#1e1e2e]"}`}>
              <button
                onClick={() => setExpandedDay(isExpanded ? null : i)}
                className="w-full px-5 py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${isToday ? "text-[#c8441a]" : "text-white"}`}>
                    {day}
                  </span>
                  {allDone && (
                    <div className="w-5 h-5 rounded-md bg-[#22c55e] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {dayWorkouts.map((w) => (
                    <span
                      key={w.id}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                        w.completed
                          ? "bg-[#22c55e]/20 text-[#22c55e]"
                          : "bg-[#1e1e2e] text-[#6b7280]"
                      }`}
                    >
                      {w.session}
                    </span>
                  ))}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#6b7280] ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#6b7280] ml-1" />
                  )}
                </div>
              </button>
              {isExpanded && (
                <div className="px-5 pb-4 space-y-3 border-t border-[#1e1e2e] pt-3">
                  {dayWorkouts.length === 0 ? (
                    <div className="text-center py-8 text-[#6b7280]">
                      <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No workouts planned. Use the Planner tab.</p>
                    </div>
                  ) : (
                    dayWorkouts.map((w) => (
                      <div key={w.id} className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-[#c8441a] uppercase tracking-wider bg-[#c8441a]/10 px-2.5 py-1 rounded-lg">
                              {w.session}
                            </span>
                            <span className="font-bold text-sm text-white">{w.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#6b7280] flex items-center gap-1">
                              {w.environment === "outdoor" ? (
                                <TreePine className="w-3 h-3" />
                              ) : (
                                <Building2 className="w-3 h-3" />
                              )}
                              {w.environment}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleComplete(w);
                              }}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                w.completed
                                  ? "bg-[#22c55e]"
                                  : "border-2 border-[#1e1e2e] hover:border-[#c8441a]"
                              }`}
                            >
                              {w.completed && <Check className="w-4 h-4 text-white" />}
                            </button>
                          </div>
                        </div>
                        {w.exercises_json && w.exercises_json.length > 0 && (
                          <div className="space-y-1.5 border-t border-[#1e1e2e] pt-3">
                            {w.exercises_json.map((ex, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-[#6b7280]">{ex.name}</span>
                                <span className="font-mono text-white">
                                  {ex.sets && ex.reps ? `${ex.sets}\u00d7${ex.reps}` : ex.notes || ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

