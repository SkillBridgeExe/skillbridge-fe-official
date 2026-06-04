import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { Plus, Trash2 } from "lucide-react";

export function CertificationsSection() {
  const { certifications, addCertification, updateCertification, removeCertification } = useCvBuilderStore();

  return (
    <div className="space-y-6 p-4">
      {certifications.map((cert, index) => (
        <div key={cert.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 relative group">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-slate-700">Certification #{index + 1}</h4>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeCertification(cert.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>Certification Name *</Label>
              <Input value={cert.name} onChange={(e) => updateCertification(cert.id, "name", e.target.value)} placeholder="e.g. AWS Certified Solutions Architect" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Organization</Label>
              <Input value={cert.organization} onChange={(e) => updateCertification(cert.id, "organization", e.target.value)} placeholder="e.g. Amazon Web Services" />
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>Issue Date</Label>
              <Input value={cert.issueDate} onChange={(e) => updateCertification(cert.id, "issueDate", e.target.value)} placeholder="e.g. 2023" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Credential URL (Optional)</Label>
              <Input value={cert.credentialUrl} onChange={(e) => updateCertification(cert.id, "credentialUrl", e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </div>
      ))}
      {certifications.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">No certifications added yet.</p>
      )}
      <Button variant="outline" className="w-full border-dashed" onClick={addCertification}>
        <Plus className="w-4 h-4 mr-2" /> Add Certification
      </Button>
    </div>
  );
}
