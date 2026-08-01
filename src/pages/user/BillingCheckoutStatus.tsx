import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePostHog } from "@posthog/react";
import type { TFunction } from "i18next";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { QUERY_KEYS } from "@/constants/app";
import {
  createSingleFlight,
  doesPayOSReturnUrlMatchPage,
  getBillingCheckoutSurfaceState,
  getBillingOrderPollInterval,
  getBillingOrderStatusMeta,
  getMentorCheckoutStage,
  getPublicCheckoutSummaryItems,
  isTerminalBillingOrderStatus,
  isInvalidPayOSEvent,
  parsePayOSReturnParams,
  shouldCaptureSubscriptionPaymentPaid,
} from "@/lib/billing-checkout";
import {
  loadPayOSCheckoutScript,
  type PayOSController,
  type PayOSEvent,
} from "@/lib/payos-checkout-script";
import { formatVnd, StatusBadge } from "@/lib/billing-ui";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { getOrderStatus, reconcileOrder, type OrderStatusResponseDto } from "@/services/billing.service";
import { useHasApiSession } from "@/hooks/use-api-session";

const PAYOS_QUERY_KEYS = ["code", "id", "cancel", "status", "orderCode"] as const;
const FAILED_BILLING_ORDER_STATUSES = new Set(["CANCELLED", "EXPIRED", "FAILED"]);

export default function BillingCheckoutStatus() {
  const { t } = useTranslation("common");
  const { orderCode = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const pollingStartedAtRef = useRef<number | null>(null);
  const capturedPaidOrderRef = useRef<string | null>(null);
  const capturedFailedOrderRef = useRef<string | null>(null);
  const capturedEmbedFailureRef = useRef<string | null>(null);
  const payOSControllerRef = useRef<PayOSController | null>(null);
  const reconcileFlightRef = useRef<ReturnType<
    typeof createSingleFlight<string, OrderStatusResponseDto | null>
  > | null>(null);
  reconcileFlightRef.current ??= createSingleFlight<string, OrderStatusResponseDto | null>();
  const hasApiSession = useHasApiSession();
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState === "visible",
  );
  const [embedState, setEmbedState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [copied, setCopied] = useState(false);

  const elementId = useMemo(() => `payos-checkout-${orderCode || "order"}`, [orderCode]);
  const payOSReturn = useMemo(
    () => parsePayOSReturnParams(new URLSearchParams(location.search)),
    [location.search],
  );
  const hasPayOSReturnQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return PAYOS_QUERY_KEYS.some((key) => params.has(key));
  }, [location.search]);

  const orderQuery = useQuery({
    queryKey: QUERY_KEYS.BILLING_ORDER(orderCode),
    queryFn: () => getOrderStatus(orderCode),
    enabled: Boolean(orderCode) && hasApiSession,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      pollingStartedAtRef.current ??= Date.now();
      return getBillingOrderPollInterval(
        status,
        Date.now() - pollingStartedAtRef.current,
        isPageVisible,
      );
    },
  });
  const refetchOrder = orderQuery.refetch;
  const refetchOrderRef = useRef(refetchOrder);
  refetchOrderRef.current = refetchOrder;

  const order = orderQuery.data;
  const checkoutUrl = order?.checkoutUrl ?? null;
  const returnUrl = order?.returnUrl ?? null;
  const checkoutSurfaceState = getBillingCheckoutSurfaceState(order?.status, checkoutUrl);
  const canRenderPayOS =
    checkoutSurfaceState === "checkout" &&
    typeof window !== "undefined" &&
    doesPayOSReturnUrlMatchPage(returnUrl, window.location.href);
  const publicSummary = useMemo(() => {
    if (!order) return null;
    return Object.fromEntries(
      getPublicCheckoutSummaryItems(order).map((item) => [item.key, item.value]),
    ) as Record<"amount" | "purpose" | "status" | "orderCode", string>;
  }, [order]);
  const localizedStatusLabel = publicSummary
    ? t(`billing.checkout.statusLabels.${publicSummary.status}`, {
        defaultValue: getBillingOrderStatusMeta(publicSummary.status).label,
      })
    : "";
  const embedInvalidParamsMessage = t("billing.checkout.embedInvalidParams");
  const embedErrorDescription = t("billing.checkout.embedErrorDesc");
  const mentorCheckoutStage = useMemo(() => getMentorCheckoutStage(order), [order]);

  const applyPaidInvalidation = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING_SUBSCRIPTION });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING_USAGE });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING_ENTITLEMENTS });
    // Also invalidate mentor booking state.
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_MENTOR_BOOKINGS });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MENTOR_OWNED_BOOKINGS });
  }, [queryClient]);

  const reconcileLatest = useCallback(async () => {
    if (!orderCode || !hasApiSession) return null;
    return reconcileFlightRef.current!.run(orderCode, async () => {
      setIsReconciling(true);
      setVerifyError(null);
      try {
        const nextOrder = await reconcileOrder(orderCode);
        if (nextOrder) {
          queryClient.setQueryData(QUERY_KEYS.BILLING_ORDER(orderCode), nextOrder);
          if (nextOrder.status === "PAID") applyPaidInvalidation();
        }
        return nextOrder;
      } catch (error) {
        setVerifyError(getApiErrorMessage(error));
        throw error;
      } finally {
        setIsReconciling(false);
      }
    });
  }, [applyPaidInvalidation, hasApiSession, orderCode, queryClient]);

  const checkAgain = useCallback(() => {
    void reconcileLatest().catch(() => undefined);
  }, [reconcileLatest]);

  const cancelCheckout = useCallback(() => {
    payOSControllerRef.current?.exit?.();
    payOSControllerRef.current = null;
    setEmbedState("idle");
    navigate(order?.targetType === "MENTOR_BOOKING" ? "/billing/mentor" : "/pricing");
  }, [navigate, order?.targetType]);

  const copyOrderCode = useCallback(async () => {
    if (!publicSummary?.orderCode) return;
    await navigator.clipboard?.writeText(publicSummary.orderCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [publicSummary?.orderCode]);

  useEffect(() => {
    pollingStartedAtRef.current = null;
  }, [orderCode]);

  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (order?.status === "PAID") applyPaidInvalidation();
  }, [applyPaidInvalidation, order?.status]);

  useEffect(() => {
    if (!shouldCaptureSubscriptionPaymentPaid(order)) return;

    const capturedKey = String(order.orderCode);
    if (capturedPaidOrderRef.current === capturedKey) return;

    capturedPaidOrderRef.current = capturedKey;
    posthog?.capture("subscription_payment_paid", {
      order_id: order.orderId,
      order_code: order.orderCode,
      amount_vnd: order.amountVnd,
      currency: order.currency,
      purpose: order.purpose,
      target_type: order.targetType,
      target_id: order.targetId,
      paid_at: order.paidAt,
    });
  }, [order, posthog]);

  useEffect(() => {
    if (!order || !FAILED_BILLING_ORDER_STATUSES.has(order.status)) return;

    const capturedKey = String(order.orderCode);
    if (capturedFailedOrderRef.current === capturedKey) return;

    capturedFailedOrderRef.current = capturedKey;
    posthog?.capture("checkout_failed", {
      order_id: order.orderId,
      order_code: order.orderCode,
      status: order.status,
      error_code: order.status.toLowerCase(),
    });
  }, [order, posthog]);

  useEffect(() => {
    if (!hasPayOSReturnQuery || !orderCode) return;
    let active = true;
    void reconcileLatest()
      .then(() => {
        if (active) navigate(`/billing/checkout/${orderCode}`, { replace: true });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [hasPayOSReturnQuery, navigate, orderCode, reconcileLatest]);

  useEffect(() => {
    if (checkoutSurfaceState !== "checkout" || !checkoutUrl || canRenderPayOS) return;
    const capturedKey = `${orderCode}:return_url_mismatch`;
    if (capturedEmbedFailureRef.current === capturedKey) return;
    capturedEmbedFailureRef.current = capturedKey;
    posthog?.capture("checkout_embed_failed", {
      order_code: orderCode,
      reason: returnUrl ? "return_url_mismatch" : "missing_return_url",
    });
  }, [canRenderPayOS, checkoutSurfaceState, checkoutUrl, orderCode, posthog, returnUrl]);

  useEffect(() => {
    if (!canRenderPayOS || !checkoutUrl || !returnUrl) {
      setEmbedState("idle");
      return;
    }

    let active = true;
    const container = document.getElementById(elementId);
    if (container) container.innerHTML = "";

    setEmbedState("loading");
    setEmbedError(null);

    loadPayOSCheckoutScript()
      .then(() => {
        if (!active) return;
        if (!window.PayOSCheckout?.usePayOS) {
          throw new Error("payOS checkout script is not ready.");
        }
        const handleProviderEvent = (event: PayOSEvent | undefined, action: "reconcile" | "refresh") => {
          if (!active) return;
          if (isInvalidPayOSEvent(event)) {
            setEmbedState("error");
            setEmbedError(embedInvalidParamsMessage);
            posthog?.capture("checkout_embed_failed", {
              order_code: orderCode,
              reason: "invalid_param",
            });
            return;
          }
          if (action === "reconcile") {
            void reconcileLatest().catch(() => undefined);
          } else {
            void refetchOrderRef.current();
          }
        };
        const controller = window.PayOSCheckout.usePayOS({
          RETURN_URL: returnUrl,
          ELEMENT_ID: elementId,
          CHECKOUT_URL: checkoutUrl,
          embedded: true,
          onSuccess: (event) => handleProviderEvent(event, "reconcile"),
          onCancel: (event) => handleProviderEvent(event, "reconcile"),
          onExit: (event) => handleProviderEvent(event, "refresh"),
        });
        payOSControllerRef.current = controller;
        controller.open();
        setEmbedState("ready");
      })
      .catch((error) => {
        if (!active) return;
        setEmbedState("error");
        setEmbedError(error instanceof Error ? error.message : embedErrorDescription);
        posthog?.capture("checkout_embed_failed", {
          order_code: orderCode,
          reason: "script_error",
        });
      });

    return () => {
      active = false;
      payOSControllerRef.current?.exit?.();
      payOSControllerRef.current = null;
      const currentContainer = document.getElementById(elementId);
      if (currentContainer) currentContainer.innerHTML = "";
    };
  }, [
    canRenderPayOS,
    checkoutUrl,
    elementId,
    embedErrorDescription,
    embedInvalidParamsMessage,
    orderCode,
    posthog,
    reconcileLatest,
    returnUrl,
  ]);

  return (
    <Layout>
      <div className="bg-background px-4 py-8 lg:py-10">
        <main className="mx-auto max-w-6xl">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <header className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="font-poppins text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                  {t("billing.checkout.title")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
                  {t("billing.checkout.subtitle")}
                </p>
              </div>
              <Button
                variant="outline"
                className="h-10 w-fit rounded-full border-primary/25 bg-card font-bold text-primary hover:bg-primary/5 hover:text-primary"
                disabled={orderQuery.isFetching || isReconciling}
                onClick={checkAgain}
              >
                {orderQuery.isFetching || isReconciling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {t("billing.checkout.checkAgain")}
              </Button>
            </header>

            {orderQuery.isLoading ? (
              <CheckoutLoading />
            ) : orderQuery.isError ? (
              <div className="p-5 sm:p-7">
                <CheckoutProblem
                  title={t("billing.checkout.unverifiedTitle")}
                  description={t("billing.checkout.statusError")}
                  actionLabel={t("billing.checkout.checkAgain")}
                  onAction={checkAgain}
                />
              </div>
            ) : order && publicSummary ? (
              <>
                <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.72fr)] lg:items-start">
                  <div className="flex min-w-0 flex-col items-center">
                    <PaymentSurface
                      elementId={elementId}
                      embedError={embedError}
                      embedState={embedState}
                      order={order}
                      canRenderPayOS={canRenderPayOS}
                      checkoutSurfaceState={checkoutSurfaceState}
                      onCheckAgain={checkAgain}
                      onCancelCheckout={cancelCheckout}
                    />
                    <p className="mt-4 text-center text-sm font-semibold text-muted-foreground">
                      {t("billing.checkout.iframeHint")}
                    </p>
                  </div>

                  <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          {t("billing.checkout.amountDue")}
                        </p>
                        <p className="mt-3 font-poppins text-4xl font-black leading-none text-primary">
                          {formatVnd(Number(publicSummary.amount))}
                        </p>
                      </div>
                      <StatusBadge status={publicSummary.status} label={localizedStatusLabel} />
                    </div>

                    <div className="my-6 h-px bg-border" />

                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="bg-primary px-4 py-3 text-xs font-black uppercase tracking-wider text-primary-foreground">
                        {t("billing.checkout.paymentContent")}
                      </div>
                      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <span className="break-all font-mono text-xl font-black tracking-wide text-primary">
                          {publicSummary.orderCode}
                        </span>
                        <Button
                          type="button"
                          className="h-9 rounded-full bg-primary px-4 font-black text-primary-foreground hover:bg-primary/90"
                          onClick={copyOrderCode}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {copied ? t("billing.checkout.copied") : t("billing.checkout.copy")}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                      <CleanInfoRow
                        label={t("billing.checkout.package")}
                        value={getPurposeLabel(publicSummary.purpose, t)}
                      />
                      <CleanInfoRow
                        label={t("billing.checkout.currentStatus")}
                        value={localizedStatusLabel}
                      />
                    </div>

                    {hasPayOSReturnQuery ? (
                      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                        {t("billing.checkout.providerReturned", {
                          status: payOSReturn.status || (payOSReturn.cancel ? "CANCELLED" : "-"),
                        })}
                      </div>
                    ) : null}

                    {mentorCheckoutStage ? (
                      <MentorCheckoutNextStep
                        onViewBookings={() => navigate("/billing/mentor")}
                      />
                    ) : null}

                    {checkoutSurfaceState === "checkout" && checkoutUrl ? (
                      <Button asChild variant="outline" className="mt-4 h-10 w-full rounded-full bg-card font-bold">
                        <a href={checkoutUrl}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {t("billing.checkout.openFallback")}
                        </a>
                      </Button>
                    ) : null}
                  </aside>
                </div>

                <CheckoutStatusBar
                  isBusy={orderQuery.isFetching || isReconciling}
                  purpose={order.purpose}
                  status={order.status}
                  verifyError={verifyError}
                />
              </>
            ) : (
              <div className="p-5 sm:p-7">
                <CheckoutProblem
                  title={t("billing.checkout.unverifiedTitle")}
                  description={t("billing.checkout.notFound")}
                  actionLabel={t("billing.checkout.checkAgain")}
                  onAction={checkAgain}
                />
              </div>
            )}
          </section>
        </main>
      </div>
    </Layout>
  );
}

function MentorCheckoutNextStep({
  onViewBookings,
}: {
  onViewBookings: () => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-black text-primary">
        {t("billing.checkout.mentorBookingPaidTitle", "Mentor session confirmed")}
      </p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {t(
          "billing.checkout.mentorBookingPaidDesc",
          "Your mentor session is confirmed. Check the booking page for the meeting link.",
        )}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onViewBookings} className="h-10 rounded-full bg-card font-bold">
          {t("billing.checkout.viewMentorBooking", "View booking")}
        </Button>
      </div>
    </div>
  );
}

function PaymentSurface({
  elementId,
  embedError,
  embedState,
  order,
  canRenderPayOS,
  checkoutSurfaceState,
  onCheckAgain,
  onCancelCheckout,
}: {
  elementId: string;
  embedError: string | null;
  embedState: "idle" | "loading" | "ready" | "error";
  order: OrderStatusResponseDto;
  canRenderPayOS: boolean;
  checkoutSurfaceState: ReturnType<typeof getBillingCheckoutSurfaceState>;
  onCheckAgain: () => void;
  onCancelCheckout: () => void;
}) {
  const { t } = useTranslation("common");

  if (isTerminalBillingOrderStatus(order.status)) {
    return (
      <div className="flex h-[480px] w-full max-w-[480px] flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 p-6 text-center shadow-sm">
        <StatusIcon status={order.status} large />
        <h3 className="mt-4 font-poppins text-2xl font-black text-foreground">
          {t(`billing.checkout.statusLabels.${order.status}`, {
            defaultValue: getBillingOrderStatusMeta(order.status).label,
          })}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {t(`billing.checkout.statusBar.${order.status}`, {
            defaultValue: t("billing.checkout.statusBar.UNKNOWN"),
          })}
        </p>
      </div>
    );
  }

  if (checkoutSurfaceState === "processing") {
    return (
      <div className="flex h-[480px] w-full max-w-[480px] flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 p-6 text-center shadow-sm">
        <StatusIcon status={order.status} large />
        <h3 className="mt-4 font-poppins text-2xl font-black text-foreground">
          {t(`billing.checkout.statusLabels.${order.status}`, {
            defaultValue: getBillingOrderStatusMeta(order.status).label,
          })}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {t(`billing.checkout.statusBar.${order.status}`, {
            defaultValue: t("billing.checkout.statusBar.UNKNOWN"),
          })}
        </p>
        <Button variant="outline" className="mt-5 rounded-full bg-card font-bold" onClick={onCheckAgain}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("billing.checkout.checkAgain")}
        </Button>
      </div>
    );
  }

  if (!canRenderPayOS) {
    return (
      <div className="flex h-[480px] w-full max-w-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
        <Clock3 className="h-10 w-10 text-primary" />
        <h3 className="mt-4 font-poppins text-xl font-black text-foreground">
          {t("billing.checkout.linkUnavailableTitle")}
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {t("billing.checkout.linkUnavailableDesc")}
        </p>
        <Button variant="outline" className="mt-5 rounded-full bg-card font-bold" onClick={onCheckAgain}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("billing.checkout.checkAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[480px] flex-col items-center gap-3">
      <div className="relative h-[480px] w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm [&_iframe]:h-[520px] [&_iframe]:min-h-[520px] [&_iframe]:w-full [&_iframe]:origin-top [&_iframe]:-translate-y-4 [&_iframe]:scale-[1.24] [&_iframe]:border-0 sm:[&_iframe]:-translate-y-7 sm:[&_iframe]:scale-[1.38]">
        <div id={elementId} className="flex h-[480px] w-full justify-center overflow-hidden" />
        {embedState === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-card/85">
            <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("billing.checkout.embedLoading")}
            </div>
          </div>
        ) : null}
        {embedState === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-card p-6">
            <div className="max-w-md rounded-xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4" />
                {t("billing.checkout.embedErrorTitle")}
              </div>
              <p>{embedError || t("billing.checkout.embedErrorDesc")}</p>
            </div>
          </div>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-10 rounded-full border-destructive/25 bg-card px-5 font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={onCancelCheckout}
      >
        <XCircle className="mr-2 h-4 w-4" />
        {t("billing.checkout.cancelCheckout")}
      </Button>
    </div>
  );
}

function CheckoutLoading() {
  return (
    <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.72fr)]">
      <div className="mx-auto h-[480px] w-full max-w-[480px] animate-pulse rounded-2xl border border-border bg-muted" />
      <div className="h-[520px] animate-pulse rounded-2xl border border-border bg-muted" />
    </div>
  );
}

function CheckoutProblem({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--status-warning-border))] bg-[hsl(var(--status-warning-bg))] p-6 text-[hsl(var(--status-warning-fg))]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h2 className="font-poppins text-xl font-black">{title}</h2>
            <p className="mt-1 text-sm leading-6">{description}</p>
          </div>
        </div>
        <Button variant="outline" className="rounded-full bg-card font-bold" onClick={onAction}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function CleanInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border px-4 py-4 last:border-0">
      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-black text-foreground">{value}</p>
    </div>
  );
}

function CheckoutStatusBar({
  isBusy,
  purpose,
  status,
  verifyError,
}: {
  isBusy: boolean;
  purpose: string;
  status: string;
  verifyError: string | null;
}) {
  const { t } = useTranslation("common");
  const meta = getBillingOrderStatusMeta(status);
  const statusText = verifyError
    ? t("billing.checkout.verifyError", { error: verifyError })
    : isBusy
      ? t("billing.checkout.statusVerifying")
      : status === "PAID" && purpose === "MENTOR_BOOKING"
        ? t("billing.checkout.statusBar.MENTOR_BOOKING_PAID")
      : t(`billing.checkout.statusBar.${status}`, {
          defaultValue: t("billing.checkout.statusBar.UNKNOWN"),
        });

  return (
    <div className="border-t border-border px-5 py-4 sm:px-7">
      <div className="flex min-h-12 items-center justify-center rounded-lg border border-border bg-muted/40 px-4 py-3 text-center text-sm font-black text-primary">
        <span
          className={cn(
            "mr-3 h-2.5 w-2.5 shrink-0 rounded-full",
            meta.tone === "success" && "bg-emerald-500",
            meta.tone === "danger" && "bg-red-500",
            meta.tone === "info" && "bg-sky-500",
            meta.tone === "warning" && "bg-primary",
            meta.tone === "muted" && "bg-slate-400",
          )}
        />
        {statusText}
      </div>
    </div>
  );
}

function StatusIcon({ large, status }: { large?: boolean; status: string }) {
  const meta = getBillingOrderStatusMeta(status);
  const className = cn(
    "rounded-full border",
    large ? "h-14 w-14 p-3" : "h-10 w-10 p-2",
    meta.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-600",
    meta.tone === "danger" && "border-red-200 bg-red-50 text-red-600",
    meta.tone === "info" && "border-sky-200 bg-sky-50 text-sky-600",
    meta.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-600",
    meta.tone === "muted" && "border-slate-200 bg-slate-50 text-slate-500",
  );

  if (meta.tone === "success") return <CheckCircle2 className={className} />;
  if (meta.tone === "danger") return <XCircle className={className} />;
  if (meta.tone === "info") return <Loader2 className={cn(className, "animate-spin")} />;
  return <ShieldCheck className={className} />;
}

function getPurposeLabel(purpose: string, t: TFunction<"common">) {
  return t(`billing.checkout.purposeLabels.${purpose}`, {
    defaultValue: purpose.replace(/_/g, " "),
  });
}
