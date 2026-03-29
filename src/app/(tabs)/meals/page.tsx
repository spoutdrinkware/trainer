"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { DAYS, MEAL_TYPES } from "@/lib/constants";
import { ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

interface MealPlan {
  id: string;
  day_of_week: number;
  meal_type: string;
  title: string;
  recipe_json: {
    ingredients?: string[];
    instructions?: string[];
    macros?: { calories?: number; protein?: number; fat?: number; carbs?: number };
  } | null;
}

export default function MealsPage() {
  const userId = useUser();
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(new Date().getDay());
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = getWeekStartOffset(weekOffset);

  const loadMeals = useCallback(async () => {
    const { data } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", userId!)
      .eq("week_start", weekStart)
      .order("day_of_week")
      .order("meal_type");
    if (data) setMeals(data);
  }, [weekStart, userId]);

  useEffect(() => {
    if (!userId) return;
    loadMeals();
  }, [loadMeals]);

  function getMealsForDay(dayIndex: number) {
    return meals.filter((m) => m.day_of_week === dayIndex);
  }

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Meal Plan</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#111118] border border-[#1e1e2e] text-[#6b7280] hover:text-white transition-colors"
          >
            Prev
          </button>
          <span className="text-xs text-[#6b7280] font-mono">{weekStart}</span>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#111118] border border-[#1e1e2e] text-[#6b7280] hover:text-white transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {DAYS.map((day, i) => {
          const dayMeals = getMealsForDay(i);
          const isExpanded = expandedDay === i;
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
                  {dayMeals.length > 0 && (
                    <span className="text-[10px] font-mono text-[#6b7280] bg-[#1e1e2e] px-2 py-0.5 rounded-full">
                      {dayMeals.length} meals
                    </span>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#6b7280]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#6b7280]" />
                )}
              </button>
              {isExpanded && (
                <div className="px-5 pb-4 space-y-3 border-t border-[#1e1e2e] pt-3">
                  {dayMeals.length === 0 ? (
                    <div className="text-center py-8 text-[#6b7280]">
                      <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No meals planned. Use the Planner tab.</p>
                    </div>
                  ) : (
                    MEAL_TYPES.map((type) => {
                      const meal = dayMeals.find((m) => m.meal_type.toLowerCase() === type.toLowerCase());
                      if (!meal) return null;
                      const macros = meal.recipe_json?.macros;
                      return (
                        <div key={type} className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black text-[#c8441a] uppercase tracking-wider">
                              {type}
                            </span>
                            {macros && (
                              <span className="text-[10px] font-mono text-[#6b7280]">
                                {macros.calories}cal \u2022 {macros.protein}p \u2022 {macros.fat}f \u2022 {macros.carbs}c
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-sm text-white">{meal.title}</div>
                          {meal.recipe_json?.ingredients && (
                            <div className="mt-3">
                              <div className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1.5">Ingredients</div>
                              <ul className="text-xs text-[#6b7280] space-y-0.5">
                                {meal.recipe_json.ingredients.map((ing, idx) => (
                                  <li key={idx}>\u2022 {ing}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {meal.recipe_json?.instructions && (
                            <div className="mt-3">
                              <div className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mb-1.5">Instructions</div>
                              <ol className="text-xs text-[#6b7280] space-y-0.5">
                                {meal.recipe_json.instructions.map((step, idx) => (
                                  <li key={idx}>{idx + 1}. {step}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    })
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

function getWeekStartOffset(offset: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + offset * 7);
  return d.toISOString().split("T")[0];
}
