import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { httpClient } from "@/api/core/http-client";

/**
 * Test seam for lifecycle integration suites: a fake axios adapter installed
 * on the real httpClient (same pattern as http-client.spec.ts). Everything
 * above the wire — services, envelope unwrapping, auth/402 interceptors —
 * runs for real, and the adapter is the single funnel every request must
 * pass through, so the suite catches contract drift and silently-minted
 * duplicate requests by construction: an URL with no declared route fails
 * the test with a 404.
 */
export interface FakeCall {
  method: string;
  url: string;
  body: unknown;
  params: Record<string, unknown> | undefined;
}

export type FakeRouteResult = {
  /** HTTP status; >=400 rejects with an envelope error body. Default 200. */
  status?: number;
  /** Payload placed in the success envelope's `data` (or error body's message context). */
  data?: unknown;
  /** Envelope message, mostly useful for error responses. */
  message?: string;
};

export type FakeRouteHandler = (call: FakeCall) => FakeRouteResult | Promise<FakeRouteResult>;

/** Routes are keyed "METHOD /api/path" (no query string — params are on the call). */
export type FakeRoutes = Record<string, FakeRouteHandler>;

function envelopeError(
  config: InternalAxiosRequestConfig,
  status: number,
  message: string,
): AxiosError {
  return new AxiosError(message, AxiosError.ERR_BAD_REQUEST, config, undefined, {
    status,
    statusText: "Error",
    headers: {},
    config,
    data: { success: false, message, data: null, errors: null },
  } as AxiosResponse);
}

export function installFakeApiServer(routes: FakeRoutes) {
  const calls: FakeCall[] = [];

  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const method = (config.method ?? "get").toUpperCase();
    const url = config.url ?? "";
    const call: FakeCall = {
      method,
      url,
      body: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
      params: config.params as Record<string, unknown> | undefined,
    };
    calls.push(call);

    const handler = routes[`${method} ${url}`];
    if (!handler) {
      // Contract break or duplicate-minting request — fail loudly.
      throw envelopeError(config, 404, `No fake route declared for ${method} ${url}`);
    }

    const result = (await handler(call)) ?? {};
    const status = result.status ?? 200;
    if (status >= 400) {
      throw envelopeError(config, status, result.message ?? `Fake ${status} for ${method} ${url}`);
    }

    return {
      status,
      statusText: "OK",
      headers: {},
      config,
      data: { success: true, message: "OK", data: result.data ?? null, errors: null },
    };
  };

  return {
    /** Mutable per-test: override or add handlers after install. */
    routes,
    /** Every request that reached the wire, in order. */
    calls,
    /** Calls matching a method + url prefix. */
    of(method: string, urlPrefix: string): FakeCall[] {
      return calls.filter((call) => call.method === method && call.url.startsWith(urlPrefix));
    },
    /** "METHOD url" strings in wire order — for asserting operation ordering. */
    sequence(): string[] {
      return calls.map((call) => `${call.method} ${call.url}`);
    },
    uninstall() {
      httpClient.defaults.adapter = undefined;
    },
  };
}

export type FakeApiServer = ReturnType<typeof installFakeApiServer>;
