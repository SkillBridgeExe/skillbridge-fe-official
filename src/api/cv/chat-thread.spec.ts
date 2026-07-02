import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "@/api/core/http-client";
import { API_ROUTES } from "@/constants/api-routes";
import { deleteChatThreadApi, getChatThreadApi } from "./chat-thread";

vi.mock("@/api/core/http-client", () => ({
  httpClient: {
    delete: vi.fn(),
    get: vi.fn(),
  },
}));

function ok<T>(data: T) {
  return Promise.resolve({
    data: { success: true, message: "OK", data, errors: null },
  });
}

describe("chat thread API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GETs the persisted match chat thread and unwraps turns", async () => {
    vi.mocked(httpClient.get).mockReturnValueOnce(
      ok({
        turns: [
          { role: "user", text: "JD nào hợp tôi?", ts: "2026-07-02T08:00:00.000Z" },
          { role: "assistant", text: "JD Frontend đang tốt hơn.", ts: "2026-07-02T08:00:02.000Z" },
        ],
      }) as never,
    );

    const out = await getChatThreadApi("match-1");

    expect(httpClient.get).toHaveBeenCalledWith(
      API_ROUTES.CV_MATCHES.CHAT_THREAD("match-1"),
      { timeout: 15_000 },
    );
    expect(out.turns).toHaveLength(2);
    expect(out.turns[0]).toEqual({
      role: "user",
      text: "JD nào hợp tôi?",
      ts: "2026-07-02T08:00:00.000Z",
    });
  });

  it("DELETEs the persisted match chat thread", async () => {
    vi.mocked(httpClient.delete).mockReturnValueOnce(ok({}) as never);

    await expect(deleteChatThreadApi("match-1")).resolves.toBeUndefined();

    expect(httpClient.delete).toHaveBeenCalledWith(
      API_ROUTES.CV_MATCHES.CHAT_THREAD("match-1"),
      { timeout: 15_000 },
    );
  });
});
