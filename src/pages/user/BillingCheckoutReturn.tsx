import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parsePayOSReturnParams } from "@/lib/billing-checkout";

export default function BillingCheckoutReturn() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const payOSReturn = useMemo(
    () => parsePayOSReturnParams(new URLSearchParams(location.search)),
    [location.search],
  );

  useEffect(() => {
    if (!payOSReturn.orderCode) return;
    navigate(`/billing/checkout/${payOSReturn.orderCode}${location.search}`, { replace: true });
  }, [location.search, navigate, payOSReturn.orderCode]);

  return (
    <Layout>
      <div className="mx-auto max-w-xl px-4 py-10">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="font-poppins text-2xl font-black">
              {payOSReturn.orderCode
                ? t("billing.checkout.returnTitle")
                : t("billing.checkout.returnMissingTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              {payOSReturn.orderCode
                ? t("billing.checkout.returnRedirecting")
                : t("billing.checkout.returnMissingDesc")}
            </p>
            {!payOSReturn.orderCode ? (
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/pricing">{t("billing.pricing.title")}</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
