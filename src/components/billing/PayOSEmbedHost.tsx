import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
} from "react";
import {
  loadPayOSCheckoutScript,
  type PayOSController,
  type PayOSEvent,
} from "@/lib/payos-checkout-script";

export type PayOSEmbedState = "loading" | "ready" | "error";

export interface PayOSEmbedHandle {
  close: () => void;
}

interface PayOSEmbedHostProps extends Omit<HTMLAttributes<HTMLDivElement>, "id" | "onError"> {
  elementId: string;
  checkoutUrl: string;
  returnUrl: string;
  onSuccess?: (event: PayOSEvent) => void;
  onCancel?: (event: PayOSEvent) => void;
  onExit?: (event: PayOSEvent) => void;
  onStateChange?: (state: PayOSEmbedState, error?: Error) => void;
}

export const PayOSEmbedHost = forwardRef<PayOSEmbedHandle, PayOSEmbedHostProps>(
  function PayOSEmbedHost(
    {
      elementId,
      checkoutUrl,
      returnUrl,
      onSuccess,
      onCancel,
      onExit,
      onStateChange,
      ...hostProps
    },
    ref,
  ) {
    const callbacksRef = useRef({ onSuccess, onCancel, onExit, onStateChange });
    callbacksRef.current = { onSuccess, onCancel, onExit, onStateChange };
    const closeRef = useRef<() => void>(() => undefined);

    useImperativeHandle(ref, () => ({ close: () => closeRef.current() }), []);

    useEffect(() => {
      let active = true;
      let controller: PayOSController | null = null;
      let closeRequested = false;
      let providerClosed = false;

      const close = () => {
        if (!controller || closeRequested || providerClosed) return;
        closeRequested = true;
        try {
          controller.exit?.();
        } catch (error: unknown) {
          if (!active) return;
          const normalizedError =
            error instanceof Error ? error : new Error("Payment checkout could not be closed.");
          callbacksRef.current.onStateChange?.("error", normalizedError);
        }
      };
      closeRef.current = close;

      const dispatchProviderEvent = (
        callback: "onSuccess" | "onCancel" | "onExit",
        event: PayOSEvent,
      ) => {
        if (!active || providerClosed) return;
        providerClosed = true;
        closeRequested = true;
        queueMicrotask(() => {
          if (active) callbacksRef.current[callback]?.(event);
        });
      };

      callbacksRef.current.onStateChange?.("loading");
      void loadPayOSCheckoutScript()
        .then(() => {
          if (!active) return;
          if (!window.PayOSCheckout?.usePayOS) {
            throw new Error("Payment checkout script is not ready.");
          }
          controller = window.PayOSCheckout.usePayOS({
            RETURN_URL: returnUrl,
            ELEMENT_ID: elementId,
            CHECKOUT_URL: checkoutUrl,
            embedded: true,
            onSuccess: (event) => dispatchProviderEvent("onSuccess", event),
            onCancel: (event) => dispatchProviderEvent("onCancel", event),
            onExit: (event) => dispatchProviderEvent("onExit", event),
          });
          controller.open();
          callbacksRef.current.onStateChange?.("ready");
        })
        .catch((error: unknown) => {
          if (!active) return;
          const normalizedError =
            error instanceof Error ? error : new Error("Payment checkout could not be loaded.");
          callbacksRef.current.onStateChange?.("error", normalizedError);
        });

      return () => {
        active = false;
        close();
        if (closeRef.current === close) closeRef.current = () => undefined;
      };
    }, [checkoutUrl, elementId, returnUrl]);

    return <div id={elementId} {...hostProps} />;
  },
);
