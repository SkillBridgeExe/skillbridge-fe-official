import { cn } from "@/lib/utils";

export type InterviewerVoiceState = "LISTENING" | "THINKING" | "SPEAKING";

interface InterviewVoiceOrbProps {
  state: InterviewerVoiceState;
  label: string;
  subtitle?: string;
}

export function InterviewVoiceOrb({ state, label, subtitle }: InterviewVoiceOrbProps) {
  const speaking = state === "SPEAKING";
  const thinking = state === "THINKING";

  return (
    <div className="flex flex-col items-center text-center" aria-live="polite">
      <div
        className={cn(
          "relative flex h-28 w-28 items-center justify-center rounded-full border bg-slate-950 shadow-[0_18px_55px_-20px_rgba(14,165,233,.65)] motion-reduce:transition-none",
          speaking && "border-cyan-300",
          thinking && "border-blue-400 animate-pulse motion-reduce:animate-none",
          state === "LISTENING" && "border-emerald-400/70",
        )}
        aria-label={label}
      >
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-500/30 via-blue-500/15 to-violet-500/20" />
        <div className="relative flex h-14 items-center gap-1" aria-hidden="true">
          {[14, 28, 42, 32, 20].map((height, index) => (
            <span
              key={height}
              className={cn(
                "w-1.5 rounded-full bg-cyan-300 transition-[height] duration-300 motion-reduce:transition-none",
                speaking && "animate-pulse motion-reduce:animate-none",
              )}
              style={{ height: speaking ? `${height}px` : `${Math.max(8, height / 3)}px`, animationDelay: `${index * 90}ms` }}
            />
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm font-bold text-slate-900">{label}</p>
      {subtitle && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-600" aria-live="polite">
          {subtitle}
        </p>
      )}
    </div>
  );
}
