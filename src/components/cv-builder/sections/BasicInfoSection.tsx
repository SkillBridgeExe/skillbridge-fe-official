import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";
import { useTranslation } from "react-i18next";

export function BasicInfoSection() {
  const { fullName, email, phone, location, linkedin, portfolio, github, setBasicInfo } = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");

  return (
    <div className="space-y-4 p-4">
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
    </div>
  );
}
