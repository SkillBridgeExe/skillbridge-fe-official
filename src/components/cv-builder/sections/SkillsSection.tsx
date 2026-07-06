import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { X, Lightbulb, Plus, Check, Zap } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useSkillsNudgeQuery } from "@/hooks/use-cv-builder";
import { useAuthStore } from "@/store/useAuthStore";

// Curated reference lists per role (NOT AI — a static, honest "common skills" helper).
const SUGGESTIONS = {
  "Business Analyst": ["Requirement Gathering", "User Story", "Wireframing", "SRS Documentation", "UAT", "Data Analysis", "SQL", "Figma", "Jira"],
  "Frontend Developer": ["React", "TypeScript", "Tailwind CSS", "Next.js", "Redux", "HTML/CSS", "Figma to HTML", "Git"],
};

export function SkillsSection() {
  const { technicalSkills, softSkills, tools, languages, addSkill, removeSkill, targetPosition, draftId } = useCvBuilderStore();
  const { t, i18n } = useTranslation("diagnosis");
  const [inputs, setInputs] = useState({ technicalSkills: "", softSkills: "", tools: "", languages: "" });
  const isLoggedIn = useAuthStore(
    (state) => state.authStatus === "authenticated" && state.authSource === "api",
  );

  const lang = (i18n.language.startsWith("vi") ? "vi" : "en") as "vi" | "en";
  const nudgeQuery = useSkillsNudgeQuery(isLoggedIn ? draftId : null, lang);
  const nudgeItems = nudgeQuery.data ?? [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: "technicalSkills" | "softSkills" | "tools" | "languages") => {
    if (e.key === "Enter" && inputs[field].trim()) {
      e.preventDefault();
      addSkill(field, inputs[field].trim());
      setInputs({ ...inputs, [field]: "" });
    }
  };

  const getSuggestions = () => {
    const role = targetPosition.toLowerCase();
    if (role.includes("analyst") || role.includes("ba")) return SUGGESTIONS["Business Analyst"];
    if (role.includes("frontend") || role.includes("react")) return SUGGESTIONS["Frontend Developer"];
    return [];
  };
  
  const suggestions = getSuggestions();

  // Lookup from the values already subscribed above — calling the store hook
  // inside the render loop below violates the Rules of Hooks.
  const skillsByField = { technicalSkills, softSkills, tools, languages };

  return (
    <div className="space-y-6">
      {/* Skills Nudge (BE-driven, deterministic) */}
      {nudgeItems.length > 0 && (
        <div className="p-3 bg-indigo-50/60 border border-indigo-100/80 rounded-lg space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
            <Zap className="w-3.5 h-3.5" />
            {t("skillsNudge.title")}
          </div>
          <ul className="space-y-1">
            {nudgeItems.map((item) => (
              <li key={item.code} className="text-xs text-indigo-700/80 leading-relaxed flex items-start gap-1.5">
                <span className="mt-1 w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Lightbulb className="w-3.5 h-3.5" /> {t("builder.commonSkillsSuggest", { role: targetPosition })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => {
              const added = technicalSkills.includes(s) || tools.includes(s) || softSkills.includes(s);
              return (
                <Badge key={s} variant={added ? "default" : "outline"} className={added ? "opacity-50" : "cursor-pointer bg-white"} onClick={() => !added && addSkill("technicalSkills", s)}>
                  {added ? <Check className="w-3 h-3 mr-0.5" /> : <Plus className="w-3 h-3 mr-0.5" />} {s}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {(["technicalSkills", "softSkills", "tools", "languages"] as const).map((field) => (
        <div key={field} className="space-y-2">
          <Label>{t(`builder.skills.${field}`)}</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {skillsByField[field].map((skill) => (
              <Badge key={skill} variant="secondary" className="pl-2 pr-1 py-1 text-[13px]">
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(field, skill)}
                  aria-label={`${t("builder.remove")} ${skill}`}
                  className="ml-1 hover:bg-slate-200 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            placeholder={t("builder.skillInputPlaceholder")}
            value={inputs[field]}
            onChange={(e) => setInputs({ ...inputs, [field]: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, field)}
          />
        </div>
      ))}
    </div>
  );
}
