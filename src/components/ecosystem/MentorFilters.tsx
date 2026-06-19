import { RotateCcw, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MentorFiltersDto, MentorListQuery, MentorSort } from "@/services/mentor.service";

export function MentorFilters({
  query,
  filters,
  onChange,
  onReset,
}: {
  query: MentorListQuery;
  filters?: MentorFiltersDto;
  onChange: (key: "domain" | "minRating" | "sort", value?: string) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
          {t("mentor.marketplace.filters")}
        </h2>
        <Button variant="ghost" size="sm" onClick={onReset} className="rounded-lg text-slate-500 hover:text-primary">
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          {t("mentor.marketplace.reset")}
        </Button>
      </div>

      <FilterBlock label={t("mentor.marketplace.domain")}>
        <Select value={query.domain ?? "all"} onValueChange={(value) => onChange("domain", value === "all" ? undefined : value)}>
          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("mentor.marketplace.allDomains")}</SelectItem>
            {(filters?.domains ?? []).map((domain) => (
              <SelectItem key={domain.value} value={domain.value}>
                {domain.label} ({domain.mentorCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock label={t("mentor.marketplace.minimumRating")}>
        <Select value={query.minRating?.toString() ?? "all"} onValueChange={(value) => onChange("minRating", value === "all" ? undefined : value)}>
          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("mentor.marketplace.anyRating")}</SelectItem>
            {[5, 4, 3].map((rating) => (
              <SelectItem key={rating} value={rating.toString()}>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {t("mentor.marketplace.starsAndUp", { count: rating })}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBlock>

      <FilterBlock label={t("mentor.marketplace.sort")}>
        <Select value={query.sort ?? "rating_desc"} onValueChange={(value) => onChange("sort", value as MentorSort)}>
          <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating_desc">{t("mentor.marketplace.ratingDesc")}</SelectItem>
            <SelectItem value="price_asc">{t("mentor.marketplace.priceAsc")}</SelectItem>
            <SelectItem value="price_desc">{t("mentor.marketplace.priceDesc")}</SelectItem>
            <SelectItem value="newest">{t("mentor.marketplace.newest")}</SelectItem>
          </SelectContent>
        </Select>
      </FilterBlock>
    </div>
  );
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</Label>
      {children}
    </div>
  );
}
