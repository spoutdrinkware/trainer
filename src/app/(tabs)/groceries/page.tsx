"use client";

import { useState } from "react";
import { Check, Share2, ShoppingCart } from "lucide-react";
import { getWeekStart } from "@/lib/constants";
import { getWeekLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface GroceryItem {
  name: string;
  checked: boolean;
}

interface GroceryCategory {
  title: string;
  items: GroceryItem[];
}

const INITIAL_GROCERIES: GroceryCategory[] = [
  {
    title: "Proteins",
    items: [
      { name: "Canned tuna (4-pack)", checked: false },
      { name: "Ground beef 85/15 (2 lb)", checked: false },
      { name: "Shrimp frozen (1 lb)", checked: false },
      { name: "Salmon filets (2)", checked: false },
      { name: "Eggs (18-ct)", checked: false },
    ],
  },
  {
    title: "Dairy & Cheese",
    items: [
      { name: "Sharp cheddar block", checked: false },
      { name: "Parmesan shredded", checked: false },
    ],
  },
  {
    title: "Produce",
    items: [
      { name: "Baby spinach (5oz)", checked: false },
      { name: "Zucchini (3)", checked: false },
      { name: "Bell peppers (3)", checked: false },
      { name: "Cucumber (2)", checked: false },
      { name: "Premade salad bag", checked: false },
      { name: "Lemons (3)", checked: false },
    ],
  },
  {
    title: "Nuts & Fats",
    items: [
      { name: "Mixed nuts unsalted (no cashews/pistachios)", checked: false },
      { name: "Avocado (2)", checked: false },
    ],
  },
];

export default function GroceriesPage() {
  const [categories, setCategories] = useState<GroceryCategory[]>(INITIAL_GROCERIES);
  const [copied, setCopied] = useState(false);
  const weekStart = getWeekStart();
  const weekLabel = getWeekLabel(new Date());

  function toggleItem(catIndex: number, itemIndex: number) {
    setCategories((prev) =>
      prev.map((cat, ci) =>
        ci === catIndex
          ? {
              ...cat,
              items: cat.items.map((item, ii) =>
                ii === itemIndex ? { ...item, checked: !item.checked } : item
              ),
            }
          : cat
      )
    );
  }

  function shareList() {
    const unchecked = categories
      .flatMap((cat) =>
        cat.items.filter((item) => !item.checked).map((item) => `- ${item.name}`)
      )
      .join("\n");

    const text = `Grocery List — ${weekLabel}\n\n${unchecked}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function orderInstacart() {
    const unchecked = categories
      .flatMap((cat) => cat.items.filter((item) => !item.checked).map((item) => item.name))
      .join(", ");
    window.open(
      `https://www.instacart.com/store/s?query=${encodeURIComponent(unchecked)}`,
      "_blank"
    );
  }

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const checkedItems = categories.reduce(
    (s, c) => s + c.items.filter((i) => i.checked).length,
    0
  );

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Grocery List</h1>
          <p className="text-xs text-[#6b7280] mt-0.5">{weekLabel}</p>
        </div>
        <button
          onClick={shareList}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111118] border border-[#1e1e2e] text-sm font-bold text-[#6b7280] hover:text-white transition-colors"
        >
          <Share2 className="w-4 h-4" />
          {copied ? "Copied!" : "Share List"}
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-[#1e1e2e] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#22c55e] progress-bar"
            style={{ width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs font-mono text-[#6b7280]">
          {checkedItems}/{totalItems}
        </span>
      </div>

      {/* Categories */}
      {categories.map((cat, catIndex) => (
        <div key={cat.title}>
          <h2 className="text-[10px] font-black text-[#c8441a] uppercase tracking-[0.2em] mb-3 px-1">
            {cat.title}
          </h2>
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden divide-y divide-[#1e1e2e]">
            {cat.items.map((item, itemIndex) => (
              <button
                key={item.name}
                onClick={() => toggleItem(catIndex, itemIndex)}
                className="flex items-center gap-3 w-full text-left px-4 py-3.5 transition-all hover:bg-white/[0.02] active:scale-[0.99]"
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                    item.checked ? "bg-[#22c55e]" : "border-2 border-[#1e1e2e]"
                  }`}
                >
                  {item.checked && <Check className="w-3 h-3 text-white" />}
                </div>
                <span
                  className={`text-sm font-medium ${
                    item.checked ? "line-through text-[#6b7280]" : "text-white"
                  }`}
                >
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Order button */}
      <button
        onClick={orderInstacart}
        className="w-full py-3.5 rounded-2xl bg-[#c8441a] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#e05a2e] transition-colors active:scale-[0.98]"
      >
        <ShoppingCart className="w-4 h-4" />
        Order on Instacart
      </button>
    </div>
  );
}
