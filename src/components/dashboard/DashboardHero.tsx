import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  name: string;
  avatar?: string;
  cvScore: number | null;
  jobMatchScore: number | null;
  careerGoal: string | null;
  isAvatarLoading?: boolean;
}

export default function DashboardHero({
  name,
  avatar,
  cvScore,
  jobMatchScore,
  careerGoal,
  isAvatarLoading,
}: DashboardHeroProps) {
  const initials =
    name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SK";

  const [imgError, setImgError] = useState(false);
  const showImg = avatar && !imgError && !isAvatarLoading;

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 p-5 text-white shadow-sm sm:p-6 md:p-10">
      <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/5 blur-xl" />

      <div className="relative flex flex-col items-start justify-between gap-6 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-start gap-4 md:items-center md:gap-6">
          {showImg ? (
            <img
              src={avatar}
              alt={name}
              onError={() => setImgError(true)}
              className="h-16 w-16 flex-shrink-0 rounded-full border-[3px] border-white/40 bg-white/20 object-cover shadow-lg sm:h-20 sm:w-20"
            />
          ) : (
            <div
              className={cn(
                "flex h-16 w-16 flex-shrink-0 select-none items-center justify-center rounded-full border-[3px] border-white/40 text-xl font-bold shadow-lg sm:h-20 sm:w-20 sm:text-2xl",
                isAvatarLoading ? "bg-white/20" : "bg-white/25",
              )}
            >
              {isAvatarLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-white/80" />
              ) : (
                initials
              )}
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="break-words py-1 font-poppins text-2xl font-bold leading-tight tracking-normal sm:text-3xl md:text-[48px] md:leading-normal">
              Hi {name}
            </h1>
            <p className="text-sm font-medium text-white/80 opacity-90 sm:text-base">
              Keep pushing forward - hard work pays off!
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 min-[420px]:grid-cols-3 xl:flex xl:w-auto xl:flex-wrap xl:justify-end">
          <MetricBox
            label="CV Score"
            value={cvScore == null ? "—" : `${Math.round(cvScore)}%`}
          />
          <MetricBox
            label="Job Match"
            value={
              jobMatchScore == null ? "—" : `${Math.round(jobMatchScore)}%`
            }
          />
          <MetricBox label="Goal" value={careerGoal || "Not set"} isText />
        </div>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  isText,
}: {
  label: string;
  value: string;
  isText?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md transition-colors hover:bg-white/20">
      <p className="mb-0.5 text-xs font-bold uppercase tracking-wider text-white/70">
        {label}
      </p>
      <p
        className={cn(
          "font-bold text-white",
          isText
            ? "break-words text-sm leading-tight md:max-w-[140px] md:text-base"
            : "text-2xl md:text-3xl",
        )}
      >
        {value}
      </p>
    </div>
  );
}
