import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SectionItemCard } from "./SectionItemCard";

export function CertificationsSection() {
  const { certifications, addCertification, updateCertification, removeCertification } = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");

  return (
    <div className="space-y-6">
      {certifications.map((cert, index) => {
        const title = cert.name || t("builder.ph.certName", { defaultValue: "Certification Name" });
        const subtitle = cert.organization || t("builder.entry.certification", { defaultValue: "Certification" });

        return (
          <SectionItemCard
            key={cert.id}
            title={title}
            subtitle={subtitle}
            onRemove={() => removeCertification(cert.id)}
            canRemove={true}
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
        );
      })}
      {certifications.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">{t("builder.noCerts")}</p>
      )}
      
      <button 
        onClick={addCertification}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 transition-colors cursor-pointer group"
      >
        <Plus className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" /> 
        <span className="font-medium text-sm">{t("builder.add.certification")}</span>
      </button>
    </div>
  );
}
