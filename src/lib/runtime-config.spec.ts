// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

type ConfigWindow = Window &
  typeof globalThis & {
    __APP_CONFIG__?: {
      POSTHOG_PROJECT_TOKEN?: string;
      POSTHOG_HOST?: string;
    };
  };

describe("runtime config", () => {
  afterEach(() => {
    delete (window as ConfigWindow).__APP_CONFIG__;
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows runtime empty PostHog values to override baked build values", async () => {
    vi.stubEnv("VITE_PUBLIC_POSTHOG_PROJECT_TOKEN", "build-token");
    vi.stubEnv("VITE_PUBLIC_POSTHOG_HOST", "https://old.posthog.test");
    (window as ConfigWindow).__APP_CONFIG__ = {
      POSTHOG_PROJECT_TOKEN: "",
      POSTHOG_HOST: "",
    };

    const config = await import("./runtime-config");

    expect(config.POSTHOG_PROJECT_TOKEN).toBe("");
    expect(config.POSTHOG_HOST).toBe("");
  });
});
