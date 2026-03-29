import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase env vars not configured");
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(req: Request) {
  const { meals, workouts, userId, weekStart } = await req.json();

  if (!userId || !weekStart) {
    return Response.json({ success: false, errors: [{ type: "validation", error: "Missing userId or weekStart" }] }, { status: 400 });
  }

  const errors: { type: string; error: string }[] = [];

  if (meals?.length) {
    // Delete existing meals for this week
    const { error: delErr } = await getSupabase()
      .from("meal_plans")
      .delete()
      .eq("user_id", userId)
      .eq("week_start", weekStart);
    if (delErr) errors.push({ type: "delete_meals", error: delErr.message });

    const { error: insErr } = await getSupabase().from("meal_plans").insert(
      meals.map((m: Record<string, unknown>) => ({
        user_id: userId,
        week_start: weekStart,
        day_of_week: m.day_of_week,
        meal_type: m.meal_type,
        title: m.title,
        recipe_json: m.recipe_json,
      }))
    );
    if (insErr) errors.push({ type: "insert_meals", error: insErr.message });
  }

  if (workouts?.length) {
    const { error: delErr } = await getSupabase()
      .from("workouts")
      .delete()
      .eq("user_id", userId)
      .eq("week_start", weekStart);
    if (delErr) errors.push({ type: "delete_workouts", error: delErr.message });

    const { error: insErr } = await getSupabase().from("workouts").insert(
      workouts.map((w: Record<string, unknown>) => ({
        user_id: userId,
        week_start: weekStart,
        day_of_week: w.day_of_week,
        session: w.session,
        name: w.name,
        environment: w.environment,
        exercises_json: w.exercises_json,
        completed: false,
      }))
    );
    if (insErr) errors.push({ type: "insert_workouts", error: insErr.message });
  }

  if (errors.length) {
    console.error("[save-plan] errors:", errors);
    return Response.json({ success: false, errors }, { status: 500 });
  }

  return Response.json({
    success: true,
    saved: { meals: meals?.length || 0, workouts: workouts?.length || 0 },
  });
}
