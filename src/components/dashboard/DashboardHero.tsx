import { cn } from "@/lib/utils";
import { useState } from "react";
import type { DashboardUser } from "@/lib/mock-data/dashboard";

interface DashboardHeroProps {
  user: DashboardUser;
  isAvatarLoading?: boolean;
}

export default function DashboardHero({ user, isAvatarLoading }: DashboardHeroProps) {
  const initials = user.name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SK";

  const [imgError, setImgError] = useState(false);
  const showImg = user.avatar && !imgError && !isAvatarLoading;

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 p-8 md:p-10 text-white shadow-sm">
      {/* Decorative circles */}
      <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-white/5 blur-xl" />

      <div className="relative flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        {/* Left: Avatar + greeting */}
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
            {showImg ? (
              <img
                src={user.avatar}
                alt={user.name}
                onError={() => setImgError(true)}
                className="w-20 h-20 rounded-full object-cover flex-shrink-0 border-[3px] border-white/40 shadow-lg bg-white/20"
              />
            ) : (
              <div className={cn(
                "w-20 h-20 rounded-full flex-shrink-0 border-[3px] border-white/40 shadow-lg flex items-center justify-center text-2xl font-bold select-none",
                isAvatarLoading ? "bg-white/20 animate-pulse" : "bg-white/25"
              )}>
                {!isAvatarLoading && initials}
              </div>
            )}

          <div className="space-y-1.5 min-w-0 flex-1">
            <h1 className="text-2xl md:text-[48px] font-poppins font-bold tracking-normal leading-normal py-1 truncate">
              Hi {user.name}
            </h1>
            <p className="text-white/80 text-base font-medium opacity-90 truncate">
              Keep pushing forward — hard work pays off!
            </p>
          </div>
        </div>

        {/* Right: Metric boxes + CTA */}
        <div className="flex items-center gap-3 flex-wrap justify-start xl:justify-end shrink-0">
          <MetricBox label="CV Match" value={`${user.cvMatchScore}%`} />
          <MetricBox label="Skill Score" value={`${user.skillMatchScore}%`} />
          <MetricBox label="Goal" value={user.careerGoal} isText />
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
    <div className="bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md rounded-xl px-4 py-3 min-w-[90px] border border-white/10">
      <p className="text-xs text-white/70 font-bold uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          "font-bold text-white",
          isText ? "text-sm md:text-base leading-tight max-w-[140px]" : "text-2xl md:text-3xl"
        )}
      >
        {value}
      </p>
    </div>
  );
}
