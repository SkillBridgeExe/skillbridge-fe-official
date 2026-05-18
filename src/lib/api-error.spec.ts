import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./api-error";

describe("getApiErrorMessage", () => {
  it("returns native Error messages", () => {
    expect(getApiErrorMessage(new Error("Native failure"))).toBe("Native failure");
  });

  it("returns plain string errors", () => {
    expect(getApiErrorMessage("Plain failure")).toBe("Plain failure");
  });

  it("returns Axios response message values", () => {
    const error = { response: { data: { message: "Response message" } } };

    expect(getApiErrorMessage(error)).toBe("Response message");
  });

  it("returns nested Axios error message values", () => {
    const error = { response: { data: { error: { message: "Nested message" } } } };

    expect(getApiErrorMessage(error)).toBe("Nested message");
  });

  it("returns fallback for unknown error shapes", () => {
    expect(getApiErrorMessage({ unexpected: true }, "Fallback message")).toBe("Fallback message");
  });
});
