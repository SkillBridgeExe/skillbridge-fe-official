import { AlertCircle, Clock3, MinusCircle } from "lucide-react";
import type { ApplicationMatchExplanationDto, ApplicationMatchSkillDto } from "@/types/jobs";

function SkillGroup({ title, skills, tone }: { title: string; skills: ApplicationMatchSkillDto[]; tone: string }) {
  if (!skills.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-slate-600">{title}</p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => <span key={`${title}-${skill.canonicalName}`} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}>{skill.displayName}</span>)}
      </div>
    </div>
  );
}

export default function ApplicationMatchExplanation({ explanation, compact = false }: { explanation: ApplicationMatchExplanationDto; compact?: boolean }) {
  if (explanation.status === "PENDING") {
    return <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"><Clock3 size={16} /> Candidate match is being calculated.</div>;
  }
  if (explanation.status === "FAILED") {
    return <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertCircle size={16} /> Match details are currently unavailable.</div>;
  }
  if (explanation.score === null || explanation.scoreBasis !== "skills_only") {
    return <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600"><MinusCircle size={16} /> Not enough skill requirements to produce a reliable score.</div>;
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><p className="text-xl font-bold text-slate-900">{Math.round(explanation.score)}% match</p><p className="text-xs text-slate-500">Skills-only comparison{explanation.requiredCoverage !== null ? ` · ${Math.round(explanation.requiredCoverage * 100)}% required coverage` : ""}</p></div>
      </div>
      {!compact && (
        <div className="space-y-4">
          <SkillGroup title="Matched skills" skills={explanation.matchedSkills} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
          <SkillGroup title="Partially matched" skills={explanation.partialSkills} tone="border-amber-200 bg-amber-50 text-amber-700" />
          <SkillGroup title="Missing skills" skills={explanation.missingSkills} tone="border-red-200 bg-red-50 text-red-700" />
        </div>
      )}
      {!compact && explanation.matchedSkills.length === 0 && explanation.partialSkills.length === 0 && explanation.missingSkills.length === 0 && (
        <p className="text-xs text-slate-500">No normalized skill details were stored for this match.</p>
      )}
    </div>
  );
}
