import { useState } from "react";
import { MascotSticker, type MascotState } from "@/components/mascot/MascotSticker";
import { cn } from "@/lib/utils";

/**
 * Dev-only showcase for the animated SkillBridge mascot.
 * Visit /mascot during `npm run dev` to preview every animated state.
 *
 * This page is a playground — not part of the product nav. Safe to delete once
 * the mascot is wired into real surfaces (loading overlay, success toasts, etc.).
 */
const STATES: { state: MascotState; label: string; desc: string }[] = [
  { state: "loading", label: "Loading / Quét CV", desc: "laptop · nhún theo nhịp gõ" },
  { state: "tip", label: "Gợi ý AI", desc: "lightbulb · float + pop" },
  { state: "success", label: "Success", desc: "thumbs-up · nảy ăn mừng" },
  { state: "love", label: "Yêu thích", desc: "hearts · nhịp tim + lắc" },
  { state: "idle", label: "Idle", desc: "lắc lư thở nhẹ" },
];

export default function MascotShowcase() {
  const [active, setActive] = useState<MascotState>("loading");

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            SkillBridge Mascot — Animation Showcase
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Framer Motion · 4 pose PNG nền trong · whole-image motion (Tier 1, chưa cắt part)
          </p>
        </header>

        {/* Big interactive stage */}
        <div className="mb-10 flex flex-col items-center rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
          <div className="flex h-64 items-end justify-center">
            <MascotSticker state={active} size={230} />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {STATES.map((s) => (
              <button
                key={s.state}
                type="button"
                onClick={() => setActive(s.state)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  active === s.state
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-sky-300",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">Di chuột / bấm vào cá heo để xem gesture (hover + tap)</p>
        </div>

        {/* All states side by side */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {STATES.map((s) => (
            <div
              key={s.state}
              className="flex flex-col items-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex h-40 items-end">
                <MascotSticker state={s.state} size={130} />
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm font-semibold text-slate-700">{s.label}</div>
                <div className="text-xs text-slate-400">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
