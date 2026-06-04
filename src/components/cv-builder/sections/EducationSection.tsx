import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, Trash2 } from "lucide-react";

export function EducationSection() {
  const { education, addEducation, updateEducation, removeEducation } = useCvBuilderStore();

  return (
    <div className="space-y-6 p-4">
      {education.map((edu, index) => (
        <div key={edu.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 relative group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-slate-700">Education #{index + 1}</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeEducation(edu.id)}
              disabled={education.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>School / University *</Label>
              <Input value={edu.school} onChange={(e) => updateEducation(edu.id, "school", e.target.value)} placeholder="e.g. FPT University" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Major *</Label>
              <Input value={edu.major} onChange={(e) => updateEducation(edu.id, "major", e.target.value)} placeholder="e.g. Software Engineering" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Degree</Label>
              <Input value={edu.degree} onChange={(e) => updateEducation(edu.id, "degree", e.target.value)} placeholder="e.g. Bachelor" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Start Year</Label>
              <Input value={edu.startYear} onChange={(e) => updateEducation(edu.id, "startYear", e.target.value)} placeholder="e.g. 2020" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>End Year (or Expected)</Label>
              <Input value={edu.endYear} onChange={(e) => updateEducation(edu.id, "endYear", e.target.value)} placeholder="e.g. 2024" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>GPA</Label>
              <Input value={edu.gpa} onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)} placeholder="e.g. 3.8/4.0" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Achievements / Relevant Coursework</Label>
              <Textarea 
                value={edu.achievements} 
                onChange={(e) => updateEducation(edu.id, "achievements", e.target.value)} 
                placeholder="e.g. Dean's List 2022, Won Hackathon..." 
                className="text-[13px] resize-none h-20"
              />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={addEducation}>
        <Plus className="w-4 h-4 mr-2" /> Add Education
      </Button>
    </div>
  );
}
