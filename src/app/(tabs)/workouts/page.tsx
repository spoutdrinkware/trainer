"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { USER_ID, DAYS, todayString } from "@/lib/constants";
import { Dumbbell, TreePine, Building2, Check } from "lucide-react";

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

export const dynamic = "force-dynamic";

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedDay, setExpandedDay] = useState<number | null>(new Date().getDay());

  const weekStart = getWeekStartOffset(weekOffset);

  const loadWorkouts = useCallback(async () => {
    const { data } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", USER_ID)
      .eq("week_start", weekStart)
      .order("day_of_week")
      .order("session");
    if (data) setWorkouts(data);
  }, [weekStart]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  async function toggleComplete(workout: Workout) {
    const newVal = !workout.completed;
    await supabase
      .from("workouts")
      .update({ completed: newVal })
      .eq("id", workout.id);

    // Also update checklist_logs
    const today = todayString();
    const checkItem =
      workout.session === "AM" ? "Workout 1 (outdoor)" : "Workout 2";

    const { data: existing } = await supabase
      .from("checklist_logs")
      .select("id")
      .eq("user_id", USER_ID)
      .eq("date", today)
      .eq("item", checkItem)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("checklist_logs")
        .update({ completed: newVal })
        .eq("id", existing.id);
    } else {
      await supabase.from("checklist_logs").insert({
        user_id: USER_ID,
        date: today,
        item: checkItem,
        completed: newVal,
      });
    }

    loadWorkouts();
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Workouts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="px-2 py-1 text-sm rounded bg-secondary hover:bg-secondary/80"
          >
            Prev
          </button>
          <span className="text-xs text-muted-foreground font-mono">{weekStart}</span>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="px-2 py-1 text-sm rounded bg-secondary hover:bg-secondary/80"
          >
            Next
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {DAYS.map((day, i) => {
          const dayWorkouts = workouts.filter((w) => w.day_of_week === i);
          const isExpanded = expandedDay === i;
          const allDone = dayWorkouts.length > 0 && dayWorkouts.every((w) => w.completed);

          return (
            <Card key={i}>
              <button
                onClick={() => setExpandedDay(isExpanded ? null : i)}
                className="w-full"
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <span className={i === new Date().getDay() ? "text-[var(--color-accent-red)]" : ""}>
                        {day}
                      </span>
                      {allDone && <Check className="w-4 h-4 text-green-500" />}
                    </CardTitle>
                    <div className="flex gap-1.5">
                      {dayWorkouts.map((w) => (
                        <Badge
                          key={w.id}
                          variant={w.completed ? "default" : "secondary"}
                          className={`text-[10px] ${w.completed ? "bg-green-800 text-green-100" : ""}`}
                        >
                          {w.session}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardHeader>
              </button>
              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-4 space-y-3">
                  {dayWorkouts.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No workouts planned. Use the Planner tab.
                    </div>
                  ) : (
                    dayWorkouts.map((w) => (
                      <div key={w.id} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--color-accent-red)] uppercase">
                              {w.session}
                            </span>
                            <span className="font-medium text-sm">{w.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] gap-1">
                              {w.environment === "outdoor" ? (
                                <TreePine className="w-3 h-3" />
                              ) : (
                                <Building2 className="w-3 h-3" />
                              )}
                              {w.environment}
                            </Badge>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleComplete(w);
                              }}
                              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                                w.completed
                                  ? "bg-green-600 border-green-600"
                                  : "border-muted-foreground/40 hover:border-[var(--color-accent-red)]"
                              }`}
                            >
                              {w.completed && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          </div>
                        </div>
                        {w.exercises_json && w.exercises_json.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {w.exercises_json.map((ex, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs text-muted-foreground"
                              >
                                <span>{ex.name}</span>
                                <span className="font-mono">
                                  {ex.sets && ex.reps
                                    ? `${ex.sets}x${ex.reps}`
                                    : ex.notes || ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function getWeekStartOffset(offset: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return d.toISOString().split("T")[0];
}
