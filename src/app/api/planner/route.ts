import Anthropic from "@anthropic-ai/sdk";
import { LOCATION, USER_PROFILE, MACRO_TARGETS } from "@/lib/constants";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

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

const SYSTEM_PROMPT = `You are Logan's personal 75 Hard coach and meal/workout planner. You know his full profile:

${USER_PROFILE}

Macro targets: ${MACRO_TARGETS.calories} cal, ${MACRO_TARGETS.protein}g protein, ${MACRO_TARGETS.fat}g fat, <${MACRO_TARGETS.carbs}g net carbs.

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

IMPORTANT RULES:
- ALL meals must be keto + low FODMAP compliant
- NO garlic, onion, cashews, pistachios, stone fruits, large portions of cauliflower or avocado
- Each day's meals should total close to the macro targets
- AM workout must be outdoor (baby-friendly when possible)
- PM workout is gym/indoor focused
- Include a mix of strength training and cardio
- Consider the weather forecast for outdoor workout planning
- Always include a grocery_list with all needed ingredients

After the JSON block, add a brief coach's note with tips and motivation.`;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const weather = await getWeather();

  const systemContent = `${SYSTEM_PROMPT}\n\nCurrent 7-day weather forecast for ${LOCATION.name}:\n${weather}`;

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6-20250514",
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
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
          );
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
