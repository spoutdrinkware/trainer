"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

    if (!data || data.length === 0) {
      setStreak(0);
      return;
    }

    // Group by date, count completed items per day
    const byDate: Record<string, number> = {};
    data.forEach((row) => {
      byDate[row.date] = (byDate[row.date] || 0) + 1;
    });

    // Count consecutive days where all 6 items were completed
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
      await supabase
        .from("weight_logs")
        .update({ weight_lbs: w })
        .eq("id", existing.id);
    } else {
      await supabase.from("weight_logs").insert({
        user_id: USER_ID,
        date: today,
        weight_lbs: w,
      });
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

    const { error } = await supabase.storage
      .from("progress-photos")
      .upload(path, file);

    if (!error) {
      const { data: urlData } = supabase.storage
        .from("progress-photos")
        .getPublicUrl(path);

      await supabase.from("progress_photos").insert({
        user_id: USER_ID,
        date: today,
        storage_url: urlData.publicUrl,
        notes: "",
      });

      loadPhotos();
    }
    setUploading(false);
  }

  const chartData = weights.map((w) => ({
    date: w.date.slice(5),
    lbs: w.weight_lbs,
  }));

  const startWeight = weights.length > 0 ? weights[0].weight_lbs : 210;
  const currentWeight = weights.length > 0 ? weights[weights.length - 1].weight_lbs : null;
  const totalLost = currentWeight ? startWeight - currentWeight : 0;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold">Progress</h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <Flame className="w-5 h-5 mx-auto text-[var(--color-accent-red)] mb-1" />
            <div className="text-2xl font-bold">{streak}</div>
            <div className="text-[10px] text-muted-foreground">Day Streak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <Scale className="w-5 h-5 mx-auto text-[var(--color-accent-red)] mb-1" />
            <div className="text-2xl font-bold">{currentWeight ?? "--"}</div>
            <div className="text-[10px] text-muted-foreground">Current lbs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <TrendingDown className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold">{totalLost > 0 ? `-${totalLost.toFixed(1)}` : "--"}</div>
            <div className="text-[10px] text-muted-foreground">lbs Lost</div>
          </CardContent>
        </Card>
      </div>

      {/* Weight input */}
      <form onSubmit={logWeight} className="flex gap-2">
        <input
          type="number"
          step="0.1"
          placeholder="Today's weight (lbs)"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          className="flex-1 bg-secondary rounded-lg px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg bg-[var(--color-accent-red)] text-white font-medium text-sm"
        >
          Log
        </button>
      </form>

      {/* Weight chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Weight Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length < 2 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Log at least 2 days to see your trend.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#8b949e" }}
                  stroke="rgba(255,255,255,0.06)"
                />
                <YAxis
                  domain={["dataMin - 2", "dataMax + 2"]}
                  tick={{ fontSize: 10, fill: "#8b949e" }}
                  stroke="rgba(255,255,255,0.06)"
                />
                <Tooltip
                  contentStyle={{
                    background: "#161b22",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="lbs"
                  stroke="#c8441a"
                  strokeWidth={2}
                  dot={{ fill: "#c8441a", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Photo upload */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="w-4 h-4" /> Progress Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-[var(--color-accent-red)] transition-colors">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={uploadPhoto}
              className="hidden"
            />
            {uploading ? (
              <span className="text-sm text-muted-foreground">Uploading...</span>
            ) : (
              <>
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Take or upload photo</span>
              </>
            )}
          </label>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
                  <img
                    src={photo.storage_url}
                    alt={`Progress ${photo.date}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white px-1.5 py-0.5 text-center">
                    {photo.date}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm mt-3">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No photos yet. Start tracking your transformation!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
