"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { USER_ID, getWeekStart, DAYS } from "@/lib/constants";
import {
  Send,
  Save,
  ShoppingCart,
  Loader2,
  Sparkles,
  UtensilsCrossed,
  Dumbbell,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PlanData {
  meals?: {
    day_of_week: number;
    meal_type: string;
    title: string;
    recipe_json: {
      ingredients?: string[];
      instructions?: string[];
      macros?: { calories?: number; protein?: number; fat?: number; carbs?: number };
    };
  }[];
  workouts?: {
    day_of_week: number;
    session: string;
    name: string;
    environment: string;
    exercises_json: { name: string; sets?: number; reps?: string; notes?: string }[];
  }[];
  grocery_list?: string[];
}

function extractPlan(text: string): PlanData | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export default function PlannerPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const plan = lastAssistant ? extractPlan(lastAssistant.content) : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantContent += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                  return updated;
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  async function savePlan() {
    if (!plan) return;
    setSaving(true);
    const weekStart = getWeekStart();

    if (plan.meals && plan.meals.length > 0) {
      await supabase.from("meal_plans").delete().eq("user_id", USER_ID).eq("week_start", weekStart);
      await supabase.from("meal_plans").insert(
        plan.meals.map((m) => ({
          user_id: USER_ID, week_start: weekStart, day_of_week: m.day_of_week,
          meal_type: m.meal_type, title: m.title, recipe_json: m.recipe_json,
        }))
      );
    }

    if (plan.workouts && plan.workouts.length > 0) {
      await supabase.from("workouts").delete().eq("user_id", USER_ID).eq("week_start", weekStart);
      await supabase.from("workouts").insert(
        plan.workouts.map((w) => ({
          user_id: USER_ID, week_start: weekStart, day_of_week: w.day_of_week,
          session: w.session, name: w.name, environment: w.environment, exercises_json: w.exercises_json,
        }))
      );
    }

    setSaving(false);
    alert("Plan saved! Check Meals and Workouts tabs.");
  }

  function orderGroceries() {
    if (!plan?.grocery_list?.length) return;
    const query = plan.grocery_list.join(", ");
    window.open(`https://www.instacart.com/store/s?query=${encodeURIComponent(query)}`, "_blank");
  }

  function displayContent(content: string): string {
    return content.replace(/```json[\s\S]*?```/g, "").trim();
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#c8441a]/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-[#c8441a]" />
            </div>
            <p className="text-lg font-black text-white mb-1">AI Coach</p>
            <p className="text-sm text-[#6b7280] max-w-xs">
              Generate a weekly meal plan, workout plan, or both. I know your diet, goals, and the weather.
            </p>
            <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
              {[
                "Plan my meals and workouts for this week",
                "Give me a 5-day keto meal prep plan",
                "Design a push/pull/legs split",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="text-xs px-4 py-3 rounded-xl bg-[#111118] border border-[#1e1e2e] text-[#6b7280] hover:text-white hover:border-[#c8441a]/30 transition-all text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#c8441a] text-white rounded-br-md"
                  : "bg-[#111118] border border-[#1e1e2e] text-white rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? displayContent(msg.content) : msg.content}
              {msg.role === "assistant" && !msg.content && streaming && (
                <span className="inline-block animate-pulse text-[#6b7280]">...</span>
              )}
            </div>
          </div>
        ))}

        {/* Plan cards */}
        {plan && !streaming && (
          <div className="space-y-3">
            {plan.meals && plan.meals.length > 0 && (
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <UtensilsCrossed className="w-4 h-4 text-[#c8441a]" />
                  <span className="font-bold text-sm text-white">Meal Plan</span>
                  <span className="text-[10px] font-mono text-[#6b7280] bg-[#1e1e2e] px-2 py-0.5 rounded-full">
                    {plan.meals.length} meals
                  </span>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {DAYS.map((day, di) => {
                    const dayMeals = plan.meals!.filter((m) => m.day_of_week === di);
                    if (dayMeals.length === 0) return null;
                    return (
                      <div key={di}>
                        <div className="text-[10px] font-black text-[#6b7280] uppercase tracking-wider mb-1">{day}</div>
                        {dayMeals.map((m, mi) => (
                          <div key={mi} className="text-xs flex justify-between pl-3 py-0.5">
                            <span>
                              <span className="text-[#c8441a] font-bold">{m.meal_type}</span>{" "}
                              <span className="text-white">{m.title}</span>
                            </span>
                            {m.recipe_json?.macros && (
                              <span className="font-mono text-[#6b7280]">{m.recipe_json.macros.calories}cal</span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {plan.workouts && plan.workouts.length > 0 && (
              <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Dumbbell className="w-4 h-4 text-[#c8441a]" />
                  <span className="font-bold text-sm text-white">Workout Plan</span>
                  <span className="text-[10px] font-mono text-[#6b7280] bg-[#1e1e2e] px-2 py-0.5 rounded-full">
                    {plan.workouts.length} sessions
                  </span>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {DAYS.map((day, di) => {
                    const dayWorkouts = plan.workouts!.filter((w) => w.day_of_week === di);
                    if (dayWorkouts.length === 0) return null;
                    return (
                      <div key={di}>
                        <div className="text-[10px] font-black text-[#6b7280] uppercase tracking-wider mb-1">{day}</div>
                        {dayWorkouts.map((w, wi) => (
                          <div key={wi} className="text-xs pl-3 py-0.5">
                            <span className="text-[#c8441a] font-bold">{w.session}</span>{" "}
                            <span className="text-white">{w.name}</span>{" "}
                            <span className="text-[#6b7280]">({w.environment})</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={savePlan}
                disabled={saving}
                className="flex-1 py-3.5 rounded-2xl bg-[#c8441a] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#e05a2e] disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Plan
              </button>
              {plan.grocery_list && plan.grocery_list.length > 0 && (
                <button
                  onClick={orderGroceries}
                  className="flex-1 py-3.5 rounded-2xl bg-[#111118] border border-[#1e1e2e] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#16161f] transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Groceries
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-[#1e1e2e]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI coach..."
            className="flex-1 bg-[#111118] border border-[#1e1e2e] rounded-2xl px-4 py-3 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#c8441a]/50"
            disabled={streaming}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="p-3 rounded-2xl bg-[#c8441a] text-white disabled:opacity-30 hover:bg-[#e05a2e] transition-colors"
          >
            {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
}
