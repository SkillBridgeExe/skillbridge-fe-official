import { useEffect, useId, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Loader2, Pencil, Plus, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import AdminIconActionButton from "@/components/admin/AdminIconActionButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QUERY_KEYS } from "@/constants/app";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatVnd, StatusBadge } from "@/lib/billing-ui";
import { useToast } from "@/hooks/use-toast";
import {
  createAdminBillingPlan,
  getAdminBillingFeatureUsage,
  getAdminBillingFeatures,
  getAdminBillingPlans,
  updateAdminBillingPlan,
  updateAdminPlanFeature,
  type AdminBillingFeatureCatalogDto,
  type BillingPlanDto,
  type CreateAdminBillingPlanDto,
} from "@/services/admin-billing.service";

type PlanForm = {
  code: string;
  name: string;
  description: string;
  category: string;
  interval: string;
  priceVnd: string;
  currency: string;
  isActive: boolean;
  sortOrder: string;
  creditUnits: string;
};

type QuotaDraft = {
  limitValue: string;
  period: string;
  unlimited: boolean;
};

type QuotaDrafts = Record<string, QuotaDraft>;

const emptyForm = (): PlanForm => ({
  code: "",
  name: "",
  description: "",
  category: "SUBSCRIPTION",
  interval: "MONTHLY",
  priceVnd: "129000",
  currency: "VND",
  isActive: true,
  sortOrder: "10",
  creditUnits: "1",
});

export default function AdminBillingPlans() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(true);
  const [selectedCode, setSelectedCode] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [quotaDrafts, setQuotaDrafts] = useState<QuotaDrafts>({});
  const [quotaErrors, setQuotaErrors] = useState<Record<string, string>>({});
  const [usagePeriod, setUsagePeriod] = useState<"THIS_MONTH" | "ALL_TIME">("THIS_MONTH");

  const plansQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_BILLING_PLANS(includeInactive),
    queryFn: () => getAdminBillingPlans(includeInactive),
  });

  const featureCatalogQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_BILLING_FEATURES,
    queryFn: getAdminBillingFeatures,
  });

  const featureUsageQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_BILLING_FEATURE_USAGE(usagePeriod),
    queryFn: () => getAdminBillingFeatureUsage(usagePeriod),
  });

  const usageByFeature = useMemo(() => {
    if (!featureUsageQuery.data) return {};
    return featureUsageQuery.data.items.reduce<Record<string, number>>((acc, item) => {
      acc[item.featureKey] = item.uniqueUserCount;
      return acc;
    }, {});
  }, [featureUsageQuery.data]);

  const selectedPlan = useMemo(
    () => plansQuery.data?.find((plan) => plan.code === selectedCode),
    [plansQuery.data, selectedCode],
  );

  const featureCatalog = useMemo(
    () => featureCatalogQuery.data ?? [],
    [featureCatalogQuery.data],
  );

  useEffect(() => {
    if (!formDialogOpen) return;
    setQuotaDrafts(buildQuotaDrafts(featureCatalog, selectedPlan));
    setQuotaErrors({});
  }, [featureCatalog, formDialogOpen, selectedPlan]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "billing", "plans"] });

  const closeForm = () => {
    setFormDialogOpen(false);
    setSelectedCode("");
    setQuotaDrafts({});
    setQuotaErrors({});
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminBillingPlan(
        toCreatePayload(form, featureCatalog, quotaDrafts),
      ),
    onSuccess: async () => {
      await invalidate();
      closeForm();
      toast({ title: t("billing.admin.plans.toastCreated") });
    },
    onError: (error) =>
      toast({
        title: t("billing.admin.plans.toastCreateFailed"),
        description: getApiErrorMessage(error, t("billing.errors.adminSave")),
        variant: "destructive",
      }),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const commonFields = {
        name: form.name,
        description: form.description || null,
        priceVnd: Number(form.priceVnd) || 0,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };
      return updateAdminBillingPlan(
        selectedCode,
        selectedPlan?.category === "CREDIT_PACKAGE"
          ? {
              ...commonFields,
              creditUnits: Math.max(1, Number(form.creditUnits) || 1),
            }
          : {
              ...commonFields,
              category: form.category as "SUBSCRIPTION" | "MENTOR_PACKAGE",
              interval: form.interval as "MONTHLY" | "ONE_TIME",
              currency: form.currency || "VND",
            },
      );
    },
    onSuccess: async () => {
      await invalidate();
      closeForm();
      toast({ title: t("billing.admin.plans.toastUpdated") });
    },
    onError: (error) =>
      toast({
        title: t("billing.admin.plans.toastUpdateFailed"),
        description: getApiErrorMessage(error, t("billing.errors.adminSave")),
        variant: "destructive",
      }),
  });

  const quotaMutation = useMutation({
    mutationFn: ({
      planCode,
      feature,
      draft,
    }: {
      planCode: string;
      feature: AdminBillingFeatureCatalogDto;
      draft: QuotaDraft;
    }) =>
      updateAdminPlanFeature(
        planCode,
        feature.featureKey,
        toQuotaPayload(feature, draft),
      ),
    onSuccess: async (_plan, variables) => {
      setQuotaErrors((prev) => omitKey(prev, variables.feature.featureKey));
      await invalidate();
      toast({ title: t("billing.admin.plans.toastQuotaSaved") });
    },
    onError: (error, variables) => {
      const message = getApiErrorMessage(error, t("billing.errors.adminSave"));
      setQuotaErrors((prev) => ({
        ...prev,
        [variables.feature.featureKey]: message,
      }));
      toast({
        title: t("billing.admin.plans.toastFeaturesFailed"),
        description: message,
        variant: "destructive",
      });
    },
  });

  const openCreateDialog = () => {
    setSelectedCode("");
    setForm(emptyForm());
    setQuotaDrafts(buildQuotaDrafts(featureCatalog));
    setQuotaErrors({});
    setFormDialogOpen(true);
  };

  const loadPlan = (plan: BillingPlanDto) => {
    setSelectedCode(plan.code);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? "",
      category: plan.category,
      interval: plan.interval,
      priceVnd: String(plan.priceVnd ?? 0),
      currency: plan.currency ?? "VND",
      isActive: plan.isActive ?? true,
      sortOrder: String(plan.sortOrder ?? 0),
      creditUnits: String(plan.creditPackage?.units ?? 1),
    });
    setQuotaDrafts(buildQuotaDrafts(featureCatalog, plan));
    setQuotaErrors({});
    setFormDialogOpen(true);
  };

  const updateQuotaDraft = (
    feature: AdminBillingFeatureCatalogDto,
    patch: Partial<QuotaDraft>,
  ) => {
    setQuotaDrafts((prev) => ({
      ...prev,
      [feature.featureKey]: {
        ...createDefaultQuotaDraft(feature),
        ...prev[feature.featureKey],
        ...patch,
      },
    }));
    setQuotaErrors((prev) => omitKey(prev, feature.featureKey));
  };

  const saveQuota = (feature: AdminBillingFeatureCatalogDto) => {
    if (!selectedPlan) return;
    quotaMutation.mutate({
      planCode: selectedPlan.code,
      feature,
      draft:
        quotaDrafts[feature.featureKey] ?? createDefaultQuotaDraft(feature),
    });
  };

  const plans = plansQuery.data ?? [];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-primary">
              {t("billing.admin.eyebrow")}
            </p>
            <h1 className="text-3xl font-bold tracking-normal text-foreground">
              {t("billing.admin.plans.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("billing.admin.plans.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setIncludeInactive((value) => !value)}
            >
              {includeInactive
                ? t("billing.admin.plans.hideInactive")
                : t("billing.admin.plans.showInactive")}
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus data-icon="inline-start" />
              {t("billing.admin.plans.createPlan")}
            </Button>
          </div>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>{t("billing.admin.plans.listTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="w-full min-w-[820px] text-sm">
              <TableHeader className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <TableRow>
                  <TableHead className="px-5 py-3 font-semibold">
                    {t("billing.admin.table.code")}
                  </TableHead>
                  <TableHead>{t("billing.admin.table.name")}</TableHead>
                  <TableHead>{t("billing.admin.table.category")}</TableHead>
                  <TableHead>{t("billing.admin.table.interval")}</TableHead>
                  <TableHead>{t("billing.admin.table.price")}</TableHead>
                  <TableHead>{t("billing.admin.table.status")}</TableHead>
                  <TableHead className="w-16 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow
                    key={plan.code}
                    className="border-b border-border last:border-0"
                  >
                    <TableCell className="px-5 py-4 font-mono font-semibold">
                      {plan.code}
                    </TableCell>
                    <TableCell className="font-semibold">{plan.name}</TableCell>
                    <TableCell>{plan.category}</TableCell>
                    <TableCell>{plan.interval}</TableCell>
                    <TableCell>{formatVnd(plan.priceVnd)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={plan.isActive === false ? "INACTIVE" : "ACTIVE"}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <AdminIconActionButton
                        label={t("billing.admin.common.edit")}
                        variant="outline"
                        onClick={() => loadPlan(plan)}
                      >
                        <Pencil data-icon="inline-start" />
                      </AdminIconActionButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!plans.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="px-5 py-10 text-center text-muted-foreground"
                    >
                      {plansQuery.isLoading
                        ? t("billing.common.loading")
                        : "No billing plans found."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog
          open={formDialogOpen}
          onOpenChange={(open) =>
            open ? setFormDialogOpen(true) : closeForm()
          }
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>
                {selectedPlan
                  ? t("billing.admin.plans.editTitle", {
                      code: selectedPlan.code,
                    })
                  : t("billing.admin.plans.createTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("billing.admin.plans.subtitle")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedPlan?.category !== "CREDIT_PACKAGE" ? (
                  <Field
                    label={t("billing.admin.table.code")}
                    value={form.code}
                    onChange={(code) => setForm((prev) => ({ ...prev, code }))}
                    disabled={Boolean(selectedPlan)}
                  />
                ) : null}
                <Field
                  label={t("billing.admin.table.name")}
                  value={form.name}
                  onChange={(name) => setForm((prev) => ({ ...prev, name }))}
                />
                {selectedPlan?.category !== "CREDIT_PACKAGE" ? (
                  <>
                    <SelectField
                      label={t("billing.admin.table.category")}
                      value={form.category}
                      onChange={(category) =>
                        setForm((prev) => ({ ...prev, category }))
                      }
                      disabled={Boolean(selectedPlan)}
                      options={["SUBSCRIPTION", "MENTOR_PACKAGE"]}
                    />
                    <SelectField
                      label={t("billing.admin.table.interval")}
                      value={form.interval}
                      onChange={(interval) =>
                        setForm((prev) => ({ ...prev, interval }))
                      }
                      options={["MONTHLY", "ONE_TIME"]}
                    />
                  </>
                ) : null}
                <Field
                  label={t("billing.admin.plans.priceVnd")}
                  value={form.priceVnd}
                  onChange={(priceVnd) =>
                    setForm((prev) => ({ ...prev, priceVnd }))
                  }
                />
                <Field
                  label={t("billing.admin.plans.sortOrder")}
                  value={form.sortOrder}
                  onChange={(sortOrder) =>
                    setForm((prev) => ({ ...prev, sortOrder }))
                  }
                />
                {form.category === "CREDIT_PACKAGE" ? (
                  <Field
                    label={t("billing.admin.plans.creditUnits")}
                    value={form.creditUnits}
                    onChange={(creditUnits) =>
                      setForm((prev) => ({ ...prev, creditUnits }))
                    }
                  />
                ) : null}
                {selectedPlan?.category !== "CREDIT_PACKAGE" ? (
                  <Field
                    label={t("billing.admin.plans.currency")}
                    value={form.currency}
                    onChange={(currency) =>
                      setForm((prev) => ({ ...prev, currency }))
                    }
                  />
                ) : null}
              </div>

              <div>
                <Label>{t("billing.admin.plans.description")}</Label>
                <Textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="mt-1.5"
                />
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox
                  checked={form.isActive}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked === true }))
                  }
                />
                {t("billing.admin.status.active")}
              </label>

              {form.category !== "CREDIT_PACKAGE" ? (
                <QuotaEditorTable
                  canSaveRows={Boolean(selectedPlan)}
                  errors={quotaErrors}
                  features={featureCatalog}
                  isError={featureCatalogQuery.isError}
                  isLoading={featureCatalogQuery.isLoading}
                  onDraftChange={updateQuotaDraft}
                  onRetry={() => void featureCatalogQuery.refetch()}
                  onSave={saveQuota}
                  planCode={selectedPlan?.code ?? form.code}
                  quotaDrafts={quotaDrafts}
                  savingFeatureKey={
                    quotaMutation.isPending
                      ? (quotaMutation.variables?.feature.featureKey ?? null)
                      : null
                  }
                  t={t}
                  usageByFeature={usageByFeature}
                  isLoadingUsage={featureUsageQuery.isLoading}
                  isErrorUsage={featureUsageQuery.isError}
                  onRetryUsage={() => void featureUsageQuery.refetch()}
                  usagePeriod={usagePeriod}
                  onUsagePeriodChange={setUsagePeriod}
                />
              ) : null}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={closeForm}>
                {t("billing.admin.plans.cancel")}
              </Button>
              <Button
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  featureCatalogQuery.isLoading
                }
                onClick={() =>
                  selectedPlan
                    ? updateMutation.mutate()
                    : createMutation.mutate()
                }
              >
                <Save data-icon="inline-start" />
                {selectedPlan
                  ? t("billing.admin.plans.savePlan")
                  : t("billing.admin.plans.createPlan")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function QuotaEditorTable({
  canSaveRows,
  errors,
  features,
  isError,
  isLoading,
  onDraftChange,
  onRetry,
  onSave,
  planCode,
  quotaDrafts,
  savingFeatureKey,
  t,
  usageByFeature,
  isLoadingUsage,
  isErrorUsage,
  onRetryUsage,
  usagePeriod,
  onUsagePeriodChange,
}: {
  canSaveRows: boolean;
  errors: Record<string, string>;
  features: AdminBillingFeatureCatalogDto[];
  isError: boolean;
  isLoading: boolean;
  onDraftChange: (
    feature: AdminBillingFeatureCatalogDto,
    patch: Partial<QuotaDraft>,
  ) => void;
  onRetry: () => void;
  onSave: (feature: AdminBillingFeatureCatalogDto) => void;
  planCode: string;
  quotaDrafts: QuotaDrafts;
  savingFeatureKey: string | null;
  t: (key: string, options?: Record<string, unknown>) => string;
  usageByFeature?: Record<string, number>;
  isLoadingUsage?: boolean;
  isErrorUsage?: boolean;
  onRetryUsage?: () => void;
  usagePeriod?: "THIS_MONTH" | "ALL_TIME";
  onUsagePeriodChange?: (period: "THIS_MONTH" | "ALL_TIME") => void;
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-col border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">
            {t("billing.admin.plans.quotaTitle")}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("billing.admin.plans.quotaDescription")}
          </p>
        </div>
        {usagePeriod && onUsagePeriodChange ? (
          <div className="mt-3 flex items-center gap-2 sm:mt-0">
            <Label className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
              {t("billing.admin.plans.usagePeriodFilter")}
            </Label>
            <Select
              value={usagePeriod}
              onValueChange={onUsagePeriodChange as (value: string) => void}
            >
              <SelectTrigger
                className="h-8 w-[140px] text-xs"
                aria-label={t("billing.admin.plans.usagePeriodFilter")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="THIS_MONTH">
                    {t("billing.admin.plans.periodThisMonth")}
                  </SelectItem>
                  <SelectItem value="ALL_TIME">
                    {t("billing.admin.plans.periodAllTime")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {t("billing.common.loading")}
        </div>
      ) : isError ? (
        <div className="flex flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{t("billing.admin.plans.featureCatalogFailed")}</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {t("billing.admin.plans.retryCatalog")}
          </Button>
        </div>
      ) : features.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {t("billing.admin.plans.noFeatureCatalog")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[860px] text-sm">
            <TableHeader className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <TableRow>
                <TableHead className="px-4 py-3 font-semibold">
                  {t("billing.admin.plans.feature")}
                </TableHead>
                <TableHead className="w-32 px-4 py-3 font-semibold">
                  {t("billing.admin.plans.usersUsed")}
                </TableHead>
                <TableHead className="w-36 px-4 py-3 font-semibold">
                  {t("billing.admin.plans.limit")}
                </TableHead>
                <TableHead className="w-36 px-4 py-3 font-semibold">
                  {t("billing.admin.plans.unlimited")}
                </TableHead>
                <TableHead className="w-44 px-4 py-3 font-semibold">
                  {t("billing.admin.plans.period")}
                </TableHead>
                {canSaveRows ? (
                  <TableHead className="w-32 px-4 py-3 text-right font-semibold">
                    {t("billing.admin.plans.saveQuota")}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((feature) => {
                const draft =
                  quotaDrafts[feature.featureKey] ??
                  createDefaultQuotaDraft(feature);
                const periods = getAllowedPeriods(feature, draft.period);
                const periodValue = periods.includes(draft.period)
                  ? draft.period
                  : periods[0];
                const isSaving = savingFeatureKey === feature.featureKey;
                const recommendedLimit = readRecommendedLimit(
                  feature,
                  planCode,
                );

                return (
                  <TableRow
                    key={feature.featureKey}
                    className="border-b border-border last:border-0"
                  >
                    <TableCell className="px-4 py-4 align-top">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">
                            {feature.label}
                          </div>
                          {feature.description ? (
                            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                              {feature.description}
                            </p>
                          ) : null}
                          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                            {feature.featureKey}
                          </div>
                          {recommendedLimit !== null ? (
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {t("billing.admin.plans.recommendedLimit", {
                                value: formatQuotaLimit(
                                  recommendedLimit,
                                  periodValue,
                                  t,
                                ),
                              })}
                            </div>
                          ) : null}
                        </div>
                        {feature.description ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded-full"
                                aria-label={`${feature.label}: ${feature.description}`}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {feature.description}
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                      {errors[feature.featureKey] ? (
                        <p className="mt-2 text-xs font-medium text-destructive">
                          {errors[feature.featureKey]}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-4 py-4 align-top">
                      {isLoadingUsage ? (
                        <div className="flex items-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : isErrorUsage ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-xs text-destructive">Error</span>
                          {onRetryUsage ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-[11px]"
                              onClick={onRetryUsage}
                            >
                              Retry
                            </Button>
                          ) : null}
                        </div>
                      ) : usageByFeature ? (
                        <div className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs font-semibold">
                          {t("billing.admin.plans.usersCount", {
                            count: usageByFeature[feature.featureKey] ?? 0,
                          })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 align-top">
                      <Label
                        htmlFor={quotaElementId(feature.featureKey, "limit")}
                        className="sr-only"
                      >
                        {`Limit for ${feature.label}`}
                      </Label>
                      <Input
                        id={quotaElementId(feature.featureKey, "limit")}
                        type="number"
                        min={0}
                        step={1}
                        value={draft.limitValue}
                        disabled={draft.unlimited || isSaving}
                        onChange={(event) =>
                          onDraftChange(feature, {
                            limitValue: event.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={quotaElementId(feature.featureKey, "unlimited")}
                          aria-label={`Unlimited for ${feature.label}`}
                          checked={draft.unlimited}
                          disabled={isSaving}
                          onCheckedChange={(checked) =>
                            onDraftChange(feature, {
                              unlimited: checked === true,
                            })
                          }
                        />
                        <Label
                          htmlFor={quotaElementId(
                            feature.featureKey,
                            "unlimited",
                          )}
                          className="text-xs"
                        >
                          {draft.unlimited
                            ? t("billing.admin.plans.unlimitedValue")
                            : t("billing.admin.plans.limitedValue")}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 align-top">
                      <Select
                        value={periodValue}
                        onValueChange={(period) =>
                          onDraftChange(feature, { period })
                        }
                        disabled={isSaving || periods.length <= 1}
                      >
                        <SelectTrigger
                          aria-label={`Period for ${feature.label}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {periods.map((period) => (
                              <SelectItem key={period} value={period}>
                                {period}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {canSaveRows ? (
                      <TableCell className="px-4 py-4 text-right align-top">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`Save ${feature.label} quota`}
                          disabled={isSaving}
                          onClick={() => onSave(feature)}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {t("billing.admin.plans.saveQuota")}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const inputId = useId();

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-11"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  const triggerId = useId();

  return (
    <div>
      <Label htmlFor={triggerId}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={triggerId} className="mt-1.5 h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function buildQuotaDrafts(
  features: AdminBillingFeatureCatalogDto[],
  plan?: BillingPlanDto,
): QuotaDrafts {
  const currentFeatures = new Map(
    (plan?.features ?? []).map((feature) => [feature.featureKey, feature]),
  );

  return Object.fromEntries(
    features.map((feature) => {
      const current = currentFeatures.get(feature.featureKey);
      return [feature.featureKey, createDefaultQuotaDraft(feature, current)];
    }),
  );
}

function createDefaultQuotaDraft(
  feature: AdminBillingFeatureCatalogDto,
  current?: BillingPlanDto["features"][number],
): QuotaDraft {
  const limitValue = readPlanFeatureLimit(current);
  const unlimited = limitValue === -1;
  return {
    limitValue: unlimited ? "0" : String(Math.max(0, limitValue)),
    period: current?.period ?? getAllowedPeriods(feature)[0],
    unlimited,
  };
}

function readPlanFeatureLimit(feature?: BillingPlanDto["features"][number]) {
  if (!feature) return 0;
  return feature.limitValue ?? feature.limit ?? 0;
}

function getAllowedPeriods(
  feature: AdminBillingFeatureCatalogDto,
  fallback = "MONTHLY",
) {
  return feature.allowedPeriods?.length ? feature.allowedPeriods : [fallback];
}

function readRecommendedLimit(
  feature: AdminBillingFeatureCatalogDto,
  planCode: string,
) {
  const normalizedPlanCode = planCode.trim().toUpperCase();
  if (!normalizedPlanCode || !feature.recommendedLimits) return null;
  const limit = feature.recommendedLimits[normalizedPlanCode];
  return typeof limit === "number" ? limit : null;
}

function toQuotaPayload(
  feature: AdminBillingFeatureCatalogDto,
  draft: QuotaDraft,
) {
  const periods = getAllowedPeriods(feature, draft.period);
  const period = periods.includes(draft.period) ? draft.period : periods[0];
  if (draft.unlimited) return { limitValue: -1, period };

  const limit = Number(draft.limitValue);
  return {
    limitValue: Number.isFinite(limit) ? Math.max(0, Math.trunc(limit)) : 0,
    period,
  };
}

function toFeatureInputs(
  features: AdminBillingFeatureCatalogDto[],
  drafts: QuotaDrafts,
) {
  return features.map((feature) => ({
    featureKey: feature.featureKey,
    ...toQuotaPayload(
      feature,
      drafts[feature.featureKey] ?? createDefaultQuotaDraft(feature),
    ),
  }));
}

function toCreatePayload(
  form: PlanForm,
  features: AdminBillingFeatureCatalogDto[],
  quotaDrafts: QuotaDrafts,
): CreateAdminBillingPlanDto {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    category: form.category as "SUBSCRIPTION" | "MENTOR_PACKAGE",
    interval: form.interval as "MONTHLY" | "ONE_TIME",
    priceVnd: Number(form.priceVnd) || 0,
    currency: form.currency || "VND",
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder) || 0,
    metadata: null,
    features: toFeatureInputs(features, quotaDrafts),
  };
}

function formatQuotaLimit(
  limitValue: number,
  period: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (limitValue === -1) return t("billing.admin.plans.unlimitedValue");
  if (limitValue === 0) return t("billing.admin.plans.notIncludedValue");
  return t("billing.admin.plans.quotaValue", {
    limit: limitValue,
    period: period.toLowerCase(),
  });
}

function quotaElementId(featureKey: string, suffix: string) {
  return `quota-${featureKey.replace(/[^a-zA-Z0-9_-]/g, "-")}-${suffix}`;
}

function omitKey<TValue>(value: Record<string, TValue>, key: string) {
  const next = { ...value };
  delete next[key];
  return next;
}
