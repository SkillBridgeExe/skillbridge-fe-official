export const PAYOS_SCRIPT_ID = "payos-checkout-script";
export const PAYOS_SCRIPT_SRC = "https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js";

export interface PayOSEvent {
  loading?: boolean;
  code?: string;
  id?: string;
  cancel?: boolean | string;
  orderCode?: string | number;
  status?: string;
}

export interface PayOSController {
  open: () => void;
  exit?: () => void;
}

export interface PayOSConfig {
  RETURN_URL: string;
  ELEMENT_ID: string;
  CHECKOUT_URL: string;
  embedded: boolean;
  onSuccess?: (event: PayOSEvent) => void;
  onCancel?: (event: PayOSEvent) => void;
  onExit?: (event: PayOSEvent) => void;
}

declare global {
  interface Window {
    PayOSCheckout?: {
      usePayOS: (config: PayOSConfig) => PayOSController;
    };
  }
}

interface PayOSCheckoutScriptLoaderOptions {
  getDocument?: () => Document | null | undefined;
  getWindow?: () => Window | null | undefined;
  scriptId?: string;
  scriptSrc?: string;
}

export function createPayOSCheckoutScriptLoader({
  getDocument = () => (typeof document === "undefined" ? null : document),
  getWindow = () => (typeof window === "undefined" ? null : window),
  scriptId = PAYOS_SCRIPT_ID,
  scriptSrc = PAYOS_SCRIPT_SRC,
}: PayOSCheckoutScriptLoaderOptions = {}) {
  let payOSScriptPromise: Promise<void> | null = null;

  return function loadPayOSCheckoutScript() {
    const targetWindow = getWindow();
    if (!targetWindow) return Promise.reject(new Error("Browser window is not available."));
    if (targetWindow.PayOSCheckout?.usePayOS) return Promise.resolve();
    if (payOSScriptPromise) return payOSScriptPromise;

    const targetDocument = getDocument();
    if (!targetDocument) return Promise.reject(new Error("Browser document is not available."));

    payOSScriptPromise = new Promise<void>((resolve, reject) => {
      let script = targetDocument.getElementById(scriptId) as HTMLScriptElement | null;
      let shouldAppend = false;

      const rejectAndReset = (error: Error) => {
        payOSScriptPromise = null;
        reject(error);
      };

      const handleLoad = () => {
        delete script?.dataset.loading;
        script!.dataset.loaded = "true";
        delete script!.dataset.failed;

        if (targetWindow.PayOSCheckout?.usePayOS) {
          resolve();
          return;
        }

        script!.dataset.failed = "true";
        script!.remove();
        rejectAndReset(new Error("payOS checkout script loaded without the checkout API."));
      };

      const handleError = () => {
        delete script?.dataset.loading;
        script!.dataset.failed = "true";
        script!.remove();
        rejectAndReset(new Error("Could not load the payOS checkout script."));
      };

      if (script?.dataset.loaded === "true") {
        handleLoad();
        return;
      }

      if (script && script.dataset.loading !== "true") {
        script.remove();
        script = null;
      }

      if (!script) {
        script = targetDocument.createElement("script");
        shouldAppend = true;
      }

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });

      if (shouldAppend) {
        script.id = scriptId;
        script.src = scriptSrc;
        script.async = true;
        script.dataset.loading = "true";
        targetDocument.body.appendChild(script);
      }
    });

    return payOSScriptPromise;
  };
}

export const loadPayOSCheckoutScript = createPayOSCheckoutScriptLoader();
