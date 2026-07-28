import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import AdminIconActionButton from "@/components/admin/AdminIconActionButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QUERY_KEYS } from "@/constants/app";
import { useToast } from "@/hooks/use-toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate } from "@/lib/billing-ui";
import {
  createAdminVoucher,
  getAdminVouchers,
  updateAdminVoucher,
  type AdminVoucherDto,
  type AdminVouchersQuery,
  type AdminVoucherStatus,
} from "@/services/admin-billing.service";

const EMPTY_FORM = {
  code: "",
  discountPercent: "10",
  startsAt: "",
  endsAt: "",
  maxRedemptions: "100",
  perUserLimit: "1",
  internalNote: "",
  isActive: true,
};

type VoucherForm = typeof EMPTY_FORM;

export default function AdminBillingVouchers() {
  const { t } = useTranslation("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminVoucherStatus | "">("");
  const [editing, setEditing] = useState<AdminVoucherDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<VoucherForm>(EMPTY_FORM);

  const query = useMemo<AdminVouchersQuery>(
    () => ({
      page,
      limit: 20,
      search: search.trim() || undefined,
      status: status || undefined,
    }),
    [page, search, status],
  );
  const vouchersQuery = useQuery({
    queryKey: QUERY_KEYS.ADMIN_BILLING_VOUCHERS(query),
    queryFn: () => getAdminVouchers(query),
    placeholderData: keepPreviousData,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountPercent: Number(form.discountPercent),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        maxRedemptions: Number(form.maxRedemptions),
        perUserLimit: Number(form.perUserLimit),
        internalNote: form.internalNote.trim() || null,
        isActive: form.isActive,
      };
      return editing
        ? updateAdminVoucher(editing.id, payload)
        : createAdminVoucher(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "billing", "vouchers"] });
      setFormOpen(false);
      toast({ title: t("billing.admin.vouchers.saved") });
    },
    onError: (error) => {
      toast({
        title: t("billing.admin.vouchers.saveFailed"),
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ voucher, isActive }: { voucher: AdminVoucherDto; isActive: boolean }) =>
      updateAdminVoucher(voucher.id, { isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "billing", "vouchers"] });
    },
    onError: (error) => {
      toast({
        title: t("billing.admin.vouchers.saveFailed"),
        description: getApiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };
  const openEdit = (voucher: AdminVoucherDto) => {
    setEditing(voucher);
    setForm({
      code: voucher.code,
      discountPercent: String(voucher.discountPercent),
      startsAt: toLocalDateTime(voucher.startsAt),
      endsAt: toLocalDateTime(voucher.endsAt),
      maxRedemptions: String(voucher.maxRedemptions),
      perUserLimit: String(voucher.perUserLimit),
      internalNote: voucher.internalNote ?? "",
      isActive: voucher.isActive,
    });
    setFormOpen(true);
  };
  const items = vouchersQuery.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((vouchersQuery.data?.total ?? 0) / 20));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">{t("billing.admin.eyebrow")}</p>
          <h1 className="text-3xl font-bold">{t("billing.admin.vouchers.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("billing.admin.vouchers.subtitle")}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("billing.admin.vouchers.create")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("billing.admin.common.filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input
            value={search}
            placeholder={t("billing.admin.vouchers.search")}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as AdminVoucherStatus | "");
              setPage(1);
            }}
          >
            <option value="">{t("billing.admin.vouchers.allStatuses")}</option>
            {["ACTIVE", "UPCOMING", "EXPIRED", "INACTIVE"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("billing.admin.vouchers.code")}</TableHead>
                <TableHead>{t("billing.admin.vouchers.discount")}</TableHead>
                <TableHead>{t("billing.admin.vouchers.period")}</TableHead>
                <TableHead>{t("billing.admin.vouchers.usage")}</TableHead>
                <TableHead>{t("billing.admin.vouchers.remaining")}</TableHead>
                <TableHead>{t("billing.admin.table.status")}</TableHead>
                <TableHead>{t("billing.admin.vouchers.enabled")}</TableHead>
                <TableHead className="text-right">{t("billing.admin.vouchers.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-mono font-semibold">{voucher.code}</TableCell>
                  <TableCell>{voucher.discountPercent}%</TableCell>
                  <TableCell>
                    <span className="block">{formatDate(voucher.startsAt)}</span>
                    <span className="block text-muted-foreground">{formatDate(voucher.endsAt)}</span>
                  </TableCell>
                  <TableCell>
                    {voucher.redeemedCount} {t("billing.admin.vouchers.redeemed")}
                    <span className="block text-muted-foreground">
                      {voucher.reservedCount} {t("billing.admin.vouchers.reserved")}
                    </span>
                  </TableCell>
                  <TableCell>{voucher.remainingCount}/{voucher.maxRedemptions}</TableCell>
                  <TableCell><Badge variant="outline">{voucher.status}</Badge></TableCell>
                  <TableCell>
                    <Switch
                      checked={voucher.isActive}
                      disabled={toggleMutation.isPending}
                      onCheckedChange={(isActive) => toggleMutation.mutate({ voucher, isActive })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminIconActionButton label={t("billing.admin.vouchers.edit")} onClick={() => openEdit(voucher)}>
                      <Pencil />
                    </AdminIconActionButton>
                  </TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    {vouchersQuery.isLoading
                      ? t("billing.common.loading")
                      : t("billing.admin.vouchers.empty")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t p-4 text-sm">
              <span>{page}/{totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                  {t("billing.admin.vouchers.previous")}
                </Button>
                <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>
                  {t("billing.admin.vouchers.next")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <VoucherDialog
        open={formOpen}
        editing={editing}
        form={form}
        pending={saveMutation.isPending}
        onFormChange={setForm}
        onOpenChange={setFormOpen}
        onSave={() => saveMutation.mutate()}
      />
    </div>
  );
}

function VoucherDialog({
  open,
  editing,
  form,
  pending,
  onFormChange,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  editing: AdminVoucherDto | null;
  form: VoucherForm;
  pending: boolean;
  onFormChange: (form: VoucherForm) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const { t } = useTranslation("common");
  const field = (key: keyof VoucherForm, value: string | boolean) =>
    onFormChange({ ...form, [key]: value });
  const valid =
    form.code.trim() &&
    form.startsAt &&
    form.endsAt &&
    Number(form.discountPercent) >= 1 &&
    Number(form.discountPercent) <= 99 &&
    Number(form.maxRedemptions) >= 1 &&
    Number(form.perUserLimit) >= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("billing.admin.vouchers.edit") : t("billing.admin.vouchers.create")}
          </DialogTitle>
          <DialogDescription>{t("billing.admin.vouchers.formDescription")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <VoucherField label={t("billing.admin.vouchers.code")}>
            <Input value={form.code} disabled={editing?.immutable} onChange={(e) => field("code", e.target.value.toUpperCase())} />
          </VoucherField>
          <VoucherField label={t("billing.admin.vouchers.discount")}>
            <Input type="number" min={1} max={99} value={form.discountPercent} disabled={editing?.immutable} onChange={(e) => field("discountPercent", e.target.value)} />
          </VoucherField>
          <VoucherField label={t("billing.admin.vouchers.startsAt")}>
            <Input type="datetime-local" value={form.startsAt} onChange={(e) => field("startsAt", e.target.value)} />
          </VoucherField>
          <VoucherField label={t("billing.admin.vouchers.endsAt")}>
            <Input type="datetime-local" value={form.endsAt} onChange={(e) => field("endsAt", e.target.value)} />
          </VoucherField>
          <VoucherField label={t("billing.admin.vouchers.totalLimit")}>
            <Input type="number" min={1} value={form.maxRedemptions} onChange={(e) => field("maxRedemptions", e.target.value)} />
          </VoucherField>
          <VoucherField label={t("billing.admin.vouchers.userLimit")}>
            <Input type="number" min={1} value={form.perUserLimit} onChange={(e) => field("perUserLimit", e.target.value)} />
          </VoucherField>
          <VoucherField label={t("billing.admin.vouchers.note")} className="sm:col-span-2">
            <Input value={form.internalNote} onChange={(e) => field("internalNote", e.target.value)} />
          </VoucherField>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch checked={form.isActive} onCheckedChange={(value) => field("isActive", value)} />
            <Label>{t("billing.admin.vouchers.enabled")}</Label>
          </div>
          {editing?.immutable ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              {t("billing.admin.vouchers.immutable")}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {t("billing.admin.vouchers.cancel")}
          </Button>
          <Button disabled={!valid || pending} onClick={onSave}>
            {t("billing.admin.vouchers.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoucherField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
