"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { USER_ID, DAYS, MEAL_TYPES, getWeekStart } from "@/lib/constants";
import { ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react";

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
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(new Date().getDay());
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = getWeekStartOffset(weekOffset);

  const loadMeals = useCallback(async () => {
    const { data } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("user_id", USER_ID)
      .eq("week_start", weekStart)
      .order("day_of_week")
      .order("meal_type");
    if (data) setMeals(data);
  }, [weekStart]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  function getMealsForDay(dayIndex: number) {
    return meals.filter((m) => m.day_of_week === dayIndex);
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Meal Plan</h1>
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
          const dayMeals = getMealsForDay(i);
          const isExpanded = expandedDay === i;
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
                      {dayMeals.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {dayMeals.length} meals
                        </span>
                      )}
                    </CardTitle>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </button>
              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-4 space-y-3">
                  {dayMeals.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No meals planned. Use the Planner tab to generate a meal plan.
                    </div>
                  ) : (
                    MEAL_TYPES.map((type) => {
                      const meal = dayMeals.find(
                        (m) => m.meal_type.toLowerCase() === type.toLowerCase()
                      );
                      if (!meal) return null;
                      const macros = meal.recipe_json?.macros;
                      return (
                        <div key={type} className="border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[var(--color-accent-red)] uppercase tracking-wider">
                              {type}
                            </span>
                            {macros && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {macros.calories}cal &middot; {macros.protein}p &middot;{" "}
                                {macros.fat}f &middot; {macros.carbs}c
                              </span>
                            )}
                          </div>
                          <div className="font-medium text-sm">{meal.title}</div>
                          {meal.recipe_json?.ingredients && (
                            <div className="mt-2">
                              <div className="text-xs text-muted-foreground mb-1">Ingredients:</div>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {meal.recipe_json.ingredients.map((ing, idx) => (
                                  <li key={idx}>• {ing}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {meal.recipe_json?.instructions && (
                            <div className="mt-2">
                              <div className="text-xs text-muted-foreground mb-1">Instructions:</div>
                              <ol className="text-xs text-muted-foreground space-y-0.5">
                                {meal.recipe_json.instructions.map((step, idx) => (
                                  <li key={idx}>
                                    {idx + 1}. {step}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    })
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
