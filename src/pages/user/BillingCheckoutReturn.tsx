import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/api-error";
import { reconcileOrder } from "@/services/billing.service";

export default function BillingCheckoutReturn() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const orderCode = searchParams.get("orderCode");
  const providerStatus = searchParams.get("status");
  const cancelled = searchParams.get("cancel") === "true";

  const statusText = useMemo(() => {
    if (cancelled) return "CANCELLED";
    return providerStatus || "PENDING";
  }, [cancelled, providerStatus]);

  useEffect(() => {
    if (!orderCode) return;
    let active = true;
    reconcileOrder(orderCode)
      .then(() => {
        if (active) navigate(`/billing/checkout/${orderCode}`, { replace: true });
      })
      .catch((err) => {
        if (active) setError(getApiErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [navigate, orderCode]);

  if (!orderCode) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-4 py-10">
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="font-poppins text-2xl font-black">
                {t("billing.checkout.returnMissingTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">{t("billing.checkout.returnMissingDesc")}</p>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/pricing">{t("billing.pricing.title")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <p className="text-sm font-bold uppercase tracking-wider text-[#00AEEF]">
              {t("billing.checkout.eyebrow")}
            </p>
            <CardTitle className="mt-2 font-poppins text-2xl font-black">
              {t("billing.checkout.returnTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                <div className="mb-2 flex items-center gap-2 font-bold">
                  <AlertCircle className="h-4 w-4" />
                  {t("billing.checkout.returnErrorTitle")}
                </div>
                <p>{error}</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin text-[#00AEEF]" />
                <span>{t("billing.checkout.returnReconciling")}</span>
              </div>
            )}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
              <p className="font-semibold text-slate-900">{t("billing.checkout.orderCode")}: {orderCode}</p>
              <p className="mt-1 text-slate-500">payOS: {statusText}</p>
            </div>
            {error ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
                  {t("billing.checkout.checkAgain")}
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to={`/billing/checkout/${orderCode}`}>{t("billing.checkout.viewOrder")}</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
