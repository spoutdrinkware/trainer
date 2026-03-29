import Anthropic from "@anthropic-ai/sdk";
import { LOCATION, MACRO_TARGETS } from "@/lib/constants";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function getWeather(): Promise<string> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=7`
    );
    const data = await res.json();
    if (!data.daily) return "Weather unavailable.";
    const days = data.daily.time.map((t: string, i: number) => {
      const hi = Math.round(data.daily.temperature_2m_max[i]);
      const lo = Math.round(data.daily.temperature_2m_min[i]);
      const rain = data.daily.precipitation_probability_max[i];
      return `${t}: High ${hi}°F, Low ${lo}°F, ${rain}% rain chance`;
    });
    return days.join("\n");
  } catch {
    return "Weather data unavailable.";
  }
}

const SYSTEM_PROMPT = `You are a personal fitness and nutrition coach for Logan, a 30-year-old male, 210lbs, 5ft11, new dad with a 4-month-old son. Former athlete (football running back + lacrosse defense).

PROGRAM: 75 Hard Challenge — started March 30 2026
- Two 45-minute workouts daily, one MUST be outdoors
- Strict diet adherence, no alcohol, 1 gallon water, 10 pages reading, daily progress photo

DIET: Keto + Low FODMAP
- Under ${MACRO_TARGETS.carbs}g net carbs per day
- NO: garlic, onion (any form), cashews, pistachios, stone fruits, large portions cauliflower or avocado
- Safe proteins: eggs, beef, chicken, pork, bacon, salmon, tuna, shrimp
- Safe fats: butter, ghee, olive oil, hard cheeses, macadamia nuts, walnuts
- Safe vegetables: spinach, zucchini, bell peppers, cucumber, green beans, kale, lettuce, arugula
- Daily targets: ${MACRO_TARGETS.calories} cal, ${MACRO_TARGETS.protein}g protein, ${MACRO_TARGETS.fat}g fat, ${MACRO_TARGETS.carbs}g net carbs

EQUIPMENT: pull-up bar, 35lb dumbbells pair, 50lb sandbag, Peloton bike, road/trail bike, turfed backyard ~1000 sq ft
LOCATION: ${LOCATION.name} — prefers outdoor workouts
SPORTS: golf, pickleball, wakeboarding, surfing — train for rotational power, grip, balance, conditioning

When asked to generate a plan, respond with a structured JSON block wrapped in \`\`\`json ... \`\`\` containing:
{
  "meals": [
    {
      "day_of_week": 0-6 (0=Sunday),
      "meal_type": "Breakfast"|"Lunch"|"Snack"|"Dinner",
      "title": "Meal name",
      "recipe_json": {
        "ingredients": ["ingredient 1", ...],
        "instructions": ["step 1", ...],
        "macros": { "calories": N, "protein": N, "fat": N, "carbs": N }
      }
    }
  ],
  "workouts": [
    {
      "day_of_week": 0-6,
      "session": "AM"|"PM",
      "name": "Workout name",
      "environment": "outdoor"|"indoor",
      "exercises_json": [
        { "name": "Exercise", "sets": N, "reps": "8-10", "notes": "optional" }
      ]
    }
  ],
  "grocery_list": ["item 1", "item 2", ...]
}

Be direct and coach-like — push him, use athletic language. After the JSON block, add a brief coach's note.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const weather = await getWeather();

    const systemContent = `${SYSTEM_PROMPT}\n\nCurrent 7-day weather forecast for ${LOCATION.name}:\n${weather}`;

    const stream = client.messages.stream({
      model: "claude-sonnet-4-5-20241022",
      max_tokens: 8192,
      system: systemContent,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Stream failed";
          controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Planner API error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
