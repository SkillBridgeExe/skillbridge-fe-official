import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function ProjectsSection() {
  const { projects, addProject, updateProject, removeProject } = useCvBuilderStore();
  const { toast } = useToast();
  const { t } = useTranslation("diagnosis");

  const suggestBullets = (id: string) => {
    toast({ title: t("builder.toastAiApplied") });
    updateProject(id, "description", "- Built a fullstack web app using React and Node.js\n- Implemented authentication with JWT\n- Deployed to Vercel and AWS");
  };

  return (
    <div className="space-y-6 p-4">
      {projects.map((proj, index) => (
        <div key={proj.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 relative group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-slate-700">{t("builder.entry.project")} #{index + 1}</h4>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeProject(proj.id)} disabled={projects.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.projectName")} *</Label>
              <Input value={proj.name} onChange={(e) => updateProject(proj.id, "name", e.target.value)} placeholder={t("builder.ph.projectName")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.role")}</Label>
              <Input value={proj.role} onChange={(e) => updateProject(proj.id, "role", e.target.value)} placeholder={t("builder.ph.role")} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t("builder.fields.tools")}</Label>
              <Input value={proj.tools} onChange={(e) => updateProject(proj.id, "tools", e.target.value)} placeholder={t("builder.ph.tools")} />
            </div>
            <div className="space-y-2 col-span-2">
              <div className="flex items-center justify-between">
                <Label>{t("builder.fields.projectDescription")}</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => suggestBullets(proj.id)}>
                  <Sparkles className="w-3 h-3 mr-1" /> {t("builder.turnIntoBullets")}
                </Button>
              </div>
              <Textarea
                value={proj.description}
                onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                placeholder={t("builder.ph.projectDescription")}
                className="text-[13px] resize-none h-20"
              />
            </div>
          </div>
        </div>
      ))}
      <Button variant="outline" className="w-full border-dashed" onClick={addProject}>
        <Plus className="w-4 h-4 mr-2" /> {t("builder.add.project")}
      </Button>
    </div>
  );
}
