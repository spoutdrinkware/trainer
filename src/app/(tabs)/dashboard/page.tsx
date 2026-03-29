"use client";

import { useEffect, useState, useCallback } from "react";
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
  Umbrella,
  Check,
  Flame,
  Droplet,
  BookOpen,
  Camera,
  Dumbbell,
  TreePine,
} from "lucide-react";

export const dynamic = "force-dynamic";

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
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
  55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 80: "Slight showers",
  81: "Moderate showers", 82: "Violent showers", 95: "Thunderstorm",
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
    return "Heavy weather -- indoor cardio or garage workout.";
  if (weather.temperature < 35)
    return "Cold out -- bundle up for a ruck walk.";
  if (weather.temperature > 90)
    return "Hot -- go early AM. Light jog or stroller walk.";
  if (weather.windSpeed > 20)
    return "Windy -- sheltered route for your outdoor session.";
  return "Great conditions for outdoor training.";
}

const CHECKLIST_ICONS: Record<string, typeof Dumbbell> = {
  "Workout 1 (outdoor)": TreePine,
  "Workout 2": Dumbbell,
  "Follow diet": Flame,
  "Drink 1 gallon water": Droplet,
  "Read 10 pages": BookOpen,
  "Progress photo": Camera,
};

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
    const { data } = await supabase
      .from("macro_logs")
      .select("calories, protein_g, fat_g, carbs_g")
      .eq("user_id", USER_ID)
      .gte("logged_at", `${today}T00:00:00`)
      .lte("logged_at", `${today}T23:59:59`);
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
            description: weatherDescriptions[d.current.weather_code] || "Unknown",
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
      await supabase.from("checklist_logs").update({ completed: newVal }).eq("id", existing.id);
    } else {
      await supabase.from("checklist_logs").insert({ user_id: USER_ID, date: today, item, completed: newVal });
    }
  }

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const WeatherIcon = weather ? getWeatherIcon(weather.weatherCode) : Sun;
  const calPct = Math.min(100, Math.round((macros.calories / MACRO_TARGETS.calories) * 100));
  const proteinPct = Math.min(100, Math.round((macros.protein / MACRO_TARGETS.protein) * 100));

  // Week streak dots
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const todayDow = new Date().getDay();

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-lg mx-auto">
      {/* Hero stat */}
      <div className="text-center py-8">
        <p className="text-[#c8441a] text-xs font-black tracking-[0.3em] uppercase mb-2">
          75 HARD
        </p>
        <div className="stat-number text-[80px] md:text-[96px] text-white leading-none">
          {dayNum > 0 ? dayNum : "--"}
        </div>
        <p className="text-[#6b7280] text-sm font-medium mt-2">
          {dayNum <= 0 ? "Starts March 30" : `of 75 days \u2022 ${75 - dayNum} remaining`}
        </p>
      </div>

      {/* Week streak row */}
      <div className="flex justify-center gap-3">
        {weekDays.map((d, i) => {
          const dayIndex = i === 6 ? 0 : i + 1; // M=1..S=0
          const isToday = dayIndex === todayDow;
          const isPast = (dayIndex < todayDow) || (dayIndex === 0 && todayDow !== 0);
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className={`text-[10px] font-bold ${isToday ? "text-[#c8441a]" : "text-[#6b7280]"}`}>
                {d}
              </span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isToday
                    ? "bg-[#c8441a] text-white glow-red"
                    : isPast
                    ? "bg-[#c8441a]/20 text-[#c8441a]"
                    : "bg-[#111118] border border-[#1e1e2e] text-[#6b7280]"
                }`}
              >
                {isToday && <Check className="w-4 h-4" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-4">
          <p className="text-[#6b7280] text-[10px] font-bold tracking-wider uppercase">Beach In</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="stat-number text-3xl text-[#3b82f6]">{daysUntilBeach}</span>
            <span className="text-[#6b7280] text-xs font-medium">days</span>
          </div>
        </div>
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-4">
          <p className="text-[#6b7280] text-[10px] font-bold tracking-wider uppercase">Completed</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="stat-number text-3xl text-[#22c55e]">{completedCount}</span>
            <span className="text-[#6b7280] text-xs font-medium">/ {CHECKLIST_ITEMS.length}</span>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Daily Checklist</h2>
          <span className="text-xs font-mono text-[#6b7280]">
            {completedCount}/{CHECKLIST_ITEMS.length}
          </span>
        </div>
        <div className="px-3 pb-3 space-y-0.5">
          {CHECKLIST_ITEMS.map((item) => {
            const Icon = CHECKLIST_ICONS[item] || Check;
            const done = checklist[item];
            return (
              <button
                key={item}
                onClick={() => toggleItem(item)}
                className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl transition-all hover:bg-white/[0.03] active:scale-[0.98]"
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    done
                      ? "bg-[#22c55e] glow-green"
                      : "border-2 border-[#1e1e2e]"
                  }`}
                >
                  {done && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <Icon className={`w-4 h-4 ${done ? "text-[#22c55e]" : "text-[#6b7280]"}`} />
                <span className={`text-sm font-medium ${done ? "line-through text-[#6b7280]" : "text-white"}`}>
                  {item}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Macro quick view */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Today&apos;s Macros</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#6b7280]">Calories</span>
              <span className="text-xs font-mono text-white">
                {macros.calories} <span className="text-[#6b7280]">/ {MACRO_TARGETS.calories}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#1e1e2e] overflow-hidden">
              <div className="h-full rounded-full bg-[#c8441a] progress-bar" style={{ width: `${calPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#6b7280]">Protein</span>
              <span className="text-xs font-mono text-white">
                {Math.round(macros.protein)}g <span className="text-[#6b7280]">/ {MACRO_TARGETS.protein}g</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#1e1e2e] overflow-hidden">
              <div className="h-full rounded-full bg-[#3b82f6] progress-bar" style={{ width: `${proteinPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Weather */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#c8441a]/10 flex items-center justify-center">
              <WeatherIcon className="w-6 h-6 text-[#c8441a]" />
            </div>
            <div>
              <div className="stat-number text-2xl text-white">
                {weather ? `${weather.temperature}\u00b0F` : "..."}
              </div>
              <div className="text-xs text-[#6b7280] mt-0.5">
                {weather?.description || "Loading"} \u2022 {LOCATION.name}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#6b7280]">Wind</div>
            <div className="text-sm font-bold text-white font-mono">{weather?.windSpeed ?? "--"} mph</div>
          </div>
        </div>
        {weather && (
          <p className="text-xs mt-4 text-[#6b7280] border-t border-[#1e1e2e] pt-4">
            {getOutdoorRecommendation(weather)}
          </p>
        )}
      </div>
    </div>
  );
}
