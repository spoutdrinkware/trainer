"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  USER_ID,
  CHECKLIST_ITEMS,
  MACRO_TARGETS,
  getDayNumber,
  getDaysUntilBeach,
  todayString,
  LOCATION,
} from "@/lib/constants";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Flame,
  Beef,
  Droplets,
  Wheat,
  Umbrella,
  Check,
} from "lucide-react";

interface Weather {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  description: string;
}

interface DailyMacros {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

const weatherDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  95: "Thunderstorm",
};

function getWeatherIcon(code: number) {
  if (code <= 1) return Sun;
  if (code <= 3) return Cloud;
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return Umbrella;
  if (code >= 95) return CloudRain;
  return Wind;
}

function getOutdoorRecommendation(weather: Weather): string {
  if (weather.weatherCode >= 63 || weather.weatherCode >= 95)
    return "Heavy weather -- consider indoor cardio or garage workout.";
  if (weather.temperature < 35)
    return "Cold out -- bundle up for a ruck walk with the stroller.";
  if (weather.temperature > 90)
    return "Hot -- go early AM. Stroller walk or light jog with baby.";
  if (weather.windSpeed > 20)
    return "Windy -- sheltered route for stroller walk or run.";
  return "Great conditions -- stroller run, ruck walk, or outdoor HIIT.";
}

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [weather, setWeather] = useState<Weather | null>(null);
  const [macros, setMacros] = useState<DailyMacros>({ calories: 0, protein: 0, fat: 0, carbs: 0 });
  const today = todayString();
  const dayNum = getDayNumber();
  const daysUntilBeach = getDaysUntilBeach();

  const loadChecklist = useCallback(async () => {
    const { data } = await supabase
      .from("checklist_logs")
      .select("item, completed")
      .eq("user_id", USER_ID)
      .eq("date", today);
    if (data) {
      const map: Record<string, boolean> = {};
      data.forEach((row) => (map[row.item] = row.completed));
      setChecklist(map);
    }
  }, [today]);

  const loadMacros = useCallback(async () => {
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59`;
    const { data } = await supabase
      .from("macro_logs")
      .select("calories, protein_g, fat_g, carbs_g")
      .eq("user_id", USER_ID)
      .gte("logged_at", startOfDay)
      .lte("logged_at", endOfDay);
    if (data) {
      setMacros({
        calories: data.reduce((s, r) => s + (r.calories || 0), 0),
        protein: data.reduce((s, r) => s + Number(r.protein_g || 0), 0),
        fat: data.reduce((s, r) => s + Number(r.fat_g || 0), 0),
        carbs: data.reduce((s, r) => s + Number(r.carbs_g || 0), 0),
      });
    }
  }, [today]);

  useEffect(() => {
    loadChecklist();
    loadMacros();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.current) {
          setWeather({
            temperature: Math.round(d.current.temperature_2m),
            weatherCode: d.current.weather_code,
            windSpeed: Math.round(d.current.wind_speed_10m),
            description:
              weatherDescriptions[d.current.weather_code] || "Unknown",
          });
        }
      })
      .catch(() => {});
  }, [loadChecklist, loadMacros]);

  async function toggleItem(item: string) {
    const newVal = !checklist[item];
    setChecklist((prev) => ({ ...prev, [item]: newVal }));

    const { data: existing } = await supabase
      .from("checklist_logs")
      .select("id")
      .eq("user_id", USER_ID)
      .eq("date", today)
      .eq("item", item)
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
        item,
        completed: newVal,
      });
    }
  }

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const WeatherIcon = weather ? getWeatherIcon(weather.weatherCode) : Sun;

  const macroCards = [
    { label: "Calories", value: macros.calories, target: MACRO_TARGETS.calories, unit: "", icon: Flame, color: "text-orange-400" },
    { label: "Protein", value: Math.round(macros.protein), target: MACRO_TARGETS.protein, unit: "g", icon: Beef, color: "text-red-400" },
    { label: "Fat", value: Math.round(macros.fat), target: MACRO_TARGETS.fat, unit: "g", icon: Droplets, color: "text-yellow-400" },
    { label: "Net Carbs", value: Math.round(macros.carbs), target: MACRO_TARGETS.carbs, unit: "g", icon: Wheat, color: "text-green-400" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Day <span className="text-[var(--color-accent-red)]">{dayNum > 0 ? dayNum : "--"}</span>
            <span className="text-muted-foreground text-lg font-normal"> / 75</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {dayNum <= 0 ? "Starts March 30" : `${75 - dayNum} days remaining`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Beach in</div>
          <div className="text-2xl font-bold text-[var(--color-accent-red)]">{daysUntilBeach}d</div>
        </div>
      </div>

      {/* Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            Daily Checklist
            <span className="text-sm font-mono text-muted-foreground">
              {completedCount}/{CHECKLIST_ITEMS.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => toggleItem(item)}
              className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors hover:bg-secondary"
            >
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  checklist[item]
                    ? "bg-[var(--color-accent-red)] border-[var(--color-accent-red)]"
                    : "border-muted-foreground/40"
                }`}
              >
                {checklist[item] && <Check className="w-3 h-3 text-white" />}
              </div>
              <span
                className={`text-sm ${
                  checklist[item] ? "line-through text-muted-foreground" : ""
                }`}
              >
                {item}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Macro Cards */}
      <div className="grid grid-cols-2 gap-3">
        {macroCards.map((m) => {
          const pct = Math.min(100, Math.round((m.value / m.target) * 100));
          return (
            <Card key={m.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className={`w-4 h-4 ${m.color}`} />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
                <div className="text-xl font-bold font-mono">
                  {m.value}
                  <span className="text-sm font-normal text-muted-foreground">
                    {m.unit} / {m.target}{m.unit}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-[var(--color-accent-red)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Weather */}
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WeatherIcon className="w-8 h-8 text-[var(--color-accent-red)]" />
              <div>
                <div className="font-bold text-lg">
                  {weather ? `${weather.temperature}°F` : "..."}
                </div>
                <div className="text-xs text-muted-foreground">
                  {weather?.description || "Loading"} &middot; {LOCATION.name}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-right max-w-[140px]">
              Wind: {weather?.windSpeed ?? "--"} mph
            </div>
          </div>
          {weather && (
            <p className="text-sm mt-3 text-muted-foreground border-t border-border pt-3">
              {getOutdoorRecommendation(weather)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
