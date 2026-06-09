import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QUERY_KEYS } from "@/constants/app";
import { formatVnd } from "@/lib/billing-ui";
import { getApiErrorMessage } from "@/lib/api-error";
import { useToast } from "@/hooks/use-toast";
import {
  createAdminBillingPlan,
  getAdminBillingPlans,
  replaceAdminPlanFeatures,
  updateAdminBillingPlan,
  type BillingPlanDto,
  type CreateAdminBillingPlanDto,
} from "@/services/admin-billing.service";

const DEFAULT_FEATURES = "cv_review:20:MONTHLY\ncv_builder_create:10:MONTHLY";

export default function AdminBillingPlans() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(true);
  const [selectedCode, setSelectedCode] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    category: "SUBSCRIPTION",
    interval: "MONTHLY",
    priceVnd: "129000",
    isActive: true,
    sortOrder: "10",
    features: DEFAULT_FEATURES,
  });

  const plansQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_BILLING_PLANS(includeInactive),
    queryFn: () => getAdminBillingPlans(includeInactive),
  });

  const selectedPlan = useMemo(
    () => plansQuery.data?.find((plan) => plan.code === selectedCode),
    [plansQuery.data, selectedCode],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "billing", "plans"] });

  const createMutation = useMutation({
    mutationFn: () => createAdminBillingPlan(toCreatePayload(form)),
    onSuccess: async () => {
      await invalidate();
      toast({ title: t("billing.admin.plans.toastCreated") });
    },
    onError: (error) => toast({ title: t("billing.admin.plans.toastCreateFailed"), description: getApiErrorMessage(error), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateAdminBillingPlan(selectedCode, {
        name: form.name,
        description: form.description || null,
        category: form.category as "SUBSCRIPTION" | "MENTOR_PACKAGE",
        interval: form.interval as "MONTHLY" | "ONE_TIME",
        priceVnd: Number(form.priceVnd) || 0,
        currency: "VND",
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      }),
    onSuccess: async () => {
      await invalidate();
      toast({ title: t("billing.admin.plans.toastUpdated") });
    },
    onError: (error) => toast({ title: t("billing.admin.plans.toastUpdateFailed"), description: getApiErrorMessage(error), variant: "destructive" }),
  });

  const featuresMutation = useMutation({
    mutationFn: () => replaceAdminPlanFeatures(selectedCode, { features: parseFeatures(form.features) }),
    onSuccess: async () => {
      await invalidate();
      toast({ title: t("billing.admin.plans.toastFeaturesSaved") });
    },
    onError: (error) => toast({ title: t("billing.admin.plans.toastFeaturesFailed"), description: getApiErrorMessage(error), variant: "destructive" }),
  });

  const loadPlan = (plan: BillingPlanDto) => {
    setSelectedCode(plan.code);
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? "",
      category: plan.category,
      interval: plan.interval,
      priceVnd: String(plan.priceVnd ?? 0),
      isActive: plan.isActive ?? true,
      sortOrder: String(plan.sortOrder ?? 0),
      features:
        plan.features
          ?.map((feature) => `${feature.featureKey}:${feature.limitValue ?? feature.limit}:${feature.period ?? "MONTHLY"}`)
          .join("\n") || DEFAULT_FEATURES,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-primary">{t("billing.admin.eyebrow")}</p>
          <h1 className="text-3xl font-black text-slate-950 dark:text-white">{t("billing.admin.plans.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("billing.admin.plans.subtitle")}</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={() => setIncludeInactive((value) => !value)}>
          {includeInactive ? t("billing.admin.plans.hideInactive") : t("billing.admin.plans.showInactive")}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>{t("billing.admin.plans.listTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b text-left text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3">{t("billing.admin.table.code")}</th>
                  <th>{t("billing.admin.table.name")}</th>
                  <th>{t("billing.admin.table.category")}</th>
                  <th>{t("billing.admin.table.interval")}</th>
                  <th>{t("billing.admin.table.price")}</th>
                  <th>{t("billing.admin.table.status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(plansQuery.data ?? []).map((plan) => (
                  <tr key={plan.code} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="py-3 font-bold">{plan.code}</td>
                    <td>{plan.name}</td>
                    <td>{plan.category}</td>
                    <td>{plan.interval}</td>
                    <td>{formatVnd(plan.priceVnd)}</td>
                    <td>{plan.isActive === false ? t("billing.admin.status.inactive") : t("billing.admin.status.active")}</td>
                    <td className="text-right">
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => loadPlan(plan)}>
                        {t("billing.admin.common.edit")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>{selectedPlan ? t("billing.admin.plans.editTitle", { code: selectedPlan.code }) : t("billing.admin.plans.createTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("billing.admin.table.code")} value={form.code} onChange={(code) => setForm((prev) => ({ ...prev, code }))} disabled={Boolean(selectedPlan)} />
              <Field label={t("billing.admin.table.name")} value={form.name} onChange={(name) => setForm((prev) => ({ ...prev, name }))} />
              <Field label={t("billing.admin.table.category")} value={form.category} onChange={(category) => setForm((prev) => ({ ...prev, category }))} />
              <Field label={t("billing.admin.table.interval")} value={form.interval} onChange={(interval) => setForm((prev) => ({ ...prev, interval }))} />
              <Field label={t("billing.admin.plans.priceVnd")} value={form.priceVnd} onChange={(priceVnd) => setForm((prev) => ({ ...prev, priceVnd }))} />
              <Field label={t("billing.admin.plans.sortOrder")} value={form.sortOrder} onChange={(sortOrder) => setForm((prev) => ({ ...prev, sortOrder }))} />
            </div>
            <div>
              <Label>{t("billing.admin.plans.description")}</Label>
              <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="mt-1.5 rounded-xl" />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              {t("billing.admin.status.active")}
            </label>
            <div>
              <Label>{t("billing.admin.plans.features")}</Label>
              <Textarea
                value={form.features}
                onChange={(event) => setForm((prev) => ({ ...prev, features: event.target.value }))}
                className="mt-1.5 min-h-28 rounded-xl font-mono text-xs"
                placeholder="featureKey:limitValue:period"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-full bg-primary font-bold"
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={() => (selectedPlan ? updateMutation.mutate() : createMutation.mutate())}
              >
                <Save className="mr-2 h-4 w-4" />
                {selectedPlan ? t("billing.admin.plans.savePlan") : t("billing.admin.plans.createPlan")}
              </Button>
              {selectedPlan ? (
                <Button variant="outline" className="rounded-full" disabled={featuresMutation.isPending} onClick={() => featuresMutation.mutate()}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  {t("billing.admin.plans.saveFeatures")}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
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
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-11 rounded-xl" />
    </div>
  );
}

function parseFeatures(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [featureKey, limitValue = "0", period = "MONTHLY"] = line.split(":");
      return { featureKey, limitValue: Number(limitValue) || 0, period };
    });
}

function toCreatePayload(form: {
  code: string;
  name: string;
  description: string;
  category: string;
  interval: string;
  priceVnd: string;
  isActive: boolean;
  sortOrder: string;
  features: string;
}): CreateAdminBillingPlanDto {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    category: form.category as "SUBSCRIPTION" | "MENTOR_PACKAGE",
    interval: form.interval as "MONTHLY" | "ONE_TIME",
    priceVnd: Number(form.priceVnd) || 0,
    currency: "VND",
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder) || 0,
    metadata: null,
    features: parseFeatures(form.features),
  };
}
