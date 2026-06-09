import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function EducationSection() {
  const { education, addEducation, updateEducation, removeEducation } = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");

  return (
    <div className="space-y-6 p-4">
      {education.map((edu, index) => (
        <div key={edu.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 relative group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-slate-700">{t("builder.entry.education")} #{index + 1}</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeEducation(edu.id)}
              disabled={education.length === 1}
              aria-label={`${t("builder.remove")} ${t("builder.entry.education")} ${index + 1}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>{t("builder.fields.school")} *</Label>
              <Input value={edu.school} onChange={(e) => updateEducation(edu.id, "school", e.target.value)} placeholder={t("builder.ph.school")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.major")} *</Label>
              <Input value={edu.major} onChange={(e) => updateEducation(edu.id, "major", e.target.value)} placeholder={t("builder.ph.major")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.degree")}</Label>
              <Input value={edu.degree} onChange={(e) => updateEducation(edu.id, "degree", e.target.value)} placeholder={t("builder.ph.degree")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.startYear")}</Label>
              <Input value={edu.startYear} onChange={(e) => updateEducation(edu.id, "startYear", e.target.value)} placeholder={t("builder.ph.startYear")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.endYear")}</Label>
              <Input value={edu.endYear} onChange={(e) => updateEducation(edu.id, "endYear", e.target.value)} placeholder={t("builder.ph.endYear")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.gpa")}</Label>
              <Input value={edu.gpa} onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)} placeholder={t("builder.ph.gpa")} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t("builder.fields.eduAchievements")}</Label>
              <Textarea
                value={edu.achievements}
                onChange={(e) => updateEducation(edu.id, "achievements", e.target.value)}
                placeholder={t("builder.ph.eduAchievements")}
                className="text-[13px] resize-none h-20"
              />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={addEducation}>
        <Plus className="w-4 h-4 mr-2" /> {t("builder.add.education")}
      </Button>
    </div>
  );
}
