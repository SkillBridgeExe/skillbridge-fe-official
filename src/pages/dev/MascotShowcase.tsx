import { useState } from "react";
import { MascotSticker, type MascotState } from "@/components/mascot/MascotSticker";
import {
  useMascotLoading,
  useMascotVideoLoading,
  useMascotLaptop1Loading,
  useMascotSuccess,
  useMascotLove,
  useMascotTip,
} from "@/hooks/useMascot";
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
  { state: "video_loading", label: "Video Dolphin", desc: "video dolphin.mp4" },
  { state: "video_laptop1", label: "Video Laptop 1 (Mới)", desc: "video laptop1.mp4" },
  { state: "tip", label: "Gợi ý AI", desc: "lightbulb · float + pop" },
  { state: "success", label: "Success", desc: "thumbs-up · nảy ăn mừng" },
  { state: "love", label: "Yêu thích", desc: "hearts · nhịp tim + lắc" },
  { state: "idle", label: "Idle", desc: "lắc lư thở nhẹ" },
];

export default function MascotShowcase() {
  const [active, setActive] = useState<MascotState>("loading");
  const { show: showLoading, hide: hideLoading } = useMascotLoading();
  const { show: showVideoLoading, hide: hideVideoLoading } = useMascotVideoLoading();
  const { show: showLaptop1Loading, hide: hideLaptop1Loading } = useMascotLaptop1Loading();
  const { celebrate } = useMascotSuccess();
  const { love } = useMascotLove();
  const { showTip } = useMascotTip();

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
          <div className="flex h-[420px] items-end justify-center">
            <MascotSticker state={active} size={380} />
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

        {/* Hook demo — global overlay driven by the 4 hooks */}
        <div className="mb-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-1 text-lg font-bold text-slate-800">4 Hook gọi cá heo từ bất kỳ đâu</h2>
          <p className="mb-4 text-sm text-slate-500">
            Bấm thử — overlay global (mount 1 lần ở App) sẽ hiện cá heo tương ứng.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                showLoading("AI đang quét CV của bạn...");
                setTimeout(() => hideLoading(), 3000);
              }}
              className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-600"
            >
              useMascotLoading() — quét 3s (Ảnh)
            </button>
            <button
              type="button"
              onClick={() => {
                showVideoLoading("AI đang phân tích dữ liệu chuyên sâu...");
                setTimeout(() => hideVideoLoading(), 3000);
              }}
              className="rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:from-teal-600 hover:to-blue-700 shadow-md transition-all"
            >
              useMascotVideoLoading() — quét 3s (Dolphin)
            </button>
            <button
              type="button"
              onClick={() => {
                showLaptop1Loading("AI đang tải dữ liệu Laptop 1...");
                setTimeout(() => hideLaptop1Loading(), 3000);
              }}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:from-purple-600 hover:to-indigo-700 shadow-md transition-all"
            >
              useMascotLaptop1Loading() — quét 3s (Laptop 1)
            </button>
            <button
              type="button"
              onClick={() => celebrate("Hoàn thành! CV của bạn 85 điểm 🎉")}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600"
            >
              useMascotSuccess()
            </button>
            <button
              type="button"
              onClick={() => love("Cảm ơn bạn đã yêu thích ❤️")}
              className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-600"
            >
              useMascotLove()
            </button>
            <button
              type="button"
              onClick={() => showTip("Mẹo: thêm số liệu vào mỗi bullet để CV mạnh hơn.")}
              className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600"
            >
              useMascotTip()
            </button>
          </div>
        </div>

        {/* All states side by side */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-7">
          {STATES.map((s) => (
            <div
              key={s.state}
              className="flex flex-col items-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex h-56 items-end">
                <MascotSticker state={s.state} size={180} />
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
