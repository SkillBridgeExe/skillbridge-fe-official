// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PayOSEmbedHost,
  type PayOSEmbedHandle,
} from "./PayOSEmbedHost";
import {
  loadPayOSCheckoutScript,
  type PayOSConfig,
} from "@/lib/payos-checkout-script";

vi.mock("@/lib/payos-checkout-script", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payos-checkout-script")>();
  return { ...actual, loadPayOSCheckoutScript: vi.fn().mockResolvedValue(undefined) };
});

describe("PayOSEmbedHost", () => {
  let config: PayOSConfig | undefined;
  const exit = vi.fn();

  beforeEach(() => {
    vi.mocked(loadPayOSCheckoutScript).mockResolvedValue(undefined);
    exit.mockReset();
    config = undefined;
    window.PayOSCheckout = {
      usePayOS: vi.fn((nextConfig: PayOSConfig) => {
        config = nextConfig;
        return {
          open: () => {
            const container = document.getElementById(nextConfig.ELEMENT_ID);
            const iframe = document.createElement("iframe");
            iframe.title = "Bank transfer";
            container?.appendChild(iframe);
          },
          exit,
        };
      }),
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    delete window.PayOSCheckout;
  });

  it.each(["onSuccess", "onCancel", "onExit"] as const)(
    "does not call exit again after the provider closes its iframe before %s",
    async (callbackName) => {
      const callback = vi.fn();
      const view = render(
        <PayOSEmbedHost
          elementId="payos-checkout-123"
          checkoutUrl="https://pay.payos.vn/web/payment-link-1"
          returnUrl="https://skillbridgebuilder.com/billing/checkout/123"
          onSuccess={callbackName === "onSuccess" ? callback : undefined}
          onCancel={callbackName === "onCancel" ? callback : undefined}
          onExit={callbackName === "onExit" ? callback : undefined}
        />,
      );
      await waitFor(() => expect(config).toBeDefined());

      const container = document.getElementById("payos-checkout-123")!;
      const iframe = container.querySelector("iframe")!;
      container.removeChild(iframe);
      act(() => config?.[callbackName]?.({ code: "00" }));
      await waitFor(() => expect(callback).toHaveBeenCalledWith({ code: "00" }));

      view.unmount();
      expect(exit).not.toHaveBeenCalled();
    },
  );

  it("delivers only the first terminal callback emitted by the provider", async () => {
    const onSuccess = vi.fn();
    const onCancel = vi.fn();
    const onExit = vi.fn();
    const view = render(
      <PayOSEmbedHost
        elementId="payos-checkout-123"
        checkoutUrl="https://pay.payos.vn/web/payment-link-1"
        returnUrl="https://skillbridgebuilder.com/billing/checkout/123"
        onSuccess={onSuccess}
        onCancel={onCancel}
        onExit={onExit}
      />,
    );
    await waitFor(() => expect(config).toBeDefined());

    act(() => {
      config?.onSuccess?.({ code: "00" });
      config?.onCancel?.({ code: "00" });
      config?.onExit?.({ code: "00" });
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    expect(onCancel).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
    view.unmount();
    expect(exit).not.toHaveBeenCalled();
  });

  it("calls exit exactly once when React unmounts an open provider iframe", async () => {
    const view = render(
      <PayOSEmbedHost
        elementId="payos-checkout-123"
        checkoutUrl="https://pay.payos.vn/web/payment-link-1"
        returnUrl="https://skillbridgebuilder.com/billing/checkout/123"
      />,
    );
    await waitFor(() => expect(config).toBeDefined());

    view.unmount();
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("makes an imperative close idempotent across a later unmount", async () => {
    const ref = createRef<PayOSEmbedHandle>();
    const view = render(
      <PayOSEmbedHost
        ref={ref}
        elementId="payos-checkout-123"
        checkoutUrl="https://pay.payos.vn/web/payment-link-1"
        returnUrl="https://skillbridgebuilder.com/billing/checkout/123"
      />,
    );
    await waitFor(() => expect(config).toBeDefined());

    act(() => {
      ref.current?.close();
      ref.current?.close();
    });
    view.unmount();

    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("contains a DOM exception thrown by the provider during cleanup", async () => {
    exit.mockImplementationOnce(() => {
      throw new DOMException("The node to be removed is not a child", "NotFoundError");
    });
    const view = render(
      <PayOSEmbedHost
        elementId="payos-checkout-123"
        checkoutUrl="https://pay.payos.vn/web/payment-link-1"
        returnUrl="https://skillbridgebuilder.com/billing/checkout/123"
      />,
    );
    await waitFor(() => expect(config).toBeDefined());

    expect(() => view.unmount()).not.toThrow();
    expect(exit).toHaveBeenCalledTimes(1);
  });
});
