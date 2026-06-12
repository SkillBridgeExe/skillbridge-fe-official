import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUERY_KEYS } from "@/constants/app";
import { formatDate, formatVnd, StatusBadge } from "@/lib/billing-ui";
import { getOrderStatus } from "@/services/billing.service";

const DONE_STATUSES = ["PAID", "CANCELLED", "EXPIRED", "FAILED"];

export default function BillingCheckoutStatus() {
  const { t } = useTranslation("common");
  const { orderCode = "" } = useParams();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_ORDER(orderCode),
    queryFn: () => getOrderStatus(orderCode),
    enabled: Boolean(orderCode),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && DONE_STATUSES.includes(status) ? false : 2500;
    },
  });

  const order = orderQuery.data;

  useEffect(() => {
    if (order?.status !== "PAID") return;
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING_SUBSCRIPTION });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING_USAGE });
    // W16: BillingMe + the diagnosis quota line now read /api/me/entitlements — without this the
    // user keeps seeing FREE limits right after upgrading until staleTime expires.
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING_ENTITLEMENTS });
  }, [order?.status, queryClient]);

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[#00AEEF]">{t("billing.checkout.eyebrow")}</p>
                <CardTitle className="mt-2 font-poppins text-3xl font-black">
                  {t("billing.checkout.title")}
                </CardTitle>
              </div>
              {order?.status ? <StatusBadge status={order.status} /> : null}
            </div>
          </CardHeader>
          <CardContent>
            {orderQuery.isLoading ? (
              <div className="flex h-44 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#00AEEF]" />
              </div>
            ) : orderQuery.isError ? (
              // Lỗi mạng/BE ≠ "không tìm thấy đơn" — trang thanh toán không được nói dối trạng thái.
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{t("billing.checkout.statusError")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-full" onClick={() => orderQuery.refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("billing.checkout.checkAgain")}
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/billing/me">{t("billing.checkout.viewMyPlan")}</Link>
                  </Button>
                </div>
              </div>
            ) : order ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label={t("billing.checkout.orderCode")} value={String(order.orderCode)} />
                  <Info label={t("billing.checkout.purpose")} value={order.purpose.replace(/_/g, " ")} />
                  <Info label={t("billing.checkout.amount")} value={formatVnd(order.amountVnd)} />
                  <Info label={t("billing.checkout.created")} value={formatDate(order.createdAt)} />
                  <Info label={t("billing.checkout.paidAt")} value={formatDate(order.paidAt)} />
                  <Info label={t("billing.checkout.target")} value={order.targetType} />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {order.checkoutUrl && order.status === "PENDING" ? (
                    <Button asChild className="rounded-full bg-[#00AEEF] font-bold text-white hover:bg-[#049bd7]">
                      <a href={order.checkoutUrl}>{t("billing.checkout.continuePayment")}</a>
                    </Button>
                  ) : null}
                  <Button variant="outline" className="rounded-full" onClick={() => orderQuery.refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("billing.checkout.checkAgain")}
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/billing/me">{t("billing.checkout.viewMyPlan")}</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t("billing.checkout.notFound")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
    </div>
  );
}
