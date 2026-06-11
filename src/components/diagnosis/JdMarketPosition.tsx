import { BriefcaseBusiness, CheckCircle2, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ImpliedSkill, JdMarketPosition as JdMarketPositionType, JdMarketSkill, MarketPosition } from "@shared/api";

const CARD = "bg-white border border-[#EAEAEA] rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

const POSITION_CLASS: Record<MarketPosition, string> = {
  niche: "bg-[#FBF3DB] text-[#956400] border-[#F1E5C0]",
  standard: "bg-[#EDF3EC] text-[#346538] border-[#DCE9D7]",
  common: "bg-[#F1F1EF] text-[#787774] border-[#E3E3E0]",
};

export function JdMarketPosition({ market }: { market?: JdMarketPositionType | null }) {
  const { t } = useTranslation("diagnosis");

  if (!market || market.available !== true) return null;

  const grouped = {
    niche: market.jd_skills.filter((item) => item.position === "niche"),
    standard: market.jd_skills.filter((item) => item.position === "standard"),
    common: market.jd_skills.filter((item) => item.position === "common"),
  };

  return (
    <section className={cn(CARD, "overflow-hidden")}>
      <div className="border-b border-[#EAEAEA] p-5">
        <h3 className="flex items-center gap-2 text-base font-bold text-[#2F3437]">
          <BriefcaseBusiness className="h-5 w-5 text-primary" />
          {t("market.title")}
        </h3>
        <p className="mt-1 text-xs text-[#787774]">
          {t("market.basedOn", { n: market.total_active_jobs })}
        </p>
      </div>

      <div className="space-y-4 p-5">
        {(["niche", "standard", "common"] as const).map((position) => (
          grouped[position].length ? (
            <div key={position} className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#787774]">
                {t(`market.position.${position}`)}
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {grouped[position].map((skill) => (
                  <MarketSkillCard key={`${skill.skill_canonical}-${position}`} skill={skill} />
                ))}
              </div>
            </div>
          ) : null
        ))}

        {market.implied?.length ? (
          <div className="border-t border-[#EAEAEA] pt-4">
            <h4 className="text-sm font-bold text-[#2F3437]">{t("market.impliedTitle")}</h4>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {market.implied.map((skill) => (
                <ImpliedSkillCard key={skill.skill_canonical} skill={skill} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MarketSkillCard({ skill }: { skill: JdMarketSkill }) {
  const { t } = useTranslation("diagnosis");

  return (
    <div className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", POSITION_CLASS[skill.position])}>
          {t(`market.position.${skill.position}`)}
        </span>
        <span className="font-mono text-[11px] font-bold text-[#787774] tabular-nums">
          {Math.round(skill.pct_of_postings)}%
        </span>
      </div>
      <p className="mt-2 text-sm font-bold text-[#2F3437]">{skill.display_name}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#787774]">{skill.why}</p>
    </div>
  );
}

function ImpliedSkillCard({ skill }: { skill: ImpliedSkill }) {
  const { t } = useTranslation("diagnosis");

  return (
    <div className="rounded-xl border border-[#EAEAEA] bg-[#FBFBFA] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-[#2F3437]">{skill.display_name}</span>
        <span className="font-mono text-[11px] font-bold text-[#787774] tabular-nums">
          {Math.round(skill.pct_of_postings)}%
        </span>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold",
          skill.covered ? "border-[#DCE9D7] bg-[#EDF3EC] text-[#346538]" : "border-[#F1E5C0] bg-[#FBF3DB] text-[#956400]",
        )}>
          {skill.covered ? <CheckCircle2 className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          {skill.covered ? t("market.youHave") : t("market.prepare")}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[#787774]">{skill.why}</p>
    </div>
  );
}
