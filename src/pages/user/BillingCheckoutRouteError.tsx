import { useEffect } from "react";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { usePostHog } from "@posthog/react";
import { Link, useParams, useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

export default function BillingCheckoutRouteError() {
  const { t } = useTranslation("common");
  const { orderCode } = useParams();
  const error = useRouteError();
  const posthog = usePostHog();
  const errorName =
    error && typeof error === "object" && "name" in error && typeof error.name === "string"
      ? error.name
      : "UnknownError";
  const retryPath = orderCode
    ? `/billing/checkout/${encodeURIComponent(orderCode)}`
    : "/billing/me";

  useEffect(() => {
    posthog?.capture("checkout_render_failed", {
      order_code: orderCode ?? null,
      stage: "checkout_route",
      error_name: errorName,
    });
  }, [errorName, orderCode, posthog]);

  return (
    <Layout>
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-10">
        <section
          role="alert"
          className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-950 shadow-sm sm:p-8"
        >
          <AlertCircle aria-hidden="true" className="mx-auto h-11 w-11 text-amber-600" />
          <h1 className="mt-4 font-poppins text-2xl font-black">
            {t("billing.checkout.renderErrorTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-amber-900/80">
            {t("billing.checkout.renderErrorDesc")}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild className="min-h-11 rounded-xl font-bold">
              <a href={retryPath}>
                <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
                {t("billing.checkout.retryPage")}
              </a>
            </Button>
            <Button asChild variant="outline" className="min-h-11 rounded-xl bg-white font-bold">
              <Link to="/pricing">
                <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
                {t("billing.checkout.backToPricing")}
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
