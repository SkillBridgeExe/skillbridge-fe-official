import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("version", () => {
  it("exports non-empty version constants", async () => {
    const { APP_VERSION, GIT_SHA, BUILD_TIME, GIT_SHA_SHORT, VERSION_INFO } =
      await import("./version");

    expect(APP_VERSION).toBeTruthy();
    expect(GIT_SHA).toBeTruthy();
    expect(BUILD_TIME).toBeTruthy();
    expect(GIT_SHA_SHORT.length).toBeLessThanOrEqual(7);

    expect(VERSION_INFO).toEqual({
      version: APP_VERSION,
      gitSha: GIT_SHA,
      gitShaShort: GIT_SHA_SHORT,
      buildTime: BUILD_TIME,
    });
  });

  it("prefers runtime Cloud Run version config when present", async () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    (globalThis as unknown as { window: unknown }).window = {
      __APP_CONFIG__: {
        APP_VERSION: "runtime-version",
        GIT_SHA: "abcdef1234567890",
        BUILD_TIME: "2026-06-19T00:00:00.000Z",
      },
    };

    const { APP_VERSION, GIT_SHA, BUILD_TIME, GIT_SHA_SHORT, VERSION_INFO } =
      await import("./version");

    expect(APP_VERSION).toBe("runtime-version");
    expect(GIT_SHA).toBe("abcdef1234567890");
    expect(BUILD_TIME).toBe("2026-06-19T00:00:00.000Z");
    expect(GIT_SHA_SHORT).toBe("abcdef1");
    expect(VERSION_INFO.version).toBe("runtime-version");
    expect(consoleSpy).toHaveBeenCalledOnce();
  });
});
