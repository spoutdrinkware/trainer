export const USER_ID = "logan";
export const START_DATE = new Date("2026-03-30");
export const BEACH_DATE = new Date("2026-05-14");
export const LOCATION = { lat: 35.1154, lon: -80.7181, name: "Matthews, NC" };

export const MACRO_TARGETS = {
  calories: 2100,
  protein: 185,
  fat: 150,
  carbs: 25,
};

export const CHECKLIST_ITEMS = [
  "Workout 1 (outdoor)",
  "Workout 2",
  "Follow diet",
  "Drink 1 gallon water",
  "Read 10 pages",
  "Progress photo",
];

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MEAL_TYPES = ["Breakfast", "Lunch", "Snack", "Dinner"] as const;

export function getDayNumber(): number {
  const now = new Date();
  const start = new Date(START_DATE);
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff + 1);
}

export function getDaysUntilBeach(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const beach = new Date(BEACH_DATE);
  beach.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((beach.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

export function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export const USER_PROFILE = `Name: Logan, 30M, 210lbs, 5'11", new dad (4-month-old son), former athlete (football RB + lacrosse defense)
75 Hard start date: March 30, 2026. Beach trip goal: May 14, 2026.
Location: Matthews, NC (lat 35.1154, lon -80.7181)
Diet: Keto + Low FODMAP, under 25g net carbs/day.
Restrictions: No garlic, onion, cashews, pistachios, stone fruits, large portions of cauliflower or avocado.
Safe proteins: eggs, beef, chicken thighs, salmon, shrimp, pork, turkey, bacon, sardines.
Safe fats: butter, ghee, olive oil, coconut oil, MCT oil, tallow, macadamia nuts, pecans, walnuts, cheddar, parmesan, cream cheese, heavy cream, sour cream.
Safe veggies: spinach, kale, zucchini, bell peppers, cucumber, green beans, bok choy, arugula, lettuce, small portions of broccoli, tomatoes (limited).
Condiments: mustard, hot sauce (no sugar), coconut aminos, fish sauce, herbs (basil, oregano, thyme, rosemary, cumin, paprika, turmeric).
Meal targets: ~2100 cal/day, 185g protein, 150g fat, <25g net carbs.
Workout preferences: Former athlete, enjoys lifting heavy. Needs AM outdoor session (walk/run/ruck with baby-friendly options) + PM gym session. Has access to a home gym and commercial gym.
Goals: Lose fat, build muscle, complete 75 Hard, look great for beach trip.`;
