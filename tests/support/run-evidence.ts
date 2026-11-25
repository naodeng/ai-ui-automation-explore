import type { APIRequestContext, APIResponse, BrowserContext, Response, TestInfo } from "@playwright/test";

interface CorrelationIds {
  business_run_ids: string[];
  request_ids: string[];
  quote_ids: string[];
  order_ids: string[];
}

interface NetworkEntry {
  captured_at: string;
  method: string;
  path: string;
  status: number;
  correlation_ids: CorrelationIds;
}

interface OracleCapture {
  path: string;
  captured_at: string;
  business_run_id: string | null;
  response: unknown;
}

const correlationKeys = new Map<string, keyof CorrelationIds>([
  ["run_id", "business_run_ids"],
  ["runId", "business_run_ids"],
  ["request_id", "request_ids"],
  ["requestId", "request_ids"],
  ["quote_id", "quote_ids"],
  ["quoteId", "quote_ids"],
  ["order_id", "order_ids"],
  ["orderId", "order_ids"],
]);

function emptyCorrelationIds(): CorrelationIds {
  return { business_run_ids: [], request_ids: [], quote_ids: [], order_ids: [] };
}

function addId(target: string[], value: unknown): void {
  if (typeof value === "string" && value.length > 0 && !target.includes(value)) target.push(value);
}

function collectCorrelationIds(value: unknown, target = emptyCorrelationIds(), depth = 0): CorrelationIds {
  if (depth > 20 || value === null || typeof value !== "object") return target;
  if (Array.isArray(value)) {
    for (const item of value) collectCorrelationIds(item, target, depth + 1);
    return target;
  }
  for (const [key, child] of Object.entries(value)) {
    const targetKey = correlationKeys.get(key);
    if (targetKey) addId(target[targetKey], child);
    collectCorrelationIds(child, target, depth + 1);
  }
  return target;
}

function mergeCorrelationIds(...values: unknown[]): CorrelationIds {
  const combined = emptyCorrelationIds();
  for (const value of values) {
    const found = collectCorrelationIds(value);
    for (const key of Object.keys(combined) as Array<keyof CorrelationIds>) {
      for (const id of found[key]) addId(combined[key], id);
    }
  }
  return combined;
}

function localApplicationUrl(rawUrl: string, baseURL: string): URL | null {
  try {
    const url = new URL(rawUrl, baseURL);
    const base = new URL(baseURL);
    if (url.origin !== base.origin || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function requestUrl(method: string, args: unknown[], baseURL: string): URL | null {
  const target = args[0];
  const rawUrl = typeof target === "string" || target instanceof URL
    ? String(target)
    : target && typeof target === "object" && "url" in target && typeof target.url === "string"
      ? target.url
      : baseURL;
  const url = localApplicationUrl(rawUrl, baseURL);
  if (!url) return null;
  return url;
}

function requestOptions(args: unknown[]): unknown {
  const options = args[1];
  if (!options || typeof options !== "object") return null;
  const request = options as Record<string, unknown>;
  return { data: request.data, params: request.params };
}

export class RunEvidenceRecorder {
  private readonly requests: NetworkEntry[] = [];
  private readonly oracleResponses: OracleCapture[] = [];
  private readonly businessRunIds = new Set<string>();
  private readonly requestIds = new Set<string>();
  private readonly pending: Promise<void>[] = [];
  private browser = "API-only (no browser launched)";

  setBrowserContext(context: BrowserContext): void {
    const browser = context.browser();
    this.browser = browser
      ? `${browser.browserType().name()} ${browser.version()}`
      : "Chromium (Playwright browser version unavailable)";
  }

  capturePageResponse(response: Response, baseURL: string): void {
    const request = response.request();
    const url = localApplicationUrl(response.url(), baseURL);
    if (!url) return;
    const contentType = response.headers()["content-type"] ?? "";
    if (!contentType.includes("json")) return;
    const pending = this.capture({
      url,
      method: request.method(),
      status: response.status(),
      headers: response.headers(),
      body: () => response.body(),
      requestValues: null,
    }).catch(() => undefined);
    this.pending.push(pending);
  }

  async captureApiResponse(method: string, args: unknown[], response: APIResponse, baseURL: string): Promise<void> {
    const url = requestUrl(method, args, baseURL);
    if (!url) return;
    await this.capture({
      url,
      method: method.toUpperCase(),
      status: response.status(),
      headers: response.headers(),
      body: () => response.body(),
      requestValues: requestOptions(args),
    });
  }

  private async capture(input: {
    url: URL;
    method: string;
    status: number;
    headers: Record<string, string>;
    body: () => Promise<Buffer>;
    requestValues: unknown;
  }): Promise<void> {
    const capturedAt = new Date().toISOString();
    const contentType = input.headers["content-type"] ?? "";
    let body: unknown = null;
    if (contentType.includes("json")) {
      try {
        body = JSON.parse((await input.body()).toString("utf8"));
      } catch {
        body = null;
      }
    }

    const correlation = mergeCorrelationIds(Object.fromEntries(input.url.searchParams.entries()), input.requestValues, body, {
      request_id: input.headers["x-request-id"] ?? input.headers["request-id"],
    });
    for (const runId of correlation.business_run_ids) this.businessRunIds.add(runId);
    for (const requestId of correlation.request_ids) this.requestIds.add(requestId);
    this.requests.push({
      captured_at: capturedAt,
      method: input.method,
      path: input.url.pathname,
      status: input.status,
      correlation_ids: correlation,
    });

    if (input.url.pathname.toLowerCase().includes("oracle") && body !== null) {
      this.oracleResponses.push({
        path: input.url.pathname,
        captured_at: capturedAt,
        business_run_id: correlation.business_run_ids[0] ?? null,
        response: body,
      });
    } else if (body && typeof body === "object" && "oracle" in body) {
      this.oracleResponses.push({
        path: input.url.pathname,
        captured_at: capturedAt,
        business_run_id: correlation.business_run_ids[0] ?? null,
        response: (body as { oracle: unknown }).oracle,
      });
    }
  }

  async attach(testInfo: TestInfo): Promise<void> {
    await Promise.all(this.pending);
    const networkSummary = this.requests;
    const runContext = {
      browser: this.browser,
      business_run_ids: [...this.businessRunIds],
      request_ids: [...this.requestIds],
    };
    await testInfo.attach("p3-run-context", {
      body: Buffer.from(JSON.stringify(runContext, null, 2)),
      contentType: "application/json",
    });
    await testInfo.attach("p3-network-summary", {
      body: Buffer.from(JSON.stringify(networkSummary, null, 2)),
      contentType: "application/json",
    });
    for (const [index, oracle] of this.oracleResponses.entries()) {
      await testInfo.attach(`p3-oracle-${String(index + 1).padStart(3, "0")}`, {
        body: Buffer.from(JSON.stringify(oracle, null, 2)),
        contentType: "application/json",
      });
    }
  }
}

export function trackedRequest(request: APIRequestContext, evidence: RunEvidenceRecorder, baseURL: string): APIRequestContext {
  const methods = new Set(["get", "post", "put", "patch", "delete", "head", "fetch"]);
  return new Proxy(request, {
    get(target, property) {
      const original = Reflect.get(target, property, target) as unknown;
      if (typeof original !== "function") return original;
      if (typeof property === "string" && methods.has(property)) {
        return async (...args: unknown[]) => {
          const response = await Reflect.apply(original, target, args) as APIResponse;
          await evidence.captureApiResponse(property, args, response, baseURL);
          return response;
        };
      }
      return original.bind(target);
    },
  }) as APIRequestContext;
}
