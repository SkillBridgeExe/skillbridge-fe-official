import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCvBuilderStore, CareerLevel } from "@/store/useCvBuilderStore";
import { useTranslation } from "react-i18next";
import { checkRolePosition, isGibberish } from "@/lib/input-quality";

export function CareerTargetSection() {
  const { targetPosition, careerLevel, industry, setCareerTarget } = useCvBuilderStore();
  const { t } = useTranslation("diagnosis");

  // Deterministic, warn-only quality hints (anti-fab: only when CLEARLY off).
  const roleCheck = targetPosition.trim() ? checkRolePosition(targetPosition) : { ok: true as const };
  const industryBad = industry.trim() ? isGibberish(industry) : false;

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="targetPosition">{t("builder.fields.targetPosition")} *</Label>
          <Input id="targetPosition" value={targetPosition} onChange={(e) => setCareerTarget("targetPosition", e.target.value)} placeholder={t("builder.ph.targetPosition")} />
          {!roleCheck.ok && (
            <p className="text-xs text-amber-600">
              {roleCheck.suspectedTypo
                ? t("builder.quality.typoRole", { suggestion: roleCheck.suspectedTypo })
                : t("builder.quality.roleUnclear")}
            </p>
          )}
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="careerLevel">{t("builder.fields.careerLevel")} *</Label>
          <Select value={careerLevel} onValueChange={(v) => setCareerTarget("careerLevel", v as CareerLevel)}>
            <SelectTrigger>
              <SelectValue placeholder={t("builder.level.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">{t("builder.level.student")}</SelectItem>
              <SelectItem value="intern">{t("builder.level.intern")}</SelectItem>
              <SelectItem value="fresher">{t("builder.level.fresher")}</SelectItem>
              <SelectItem value="junior">{t("builder.level.junior")}</SelectItem>
              <SelectItem value="mid-level">{t("builder.level.midLevel")}</SelectItem>
              <SelectItem value="career-switcher">{t("builder.level.careerSwitcher")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="industry">{t("builder.fields.industry")}</Label>
          <Input id="industry" value={industry} onChange={(e) => setCareerTarget("industry", e.target.value)} placeholder={t("builder.ph.industry")} />
          {industryBad && (
            <p className="text-xs text-amber-600">{t("builder.quality.industryUnclear")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
