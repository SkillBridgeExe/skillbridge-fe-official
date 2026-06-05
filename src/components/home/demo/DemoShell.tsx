import { motion } from "framer-motion";
import type { ComponentType, ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import Tilt from "react-parallax-tilt";
import {
  Briefcase, FileText, GraduationCap, LayoutDashboard, MessageSquare, Users,
} from "lucide-react";

/**
 * KHUÔN CHUNG cho mọi hero demo (CV Diagnosis / Roadmap / Interview):
 * glow + parallax tilt + browser bar + scan line + sidebar đúng sản phẩm thật.
 * Mỗi demo chỉ cắm nội dung panel (children) và lớp con trỏ ma (overlay) —
 * khung, sidebar, tỉ lệ KHÔNG demo nào được tự chế khác đi.
 */

export interface XY { x: number; y: number }

/** Tâm (hoặc điểm theo tỉ lệ fx/fy) của `el`, tính theo toạ độ tương đối với `card`. */
export function relPoint(card: HTMLElement, el: HTMLElement, fx = 0.5, fy = 0.5): XY {
  const c = card.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - c.left + r.width * fx, y: r.top - c.top + r.height * fy };
}

export const SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "CV Diagnosis", icon: FileText },
  { label: "Learning Roadmaps", icon: GraduationCap },
  { label: "AI Interview", icon: MessageSquare },
  { label: "Mentorship", icon: Users },
  { label: "Job Matching", icon: Briefcase },
] as const;

export type SidebarLabel = (typeof SIDEBAR_ITEMS)[number]["label"];

interface DemoShellProps {
  /** Gắn vào div ngoài cùng — demo dùng cho useInView (pause khi cuộn khỏi màn hình). */
  containerRef: RefObject<HTMLDivElement>;
  /** Gắn vào card — mọi toạ độ con trỏ/file đo tương đối với element này. */
  cardRef: RefObject<HTMLDivElement>;
  /** Địa chỉ trên thanh browser, vd "skillbridge.ai/diagnosis". */
  url: string;
  urlIcon: ComponentType<{ className?: string }>;
  /** Mục sidebar đang active (kể chuyện điều hướng). */
  activeItem: SidebarLabel;
  /** Ref gắn vào 1 mục sidebar để con trỏ ma có toạ độ mà click. */
  sidebarItemRef?: RefObject<HTMLDivElement>;
  sidebarItemRefLabel?: SidebarLabel;
  /** Fade toàn card khi loop reset. */
  opacity: number;
  /** Lớp con trỏ ma / file kéo thả — render absolute bên trong card. */
  overlay?: ReactNode;
  children: ReactNode;
}

export default function DemoShell({
  containerRef,
  cardRef,
  url,
  urlIcon: UrlIcon,
  activeItem,
  sidebarItemRef,
  sidebarItemRefLabel,
  opacity,
  overlay,
  children,
}: DemoShellProps) {
  return (
    <div ref={containerRef} className="w-full relative z-10 px-2">
      {/* Scan line chạy bằng CSS thuần (compositor thread, 0 JS/frame) */}
      <style>{`
        @keyframes demo-scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(560px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .demo-scanline { animation: none !important; opacity: 0; }
        }
      `}</style>

      {/* Glow background effects */}
      <div className="absolute -inset-10 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 blur-[120px] rounded-full z-0 opacity-40 pointer-events-none" />

      {/* Parallax Tilt Container */}
      <Tilt
        glareEnable={true}
        glareMaxOpacity={0.04}
        glarePosition="all"
        tiltMaxAngleX={2.5}
        tiltMaxAngleY={2.5}
        scale={1.008}
        transitionSpeed={2500}
        className="w-full relative z-20 rounded-[2.2rem] p-[3px] shadow-[0_50px_100px_-20px_rgba(15,23,42,0.12),0_30px_60px_-30px_rgba(0,0,0,0.15)] transition-all duration-300"
        style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(56,189,248,0.1), rgba(99,102,241,0.08))" }}
      >
        <motion.div
          ref={cardRef}
          animate={{ opacity }}
          transition={{ duration: 0.4 }}
          className="w-full rounded-[2rem] bg-white/95 backdrop-blur-md overflow-hidden relative"
        >
          {/* Subtle light scan line running over the dashboard */}
          <div className="demo-scanline absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent z-30 pointer-events-none will-change-transform [animation:demo-scanline_6s_linear_infinite]" />

          {/* Ghost cursor / dragged file layer (per-demo) */}
          {overlay}

          {/* Browser top-bar */}
          <div className="bg-slate-50/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between border-b border-slate-100">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
              <div className="w-3 h-3 rounded-full bg-slate-300" />
            </div>
            <div className="text-xs text-slate-400 font-mono bg-white px-6 py-1.5 rounded-lg border border-slate-100/80 shadow-inner flex items-center gap-1.5">
              <UrlIcon className="w-3.5 h-3.5 text-blue-500" />
              {url}
            </div>
            <div className="w-12" />
          </div>

          {/* UI Inner body - Split Layout: Sidebar + Content */}
          <div className="flex min-h-[360px] text-left">
            {/* Sidebar — đúng điều hướng web thật, mọi demo dùng chung */}
            <div className="hidden sm:flex flex-col justify-between w-48 bg-slate-50/50 border-r border-slate-100 p-3.5 flex-shrink-0">
              <div className="space-y-5">
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.2)]">
                    <span className="font-display font-black text-xs text-white">S</span>
                  </div>
                  <span className="font-display font-black text-sm text-slate-800">SkillBridge</span>
                </div>
                <div className="space-y-1.5">
                  {SIDEBAR_ITEMS.map((item) => {
                    const isActive = item.label === activeItem;
                    return (
                      <div
                        key={item.label}
                        ref={item.label === sidebarItemRefLabel ? sidebarItemRef : undefined}
                        className={cn(
                          "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer",
                          isActive
                            ? "bg-blue-50 text-blue-600 border border-blue-100/30 shadow-[0_2px_10px_rgba(37,99,235,0.05)]"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        )}
                      >
                        <item.icon className="w-4 h-4 text-inherit" />
                        <span className="truncate">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Profile footer */}
              <div className="border-t border-slate-200/60 pt-3 flex items-center gap-2 px-1">
                <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-[10px] text-blue-600">HL</div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-slate-700 truncate leading-tight">Hoang Long</div>
                  <span className="text-[8px] text-slate-400 font-semibold uppercase leading-none">Student</span>
                </div>
              </div>
            </div>

            {/* Main panel — nội dung riêng của từng demo */}
            <div className="flex-1 min-w-0 flex flex-col">{children}</div>
          </div>
        </motion.div>
      </Tilt>
    </div>
  );
}
