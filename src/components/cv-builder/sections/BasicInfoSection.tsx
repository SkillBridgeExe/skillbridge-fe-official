import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";

export function BasicInfoSection() {
  const {
    fullName, email, phone, location, linkedin, portfolio, github,
    photoUrl, profileLinks, customFields,
    setBasicInfo, addProfileLink, updateProfileLink, removeProfileLink,
    addCustomField, updateCustomField, removeCustomField
  } = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");

  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">{t("builder.fields.fullName")} *</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setBasicInfo("fullName", e.target.value)} placeholder={t("builder.ph.fullName")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("builder.fields.email")} *</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setBasicInfo("email", e.target.value)} placeholder={t("builder.ph.email")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">{t("builder.fields.phone")} *</Label>
          <Input id="phone" value={phone} onChange={(e) => setBasicInfo("phone", e.target.value)} placeholder={t("builder.ph.phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="location">{t("builder.fields.location")}</Label>
          <Input id="location" value={location} onChange={(e) => setBasicInfo("location", e.target.value)} placeholder={t("builder.ph.location")} />
        </div>

        {/* Legacy single links */}
        <div className="space-y-1.5">
          <Label htmlFor="linkedin">{t("builder.fields.linkedin")}</Label>
          <Input id="linkedin" value={linkedin} onChange={(e) => setBasicInfo("linkedin", e.target.value)} placeholder={t("builder.ph.linkedin")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="github">{t("builder.fields.github")}</Label>
          <Input id="github" value={github} onChange={(e) => setBasicInfo("github", e.target.value)} placeholder={t("builder.ph.github")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portfolio">{t("builder.fields.portfolio")}</Label>
          <Input id="portfolio" value={portfolio} onChange={(e) => setBasicInfo("portfolio", e.target.value)} placeholder={t("builder.ph.portfolio")} />
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">{t("builder.fields.additionalLinks")}</Label>
          <Button variant="outline" size="sm" onClick={addProfileLink} className="h-8 gap-1">
            <Plus className="w-3.5 h-3.5" />
            {t("builder.actions.addItem")}
          </Button>
        </div>
        {(profileLinks || []).map((link) => (
          <div key={link.id} className="flex items-center gap-2">
            <Input className="w-1/3" placeholder={t("builder.fields.linkNetworkPlaceholder")} value={link.network} onChange={(e) => updateProfileLink(link.id, "network", e.target.value)} />
            <Input className="flex-1" placeholder={t("builder.fields.urlPlaceholder")} value={link.url} onChange={(e) => updateProfileLink(link.id, "url", e.target.value)} />
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5">
              <Switch
                checked={link.visible !== false}
                onCheckedChange={(checked) => updateProfileLink(link.id, "visible", checked)}
                aria-label={t("builder.fields.profileLinkVisible")}
                className="h-5 w-9"
              />
              <span className="hidden text-xs text-slate-500 sm:inline">{t("builder.fields.visible")}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeProfileLink(link.id)} className="shrink-0 text-slate-400 hover:text-red-500" aria-label={t("builder.actions.remove")}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">{t("builder.fields.customFields")}</Label>
          <Button variant="outline" size="sm" onClick={addCustomField} className="h-8 gap-1">
            <Plus className="w-3.5 h-3.5" />
            {t("builder.actions.addItem")}
          </Button>
        </div>
        {(customFields || []).map((field) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input className="w-1/3" placeholder={t("builder.fields.customFieldNamePlaceholder")} value={field.name} onChange={(e) => updateCustomField(field.id, "name", e.target.value)} />
            <Input className="flex-1" placeholder={t("builder.fields.customFieldValuePlaceholder")} value={field.value} onChange={(e) => updateCustomField(field.id, "value", e.target.value)} />
            <Button variant="ghost" size="icon" onClick={() => removeCustomField(field.id)} className="shrink-0 text-slate-400 hover:text-red-500" aria-label={t("builder.actions.remove")}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
