import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function CertificationsSection() {
  const { certifications, addCertification, updateCertification, removeCertification } = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");

  return (
    <div className="space-y-6 p-4">
      {certifications.map((cert, index) => (
        <div key={cert.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 relative group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-slate-700">{t("builder.entry.certification")} #{index + 1}</h4>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeCertification(cert.id)}
              aria-label={`${t("builder.remove")} ${t("builder.entry.certification")} ${index + 1}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>{t("builder.fields.certName")} *</Label>
              <Input value={cert.name} onChange={(e) => updateCertification(cert.id, "name", e.target.value)} placeholder={t("builder.ph.certName")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.organization")}</Label>
              <Input value={cert.organization} onChange={(e) => updateCertification(cert.id, "organization", e.target.value)} placeholder={t("builder.ph.organization")} />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>{t("builder.fields.issueDate")}</Label>
              <Input value={cert.issueDate} onChange={(e) => updateCertification(cert.id, "issueDate", e.target.value)} placeholder={t("builder.ph.issueDate")} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t("builder.fields.credentialUrl")}</Label>
              <Input value={cert.credentialUrl} onChange={(e) => updateCertification(cert.id, "credentialUrl", e.target.value)} placeholder={t("builder.ph.credentialUrl")} />
            </div>
          </div>
        </div>
      ))}
      {certifications.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">{t("builder.noCerts")}</p>
      )}
      <Button variant="outline" className="w-full border-dashed" onClick={addCertification}>
        <Plus className="w-4 h-4 mr-2" /> {t("builder.add.certification")}
      </Button>
    </div>
  );
}
