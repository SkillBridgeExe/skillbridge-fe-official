import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor, normalizeToBulletText } from "@/components/ui/rich-text-editor";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, GraduationCap, List as ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { SectionItemCard } from "./SectionItemCard";
import { useScrollToNewItem } from "@/hooks/use-scroll-to-new-item";

export function EducationSection() {
  const { education, addEducation, updateEducation, removeEducation, duplicateEducation, moveEducation } = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");

  useScrollToNewItem(education, "education");

  const handleConvertToBullets = (id: string, currentText: string) => {
    if (!currentText.trim()) return;
    updateEducation(id, "achievements", normalizeToBulletText(currentText));
  };

  return (
    <div className="space-y-6">
      {education.length > 0 ? education.map((edu, index) => {
        const title = edu.school && edu.degree ? `${edu.degree} • ${edu.school}` : edu.school || t("builder.fields.newEducation");
        const subtitle = [edu.major, edu.startYear || edu.endYear ? `${edu.startYear || ""} - ${edu.endYear || ""}`.replace(/^\s*-\s*|\s*-\s*$/g, "") : null].filter(Boolean).join(" | ");
        
        return (
          <div key={edu.id} id={`education-${edu.id}`}>
          <SectionItemCard
            key={edu.id}
            title={title}
            subtitle={subtitle}
            onRemove={() => removeEducation(edu.id)}
            canRemove={true}
            requireConfirmOnRemove={!!edu.school || !!edu.major || !!edu.degree || !!edu.achievements}
            onDuplicate={() => duplicateEducation(edu.id)}
            canDuplicate={true}
            onMoveUp={() => moveEducation(edu.id, "up")}
            canMoveUp={index > 0}
            onMoveDown={() => moveEducation(edu.id, "down")}
            canMoveDown={index < education.length - 1}
            defaultExpanded={index === 0 || !edu.school}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("builder.fields.school")} *</Label>
                <Input value={edu.school} onChange={(e) => updateEducation(edu.id, "school", e.target.value)} placeholder={t("builder.ph.school")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.major")} *</Label>
                <Input value={edu.major} onChange={(e) => updateEducation(edu.id, "major", e.target.value)} placeholder={t("builder.ph.major")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.degree")}</Label>
                <Input value={edu.degree} onChange={(e) => updateEducation(edu.id, "degree", e.target.value)} placeholder={t("builder.ph.degree")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.startYear")}</Label>
                <Input value={edu.startYear} onChange={(e) => updateEducation(edu.id, "startYear", e.target.value)} placeholder={t("builder.ph.startYear")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.endYear")}</Label>
                <Input value={edu.endYear} onChange={(e) => updateEducation(edu.id, "endYear", e.target.value)} placeholder={t("builder.ph.endYear")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("builder.fields.gpa")}</Label>
                <Input value={edu.gpa} onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)} placeholder={t("builder.ph.gpa")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>{t("builder.fields.eduAchievements")}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1 px-1.5"
                    onClick={() => handleConvertToBullets(edu.id, edu.achievements)}
                    title={t("builder.richText.convertToBullets")}
                    aria-label={t("builder.richText.convertToBullets")}
                  >
                    <ListIcon className="w-3 h-3" />
                    <span>{t("builder.richText.convertToBullets")}</span>
                  </Button>
                </div>
                <RichTextEditor
                  value={edu.achievements}
                  onChange={(val) => updateEducation(edu.id, "achievements", val)}
                  placeholder={t("builder.ph.eduAchievements")}
                  className="text-[13px] min-h-[96px] font-sans"
                />
              </div>
            </div>
          </SectionItemCard>
          </div>
        );
      }) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700 mb-1">{t("builder.empty.educationTitle")}</h4>
          <p className="text-xs text-slate-500 mb-4 max-w-[240px]">{t("builder.empty.educationDesc")}</p>
          <Button onClick={addEducation} size="sm" variant="outline" className="h-8 gap-1.5 bg-white text-slate-700 hover:bg-slate-50 border-slate-200">
            <Plus className="w-3.5 h-3.5"/>
            {t("builder.add.education")}
          </Button>
        </div>
      )}
      
      {education.length > 0 && (
      <button 
        onClick={addEducation}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer group"
      >
        <Plus className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" /> 
        <span className="font-medium text-sm">{t("builder.add.education")}</span>
      </button>
      )}
    </div>
  );
}
