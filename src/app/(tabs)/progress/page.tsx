"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { USER_ID, todayString, CHECKLIST_ITEMS } from "@/lib/constants";
import { Scale, Camera, Flame, TrendingDown, ImageIcon } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const dynamic = "force-dynamic";

interface WeightLog {
  date: string;
  weight_lbs: number;
}

interface ProgressPhoto {
  id: string;
  date: string;
  storage_url: string;
  notes: string;
}

export default function ProgressPage() {
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [streak, setStreak] = useState(0);
  const [uploading, setUploading] = useState(false);
  const today = todayString();

  const loadWeights = useCallback(async () => {
    const { data } = await supabase
      .from("weight_logs")
      .select("date, weight_lbs")
      .eq("user_id", USER_ID)
      .order("date");
    if (data) setWeights(data.map((d) => ({ ...d, weight_lbs: Number(d.weight_lbs) })));
  }, []);

  const loadPhotos = useCallback(async () => {
    const { data } = await supabase
      .from("progress_photos")
      .select("*")
      .eq("user_id", USER_ID)
      .order("date", { ascending: false })
      .limit(20);
    if (data) setPhotos(data);
  }, []);

  const calcStreak = useCallback(async () => {
    const { data } = await supabase
      .from("checklist_logs")
      .select("date, completed")
      .eq("user_id", USER_ID)
      .eq("completed", true)
      .order("date", { ascending: false });

    if (!data || data.length === 0) { setStreak(0); return; }

    const byDate: Record<string, number> = {};
    data.forEach((row) => { byDate[row.date] = (byDate[row.date] || 0) + 1; });

    let count = 0;
    const d = new Date();
    d.setHours(0, 0, 0, 0);

    while (true) {
      const dateStr = d.toISOString().split("T")[0];
      if ((byDate[dateStr] || 0) >= CHECKLIST_ITEMS.length) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    setStreak(count);
  }, []);

  useEffect(() => {
    loadWeights();
    loadPhotos();
    calcStreak();
  }, [loadWeights, loadPhotos, calcStreak]);

  async function logWeight(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weightInput);
    if (!w || w < 50 || w > 500) return;

    const { data: existing } = await supabase
      .from("weight_logs")
      .select("id")
      .eq("user_id", USER_ID)
      .eq("date", today)
      .maybeSingle();

    if (existing) {
      await supabase.from("weight_logs").update({ weight_lbs: w }).eq("id", existing.id);
    } else {
      await supabase.from("weight_logs").insert({ user_id: USER_ID, date: today, weight_lbs: w });
    }
    setWeightInput("");
    loadWeights();
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${USER_ID}/${today}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("progress-photos").upload(path, file);

    if (!error) {
      const { data: urlData } = supabase.storage.from("progress-photos").getPublicUrl(path);
      await supabase.from("progress_photos").insert({
        user_id: USER_ID, date: today, storage_url: urlData.publicUrl, notes: "",
      });
      loadPhotos();
    }
    setUploading(false);
  }

  const chartData = weights.map((w) => ({ date: w.date.slice(5), lbs: w.weight_lbs }));
  const startWeight = weights.length > 0 ? weights[0].weight_lbs : 210;
  const currentWeight = weights.length > 0 ? weights[weights.length - 1].weight_lbs : null;
  const totalLost = currentWeight ? startWeight - currentWeight : 0;

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-lg mx-auto">
      <h1 className="text-xl font-black text-white">Progress</h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, label: "Day Streak", value: streak, color: "#c8441a" },
          { icon: Scale, label: "Current lbs", value: currentWeight ?? "--", color: "#3b82f6" },
          { icon: TrendingDown, label: "lbs Lost", value: totalLost > 0 ? `-${totalLost.toFixed(1)}` : "--", color: "#22c55e" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-4 text-center">
            <stat.icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
            <div className="stat-number text-2xl text-white">{stat.value}</div>
            <div className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Weight input */}
      <form onSubmit={logWeight} className="flex gap-2">
        <input
          type="number"
          step="0.1"
          placeholder="Today's weight (lbs)"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          className="flex-1 bg-[#111118] border border-[#1e1e2e] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-[#6b7280]"
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-2xl bg-[#c8441a] text-white font-bold text-sm hover:bg-[#e05a2e] transition-colors"
        >
          Log
        </button>
      </form>

      {/* Weight chart */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-4">Weight Trend</h2>
        {chartData.length < 2 ? (
          <div className="text-center py-8 text-[#6b7280]">
            <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Log at least 2 days to see your trend.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} stroke="#1e1e2e" />
              <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10, fill: "#6b7280" }} stroke="#1e1e2e" />
              <Tooltip
                contentStyle={{
                  background: "#111118",
                  border: "1px solid #1e1e2e",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "#ffffff",
                }}
              />
              <Line type="monotone" dataKey="lbs" stroke="#c8441a" strokeWidth={2.5} dot={{ fill: "#c8441a", r: 3, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Photo upload */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-4 h-4 text-[#c8441a]" />
          <h2 className="text-sm font-bold text-white">Progress Photos</h2>
        </div>

        <label className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#1e1e2e] rounded-xl cursor-pointer hover:border-[#c8441a]/50 transition-colors">
          <input type="file" accept="image/*" capture="environment" onChange={uploadPhoto} className="hidden" />
          {uploading ? (
            <span className="text-sm text-[#6b7280]">Uploading...</span>
          ) : (
            <>
              <Camera className="w-4 h-4 text-[#6b7280]" />
              <span className="text-sm text-[#6b7280]">Take or upload photo</span>
            </>
          )}
        </label>

        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#0a0a0f] border border-[#1e1e2e]">
                <img src={photo.storage_url} alt={`Progress ${photo.date}`} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] font-mono text-white px-2 py-1 text-center">
                  {photo.date}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#6b7280] mt-3">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No photos yet. Start tracking your transformation!</p>
          </div>
        )}
      </div>
    </div>
  );
}
