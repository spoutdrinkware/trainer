"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  USER_ID,
  CHECKLIST_ITEMS,
  MACRO_TARGETS,
  getDayNumber,
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
  GlassWater,
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

function isOutdoorFriendly(weather: Weather): boolean {
  return weather.weatherCode < 63 && weather.temperature >= 35 && weather.temperature <= 90 && weather.windSpeed <= 20;
}

const GREETINGS = {
  morning: [
    "Rise 'n Grind",
    "Let's Get After It",
    "Good Morning — Time to Work",
    "Another Day, Another Win",
  ],
  afternoon: [
    "Keep Pushing",
    "Afternoon Grind",
    "Halfway Through — Finish Strong",
  ],
  evening: [
    "Evening Session",
    "Lock In",
    "Finish the Day Strong",
  ],
};

const QUOTES = [
  "Do something today that your future self will thank you for.",
  "It never gets easier. You just get stronger.",
  "The pain you feel today is the strength you feel tomorrow.",
  "Discipline is choosing what you want most over what you want now.",
  "Hard days build champions.",
  "You don't find willpower. You build it.",
  "One more rep. One more day. One more step forward.",
  "Be the athlete you were born to be.",
];

const DISPLAY_LABELS: Record<string, string> = {
  "Workout 1 (outdoor)": "Morning Workout",
  "Workout 2": "Evening Workout",
  "Follow diet": "Followed Diet",
  "Drink 1 gallon water": "Drank a Gallon",
  "Read 10 pages": "Read 10 Pages",
  "Progress photo": "Progress Photo",
};

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
  const [waterCups, setWaterCups] = useState(0);
  const today = todayString();
  const dayNum = getDayNumber();

  // Stable random greeting and quote per page load
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const pool = hour >= 5 && hour < 12 ? GREETINGS.morning : hour < 17 ? GREETINGS.afternoon : GREETINGS.evening;
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

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

  const loadWater = useCallback(async () => {
    const { data } = await supabase
      .from("water_logs")
      .select("cups")
      .eq("user_id", USER_ID)
      .eq("date", today)
      .maybeSingle();
    if (data) setWaterCups(data.cups);
  }, [today]);

  useEffect(() => {
    loadChecklist();
    loadMacros();
    loadWater();
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
  }, [loadChecklist, loadMacros, loadWater]);

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

  async function setWater(cups: number) {
    setWaterCups(cups);
    const { data: existing } = await supabase
      .from("water_logs")
      .select("id")
      .eq("user_id", USER_ID)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      await supabase.from("water_logs").update({ cups }).eq("id", existing.id);
    } else {
      await supabase.from("water_logs").insert({ user_id: USER_ID, date: today, cups });
    }
  }

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const WeatherIcon = weather ? getWeatherIcon(weather.weatherCode) : Sun;
  const outdoorOk = weather ? isOutdoorFriendly(weather) : true;

  const macroRows = [
    { label: "Calories", value: macros.calories, target: MACRO_TARGETS.calories, unit: "", color: "#c8441a" },
    { label: "Protein", value: Math.round(macros.protein), target: MACRO_TARGETS.protein, unit: "g", color: "#3b82f6" },
    { label: "Fat", value: Math.round(macros.fat), target: MACRO_TARGETS.fat, unit: "g", color: "#eab308" },
    { label: "Net Carbs", value: Math.round(macros.carbs), target: MACRO_TARGETS.carbs, unit: "g", color: "#22c55e" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-lg mx-auto">
      {/* 1. Welcome */}
      <div className="pt-4">
        <h1 className="text-2xl font-black text-white">
          {greeting}, <span className="text-[#c8441a]">Logan</span>
        </h1>
      </div>

      {/* 2. Weather card */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#c8441a]/10 flex items-center justify-center">
              <WeatherIcon className="w-6 h-6 text-[#c8441a]" />
            </div>
            <div>
              <div className="stat-number text-2xl text-white">
                {weather ? `${weather.temperature}°F` : "..."}
              </div>
              <div className="text-xs text-[#6b7280] mt-0.5">
                {weather?.description || "Loading"} &bull; {LOCATION.name}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-[#6b7280]">Wind {weather?.windSpeed ?? "--"} mph</div>
            {weather && (
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                outdoorOk
                  ? "bg-[#22c55e]/15 text-[#22c55e]"
                  : "bg-[#eab308]/15 text-[#eab308]"
              }`}>
                {outdoorOk ? "Outdoor: Go" : "Indoor Recommended"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Day counter */}
      <div className="text-center py-6">
        <div className="stat-number text-[72px] text-white leading-none">
          DAY {dayNum > 0 ? dayNum : "--"}
          <span className="text-[#6b7280] text-[28px]"> OF 75</span>
        </div>
        <p className="text-sm italic text-[#6b7280] mt-4 max-w-xs mx-auto">
          &ldquo;{quote}&rdquo;
        </p>
      </div>

      {/* 4. Daily Checklist */}
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
            const label = DISPLAY_LABELS[item] || item;
            const done = checklist[item];
            return (
              <button
                key={item}
                onClick={() => toggleItem(item)}
                className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl transition-all hover:bg-white/[0.03] active:scale-[0.98]"
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    done ? "bg-[#22c55e]" : "border-2 border-[#1e1e2e]"
                  }`}
                >
                  {done && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <Icon className={`w-4 h-4 ${done ? "text-[#22c55e]" : "text-[#6b7280]"}`} />
                <span className={`text-sm font-medium ${done ? "line-through text-[#6b7280]" : "text-white"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Water Tracker */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Droplet className="w-4 h-4 text-[#3b82f6]" />
            Water Tracker
          </h2>
          <span className="text-xs font-mono text-[#6b7280]">
            {waterCups} / 8 cups &bull; {waterCups * 16} oz
          </span>
        </div>
        <div className="flex justify-between gap-2">
          {Array.from({ length: 8 }).map((_, i) => {
            const filled = i < waterCups;
            return (
              <button
                key={i}
                onClick={() => setWater(i + 1 === waterCups ? i : i + 1)}
                className={`flex-1 aspect-square rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                  filled
                    ? "bg-[#3b82f6]/20 border border-[#3b82f6]/40"
                    : "bg-[#0a0a0f] border border-[#1e1e2e]"
                }`}
              >
                <GlassWater className={`w-5 h-5 ${filled ? "text-[#3b82f6]" : "text-[#6b7280]/30"}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Today's Macros */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Today&apos;s Macros</h2>
        <div className="space-y-4">
          {macroRows.map((m) => {
            const pct = Math.min(100, Math.round((m.value / m.target) * 100));
            return (
              <div key={m.label}>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs font-semibold text-[#6b7280]">{m.label}</span>
                  <span className="text-lg font-bold text-white font-mono">
                    {m.value}{m.unit} <span className="text-xs font-normal text-[#6b7280]">/ {m.target}{m.unit}</span>
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#1e1e2e] overflow-hidden">
                  <div
                    className="h-full rounded-full progress-bar"
                    style={{ width: `${pct}%`, backgroundColor: m.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
