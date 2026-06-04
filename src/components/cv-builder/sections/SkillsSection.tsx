import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { X, Sparkles, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const SUGGESTIONS = {
  "Business Analyst": ["Requirement Gathering", "User Story", "Wireframing", "SRS Documentation", "UAT", "Data Analysis", "SQL", "Figma", "Jira"],
  "Frontend Developer": ["React", "TypeScript", "Tailwind CSS", "Next.js", "Redux", "HTML/CSS", "Figma to HTML", "Git"],
};

export function SkillsSection() {
  const { technicalSkills, softSkills, tools, languages, addSkill, removeSkill, targetPosition } = useCvBuilderStore();
  const [inputs, setInputs] = useState({ technicalSkills: "", softSkills: "", tools: "", languages: "" });

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

  return (
    <div className="space-y-6 p-4">
      {suggestions.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
            <Sparkles className="w-3.5 h-3.5" /> AI Suggestions for {targetPosition}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => {
              const added = technicalSkills.includes(s) || tools.includes(s) || softSkills.includes(s);
              return (
                <Badge key={s} variant={added ? "default" : "outline"} className={added ? "opacity-50" : "cursor-pointer bg-white"} onClick={() => !added && addSkill("technicalSkills", s)}>
                  {added ? <span className="mr-1">✓</span> : <Plus className="w-3 h-3 mr-0.5" />} {s}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {(["technicalSkills", "softSkills", "tools", "languages"] as const).map((field) => (
        <div key={field} className="space-y-2">
          <Label className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {useCvBuilderStore(state => state[field]).map((skill) => (
              <Badge key={skill} variant="secondary" className="pl-2 pr-1 py-1 text-[13px]">
                {skill}
                <button onClick={() => removeSkill(field, skill)} className="ml-1 hover:bg-slate-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input 
            placeholder={`Type a skill and press Enter...`} 
            value={inputs[field]} 
            onChange={(e) => setInputs({ ...inputs, [field]: e.target.value })}
            onKeyDown={(e) => handleKeyDown(e, field)}
          />
        </div>
      ))}
    </div>
  );
}
