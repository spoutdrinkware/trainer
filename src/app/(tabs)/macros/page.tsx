"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { USER_ID, MACRO_TARGETS } from "@/lib/constants";
import { Flame, Beef, Droplets, Wheat, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

export const dynamic = "force-dynamic";

interface MacroLog {
  id: string;
  meal_type: string;
  description: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  logged_at: string;
}

export default function MacrosPage() {
  const [logs, setLogs] = useState<MacroLog[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    meal_type: "Breakfast",
    description: "",
    calories: "",
    protein_g: "",
    fat_g: "",
    carbs_g: "",
  });

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from("macro_logs")
      .select("*")
      .eq("user_id", USER_ID)
      .gte("logged_at", `${date}T00:00:00`)
      .lte("logged_at", `${date}T23:59:59`)
      .order("logged_at");
    if (data) setLogs(data);
  }, [date]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories || 0),
      protein: acc.protein + Number(l.protein_g || 0),
      fat: acc.fat + Number(l.fat_g || 0),
      carbs: acc.carbs + Number(l.carbs_g || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const bars = [
    { label: "Calories", value: totals.calories, target: MACRO_TARGETS.calories, unit: "", icon: Flame, color: "#c8441a" },
    { label: "Protein", value: Math.round(totals.protein), target: MACRO_TARGETS.protein, unit: "g", icon: Beef, color: "#ef4444" },
    { label: "Fat", value: Math.round(totals.fat), target: MACRO_TARGETS.fat, unit: "g", icon: Droplets, color: "#eab308" },
    { label: "Net Carbs", value: Math.round(totals.carbs), target: MACRO_TARGETS.carbs, unit: "g", icon: Wheat, color: "#22c55e" },
  ];

  function shiftDate(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("macro_logs").insert({
      user_id: USER_ID,
      logged_at: new Date(`${date}T12:00:00`).toISOString(),
      meal_type: form.meal_type,
      description: form.description,
      calories: parseInt(form.calories) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
    });
    setForm({ meal_type: "Breakfast", description: "", calories: "", protein_g: "", fat_g: "", carbs_g: "" });
    setShowForm(false);
    loadLogs();
  }

  async function deleteLog(id: string) {
    await supabase.from("macro_logs").delete().eq("id", id);
    loadLogs();
  }

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-lg mx-auto">
      {/* Header with date */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">Macros</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)} className="p-2 rounded-xl bg-[#111118] border border-[#1e1e2e] hover:bg-[#16161f] transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#6b7280]" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-[#111118] border border-[#1e1e2e] rounded-xl px-3 py-2 text-sm font-mono text-white"
          />
          <button onClick={() => shiftDate(1)} className="p-2 rounded-xl bg-[#111118] border border-[#1e1e2e] hover:bg-[#16161f] transition-colors">
            <ChevronRight className="w-4 h-4 text-[#6b7280]" />
          </button>
        </div>
      </div>

      {/* Circular-style macro cards */}
      <div className="grid grid-cols-2 gap-3">
        {bars.map((b) => {
          const pct = Math.min(100, Math.round((b.value / b.target) * 100));
          const over = b.value > b.target;
          return (
            <div key={b.label} className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <b.icon className="w-4 h-4" style={{ color: b.color }} />
                <span className="text-xs font-bold text-[#6b7280] uppercase tracking-wider">{b.label}</span>
              </div>
              <div className="stat-number text-2xl text-white">
                {b.value}<span className="text-sm font-normal text-[#6b7280]">{b.unit}</span>
              </div>
              <div className="text-[10px] font-mono text-[#6b7280] mt-1">of {b.target}{b.unit}</div>
              <div className="h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden mt-3">
                <div
                  className={`h-full rounded-full progress-bar ${over ? "bg-[#ef4444]" : ""}`}
                  style={{ width: `${pct}%`, backgroundColor: over ? undefined : b.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowForm((v) => !v)}
        className="w-full py-3.5 rounded-2xl bg-[#c8441a] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#e05a2e] transition-colors active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" /> Log Meal
      </button>

      {/* Add form */}
      {showForm && (
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={form.meal_type}
              onChange={(e) => setForm((f) => ({ ...f, meal_type: e.target.value }))}
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-3 text-sm text-white"
            >
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Snack</option>
              <option>Dinner</option>
            </select>
            <input
              placeholder="Description (e.g. 3 eggs + bacon)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b7280]"
            />
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "calories", placeholder: "Calories" },
                { key: "protein_g", placeholder: "Protein (g)" },
                { key: "fat_g", placeholder: "Fat (g)" },
                { key: "carbs_g", placeholder: "Net Carbs (g)" },
              ].map(({ key, placeholder }) => (
                <input
                  key={key}
                  placeholder={placeholder}
                  type="number"
                  step={key === "calories" ? "1" : "0.1"}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#6b7280]"
                />
              ))}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#c8441a] text-white font-bold text-sm hover:bg-[#e05a2e] transition-colors"
            >
              Save
            </button>
          </form>
        </div>
      )}

      {/* Meal log list */}
      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-[#6b7280]">
            <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No meals logged</p>
            <p className="text-xs mt-1">Tap "Log Meal" to start tracking</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-[#111118] border border-[#1e1e2e] rounded-2xl px-4 py-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[#c8441a] uppercase tracking-wider">
                    {log.meal_type}
                  </span>
                  <span className="text-sm font-medium text-white">{log.description}</span>
                </div>
                <div className="text-xs font-mono text-[#6b7280] mt-1">
                  {log.calories}cal \u2022 {Number(log.protein_g).toFixed(0)}p \u2022{" "}
                  {Number(log.fat_g).toFixed(0)}f \u2022 {Number(log.carbs_g).toFixed(0)}c
                </div>
              </div>
              <button
                onClick={() => deleteLog(log.id)}
                className="p-2 rounded-xl hover:bg-[#1e1e2e] text-[#6b7280] hover:text-[#ef4444] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
