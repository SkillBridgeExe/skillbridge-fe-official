import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionItemCard } from "./SectionItemCard";

export function EducationSection() {
  const { education, addEducation, updateEducation, removeEducation } = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");

  return (
    <div className="space-y-6">
      {education.map((edu, index) => {
        const title = edu.school || t("builder.ph.school", { defaultValue: "Tên trường / Tổ chức" });
        const subtitle = edu.degree && edu.major ? `${edu.degree} - ${edu.major}` : edu.major || edu.degree;
        
        return (
          <SectionItemCard
            key={edu.id}
            title={title}
            subtitle={subtitle}
            onRemove={() => removeEducation(edu.id)}
            canRemove={education.length > 1}
            defaultExpanded={index === 0 || !edu.school}
          >
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
          </SectionItemCard>
        );
      })}
      
      <button 
        onClick={addEducation}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer group"
      >
        <Plus className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" /> 
        <span className="font-medium text-sm">{t("builder.add.education", { defaultValue: "Thêm học vấn" })}</span>
      </button>
    </div>
  );
}
