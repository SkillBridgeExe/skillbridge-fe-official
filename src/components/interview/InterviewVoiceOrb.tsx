import { cn } from "@/lib/utils";

export type InterviewerVoiceState = "LISTENING" | "THINKING" | "SPEAKING";

interface InterviewVoiceOrbProps {
  state: InterviewerVoiceState;
  label: string;
  variant?: "default" | "compact";
}

export function InterviewVoiceOrb({
  state,
  label,
  variant = "default",
}: InterviewVoiceOrbProps) {
  const speaking = state === "SPEAKING";
  const thinking = state === "THINKING";
  const compact = variant === "compact";

  return (
    <div className="flex flex-col items-center text-center" aria-live="polite">
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full border bg-slate-950 shadow-[0_18px_55px_-20px_rgba(14,165,233,.65)] motion-reduce:transition-none",
          compact ? "h-16 w-16 md:h-20 md:w-20" : "h-28 w-28",
          speaking && "border-cyan-300",
          thinking && "border-blue-400 animate-pulse motion-reduce:animate-none",
          state === "LISTENING" && "border-emerald-400/70",
        )}
        aria-label={label}
      >
        <div
          className={cn(
            "absolute rounded-full bg-gradient-to-br from-cyan-500/30 via-blue-500/15 to-violet-500/20",
            compact ? "inset-2" : "inset-3",
          )}
        />
        <div
          className={cn(
            "relative flex items-center",
            compact ? "h-10 gap-0.5" : "h-14 gap-1",
          )}
          aria-hidden="true"
        >
          {[14, 28, 42, 32, 20].map((height, index) => (
            <span
              key={height}
              className={cn(
                "rounded-full bg-cyan-300 transition-[height] duration-300 motion-reduce:transition-none",
                compact ? "w-1" : "w-1.5",
                speaking && "animate-pulse motion-reduce:animate-none",
              )}
              style={{
                height: speaking
                  ? `${compact ? Math.max(8, height * 0.65) : height}px`
                  : `${Math.max(6, height / (compact ? 4 : 3))}px`,
                animationDelay: `${index * 90}ms`,
              }}
            />
          ))}
        </div>
      </div>
      <p
        className={cn(
          "font-bold",
          compact ? "mt-2 text-xs text-white" : "mt-4 text-sm text-slate-900",
        )}
      >
        {label}
      </p>
    </div>
  );
}
