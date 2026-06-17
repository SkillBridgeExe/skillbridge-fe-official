import { describe, expect, it } from "vitest";
import { createPayOSCheckoutScriptLoader } from "./payos-checkout-script";

type Listener = () => void;

class FakeScript {
  id = "";
  src = "";
  async = false;
  dataset: Record<string, string> = {};
  removed = false;
  onRemove?: () => void;
  private listeners: Record<string, Listener[]> = {};

  addEventListener(event: string, listener: Listener) {
    this.listeners[event] = [...(this.listeners[event] ?? []), listener];
  }

  dispatch(event: string) {
    for (const listener of this.listeners[event] ?? []) listener();
  }

  remove() {
    this.removed = true;
    this.onRemove?.();
  }
}

function createFakeDocument() {
  let activeScript: FakeScript | null = null;
  const scripts: FakeScript[] = [];

  return {
    scripts,
    getElementById: (id: string) => (activeScript?.id === id ? activeScript : null),
    createElement: () => new FakeScript(),
    body: {
      appendChild: (script: FakeScript) => {
        activeScript = script;
        script.onRemove = () => {
          if (activeScript === script) activeScript = null;
        };
        scripts.push(script);
      },
    },
  };
}

describe("payOS checkout script loader", () => {
  it("replaces a failed existing script instead of waiting forever on stale listeners", async () => {
    const fakeDocument = createFakeDocument();
    const fakeWindow: { PayOSCheckout?: { usePayOS: () => unknown } } = {};
    const loadPayOSCheckoutScript = createPayOSCheckoutScriptLoader({
      getDocument: () => fakeDocument as unknown as Document,
      getWindow: () => fakeWindow as unknown as Window,
      scriptId: "payos-checkout-script",
      scriptSrc: "https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js",
    });

    const firstLoad = loadPayOSCheckoutScript();
    const firstScript = fakeDocument.scripts[0];
    firstScript.dispatch("error");

    await expect(firstLoad).rejects.toThrow("Could not load the payOS checkout script.");
    expect(firstScript.removed).toBe(true);

    const secondLoad = loadPayOSCheckoutScript();
    const secondScript = fakeDocument.scripts[1];
    fakeWindow.PayOSCheckout = { usePayOS: () => ({ open: () => undefined }) };
    secondScript.dispatch("load");

    await expect(secondLoad).resolves.toBeUndefined();
    expect(secondScript.dataset.loaded).toBe("true");
  });
});
