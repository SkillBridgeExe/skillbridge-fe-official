import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save, Settings2 } from "lucide-react";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QUERY_KEYS } from "@/constants/app";
import { formatVnd, StatusBadge } from "@/lib/billing-ui";
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

const emptyForm = () => ({
  code: "",
  name: "",
  description: "",
  category: "SUBSCRIPTION",
  interval: "MONTHLY",
  priceVnd: "129000",
  currency: "VND",
  isActive: true,
  sortOrder: "10",
  features: DEFAULT_FEATURES,
});

export default function AdminBillingPlans() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [includeInactive, setIncludeInactive] = useState(true);
  const [selectedCode, setSelectedCode] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const plansQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_BILLING_PLANS(includeInactive),
    queryFn: () => getAdminBillingPlans(includeInactive),
  });

  const selectedPlan = useMemo(
    () => plansQuery.data?.find((plan) => plan.code === selectedCode),
    [plansQuery.data, selectedCode],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "billing", "plans"] });

  const closeForm = () => {
    setFormDialogOpen(false);
    setSelectedCode("");
  };

  const createMutation = useMutation({
    mutationFn: () => createAdminBillingPlan(toCreatePayload(form)),
    onSuccess: async () => {
      await invalidate();
      closeForm();
      toast({ title: t("billing.admin.plans.toastCreated") });
    },
    onError: (error) =>
      toast({
        title: t("billing.admin.plans.toastCreateFailed"),
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateAdminBillingPlan(selectedCode, {
        name: form.name,
        description: form.description || null,
        category: form.category as "SUBSCRIPTION" | "MENTOR_PACKAGE",
        interval: form.interval as "MONTHLY" | "ONE_TIME",
        priceVnd: Number(form.priceVnd) || 0,
        currency: form.currency || "VND",
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      }),
    onSuccess: async () => {
      await invalidate();
      closeForm();
      toast({ title: t("billing.admin.plans.toastUpdated") });
    },
    onError: (error) =>
      toast({
        title: t("billing.admin.plans.toastUpdateFailed"),
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  const featuresMutation = useMutation({
    mutationFn: () => replaceAdminPlanFeatures(selectedCode, { features: parseFeatures(form.features) }),
    onSuccess: async () => {
      await invalidate();
      closeForm();
      toast({ title: t("billing.admin.plans.toastFeaturesSaved") });
    },
    onError: (error) =>
      toast({
        title: t("billing.admin.plans.toastFeaturesFailed"),
        description: getApiErrorMessage(error),
        variant: "destructive",
      }),
  });

  const openCreateDialog = () => {
    setSelectedCode("");
    setForm(emptyForm());
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
      features:
        plan.features
          ?.map((feature) => `${feature.featureKey}:${feature.limitValue ?? feature.limit}:${feature.period ?? "MONTHLY"}`)
          .join("\n") || DEFAULT_FEATURES,
    });
    setFormDialogOpen(true);
  };

  const plans = plansQuery.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-primary">{t("billing.admin.eyebrow")}</p>
          <h1 className="text-3xl font-bold tracking-normal text-foreground">{t("billing.admin.plans.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("billing.admin.plans.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIncludeInactive((value) => !value)}>
            {includeInactive ? t("billing.admin.plans.hideInactive") : t("billing.admin.plans.showInactive")}
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
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">{t("billing.admin.table.code")}</th>
                <th>{t("billing.admin.table.name")}</th>
                <th>{t("billing.admin.table.category")}</th>
                <th>{t("billing.admin.table.interval")}</th>
                <th>{t("billing.admin.table.price")}</th>
                <th>{t("billing.admin.table.status")}</th>
                <th className="w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.code} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 font-mono font-semibold">{plan.code}</td>
                  <td className="font-semibold">{plan.name}</td>
                  <td>{plan.category}</td>
                  <td>{plan.interval}</td>
                  <td>{formatVnd(plan.priceVnd)}</td>
                  <td>
                    <StatusBadge status={plan.isActive === false ? "INACTIVE" : "ACTIVE"} />
                  </td>
                  <td className="text-center">
                    <AdminIconActionButton label={t("billing.admin.common.edit")} variant="outline" onClick={() => loadPlan(plan)}>
                      <Pencil data-icon="inline-start" />
                    </AdminIconActionButton>
                  </td>
                </tr>
              ))}
              {!plans.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    {plansQuery.isLoading ? t("billing.common.loading") : "No billing plans found."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={formDialogOpen} onOpenChange={(open) => (open ? setFormDialogOpen(true) : closeForm())}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan ? t("billing.admin.plans.editTitle", { code: selectedPlan.code }) : t("billing.admin.plans.createTitle")}
            </DialogTitle>
            <DialogDescription>{t("billing.admin.plans.subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("billing.admin.table.code")} value={form.code} onChange={(code) => setForm((prev) => ({ ...prev, code }))} disabled={Boolean(selectedPlan)} />
              <Field label={t("billing.admin.table.name")} value={form.name} onChange={(name) => setForm((prev) => ({ ...prev, name }))} />
              <SelectField
                label={t("billing.admin.table.category")}
                value={form.category}
                onChange={(category) => setForm((prev) => ({ ...prev, category }))}
                options={["SUBSCRIPTION", "MENTOR_PACKAGE"]}
              />
              <SelectField
                label={t("billing.admin.table.interval")}
                value={form.interval}
                onChange={(interval) => setForm((prev) => ({ ...prev, interval }))}
                options={["MONTHLY", "ONE_TIME"]}
              />
              <Field label={t("billing.admin.plans.priceVnd")} value={form.priceVnd} onChange={(priceVnd) => setForm((prev) => ({ ...prev, priceVnd }))} />
              <Field label={t("billing.admin.plans.sortOrder")} value={form.sortOrder} onChange={(sortOrder) => setForm((prev) => ({ ...prev, sortOrder }))} />
              <Field label="Currency" value={form.currency} onChange={(currency) => setForm((prev) => ({ ...prev, currency }))} />
            </div>

            <div>
              <Label>{t("billing.admin.plans.description")}</Label>
              <Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="mt-1.5" />
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <Checkbox checked={form.isActive} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked === true }))} />
              {t("billing.admin.status.active")}
            </label>

            <div>
              <Label>{t("billing.admin.plans.features")}</Label>
              <Textarea
                value={form.features}
                onChange={(event) => setForm((prev) => ({ ...prev, features: event.target.value }))}
                className="mt-1.5 min-h-28 font-mono text-xs"
                placeholder="featureKey:limitValue:period"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            {selectedPlan ? (
              <Button variant="outline" disabled={featuresMutation.isPending} onClick={() => featuresMutation.mutate()}>
                <Settings2 data-icon="inline-start" />
                {t("billing.admin.plans.saveFeatures")}
              </Button>
            ) : null}
            <Button
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={() => (selectedPlan ? updateMutation.mutate() : createMutation.mutate())}
            >
              <Save data-icon="inline-start" />
              {selectedPlan ? t("billing.admin.plans.savePlan") : t("billing.admin.plans.createPlan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <Input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-11" />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5 h-11">
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
  currency: string;
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
    currency: form.currency || "VND",
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder) || 0,
    metadata: null,
    features: parseFeatures(form.features),
  };
}
