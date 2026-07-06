import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { SectionItemCard } from "./SectionItemCard";
import { useScrollToNewItem } from "@/hooks/use-scroll-to-new-item";

export function CertificationsSection() {
  const { certifications, addCertification, updateCertification, removeCertification, duplicateCertification, moveCertification } = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");

  useScrollToNewItem(certifications, "certifications");

  return (
    <div className="space-y-6">
      {certifications.length > 0 ? certifications.map((cert, index) => {
        const title = cert.name || t("builder.ph.certName", { defaultValue: "Certification Name" });
        const subtitle = cert.organization || t("builder.entry.certification", { defaultValue: "Certification" });

        return (
          <div key={cert.id} id={`certifications-${cert.id}`}>
          <SectionItemCard
            key={cert.id}
            title={title}
            subtitle={subtitle}
            onRemove={() => removeCertification(cert.id)}
            canRemove={true}
            requireConfirmOnRemove={!!cert.name || !!cert.organization || !!cert.issueDate || !!cert.credentialUrl}
            onDuplicate={() => duplicateCertification(cert.id)}
            canDuplicate={true}
            onMoveUp={() => moveCertification(cert.id, "up")}
            canMoveUp={index > 0}
            onMoveDown={() => moveCertification(cert.id, "down")}
            canMoveDown={index < certifications.length - 1}
            defaultExpanded={index === 0 || !cert.name}
          >
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label>{t("builder.fields.certName")} *</Label>
                <Input value={cert.name} onChange={(e) => updateCertification(cert.id, "name", e.target.value)} placeholder={t("builder.ph.certName")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.organization")}</Label>
                <Input value={cert.organization} onChange={(e) => updateCertification(cert.id, "organization", e.target.value)} placeholder={t("builder.ph.organization")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.issueDate")}</Label>
                <Input value={cert.issueDate} onChange={(e) => updateCertification(cert.id, "issueDate", e.target.value)} placeholder={t("builder.ph.issueDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("builder.fields.credentialUrl")}</Label>
                <Input value={cert.credentialUrl} onChange={(e) => updateCertification(cert.id, "credentialUrl", e.target.value)} placeholder={t("builder.ph.credentialUrl")} />
              </div>
            </div>
          </SectionItemCard>
          </div>
        );
      }) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Award className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700 mb-1">{t("builder.empty.certificationsTitle", { defaultValue: "No certifications" })}</h4>
          <p className="text-xs text-slate-500 mb-4 max-w-[240px]">{t("builder.empty.certificationsDesc", { defaultValue: "Add professional certificates." })}</p>
          <Button onClick={addCertification} size="sm" variant="outline" className="h-8 gap-1.5 bg-white text-slate-700 hover:bg-slate-50 border-slate-200">
            <Plus className="w-3.5 h-3.5"/>
            {t("builder.add.certification")}
          </Button>
        </div>
      )}
      
      {certifications.length > 0 && (
      
      <button 
        onClick={addCertification}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer group"
      >
        <Plus className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" /> 
        <span className="font-medium text-sm">{t("builder.add.certification")}</span>
      </button>
      )}
    </div>
  );
}
