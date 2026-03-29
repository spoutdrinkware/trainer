"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { USER_ID, MACRO_TARGETS } from "@/lib/constants";
import { Flame, Beef, Droplets, Wheat, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

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

export const dynamic = "force-dynamic";

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
    { label: "Calories", value: totals.calories, target: MACRO_TARGETS.calories, unit: "", icon: Flame, color: "bg-orange-500" },
    { label: "Protein", value: Math.round(totals.protein), target: MACRO_TARGETS.protein, unit: "g", icon: Beef, color: "bg-red-500" },
    { label: "Fat", value: Math.round(totals.fat), target: MACRO_TARGETS.fat, unit: "g", icon: Droplets, color: "bg-yellow-500" },
    { label: "Net Carbs", value: Math.round(totals.carbs), target: MACRO_TARGETS.carbs, unit: "g", icon: Wheat, color: "bg-green-500" },
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
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Date picker */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Macros</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)} className="p-1 rounded hover:bg-secondary">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-secondary rounded px-2 py-1 text-sm font-mono"
          />
          <button onClick={() => shiftDate(1)} className="p-1 rounded hover:bg-secondary">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-3">
        {bars.map((b) => {
          const pct = Math.min(100, Math.round((b.value / b.target) * 100));
          const over = b.value > b.target;
          return (
            <div key={b.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <b.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm">{b.label}</span>
                </div>
                <span className={`text-sm font-mono ${over ? "text-destructive" : ""}`}>
                  {b.value}{b.unit} / {b.target}{b.unit}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${over ? "bg-destructive" : b.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowForm((v) => !v)}
        className="w-full py-2.5 rounded-lg bg-[var(--color-accent-red)] text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" /> Log Meal
      </button>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <select
                value={form.meal_type}
                onChange={(e) => setForm((f) => ({ ...f, meal_type: e.target.value }))}
                className="w-full bg-secondary rounded px-3 py-2 text-sm"
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
                className="w-full bg-secondary rounded px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Calories"
                  type="number"
                  value={form.calories}
                  onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
                  className="bg-secondary rounded px-3 py-2 text-sm"
                />
                <input
                  placeholder="Protein (g)"
                  type="number"
                  step="0.1"
                  value={form.protein_g}
                  onChange={(e) => setForm((f) => ({ ...f, protein_g: e.target.value }))}
                  className="bg-secondary rounded px-3 py-2 text-sm"
                />
                <input
                  placeholder="Fat (g)"
                  type="number"
                  step="0.1"
                  value={form.fat_g}
                  onChange={(e) => setForm((f) => ({ ...f, fat_g: e.target.value }))}
                  className="bg-secondary rounded px-3 py-2 text-sm"
                />
                <input
                  placeholder="Net Carbs (g)"
                  type="number"
                  step="0.1"
                  value={form.carbs_g}
                  onChange={(e) => setForm((f) => ({ ...f, carbs_g: e.target.value }))}
                  className="bg-secondary rounded px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-[var(--color-accent-red)] text-white font-medium text-sm"
              >
                Save
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Meal log list */}
      <div className="space-y-2">
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No meals logged for this day.</p>
        ) : (
          logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--color-accent-red)] uppercase">
                      {log.meal_type}
                    </span>
                    <span className="text-sm">{log.description}</span>
                  </div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">
                    {log.calories}cal &middot; {Number(log.protein_g).toFixed(0)}p &middot;{" "}
                    {Number(log.fat_g).toFixed(0)}f &middot; {Number(log.carbs_g).toFixed(0)}c
                  </div>
                </div>
                <button
                  onClick={() => deleteLog(log.id)}
                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
