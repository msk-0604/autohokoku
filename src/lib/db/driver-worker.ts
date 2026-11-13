import type { QueryMethod, RemoteBatchItem, RemoteDriver } from "./types";

/** Cloudflare Worker（workers/gateway）経由で D1 にクエリを送る */
export function createWorkerDriver(baseUrl: string, secret: string): RemoteDriver {
  if (!baseUrl || !secret) throw new Error("GATEWAY_URL / GATEWAY_SECRET が設定されていません");

  async function call<T>(path: string, body: unknown, retryable: boolean): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < (retryable ? 2 : 1); attempt++) {
      try {
        const res = await fetch(new URL(path, baseUrl), {
          method: "POST",
          headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text();
          // 4xx は SQL エラー等なのでリトライしない
          if (res.status < 500) throw Object.assign(new Error(`D1 gateway ${res.status}: ${text}`), { noRetry: true });
          throw new Error(`D1 gateway ${res.status}: ${text}`);
        }
        return (await res.json()) as T;
      } catch (e) {
        lastErr = e;
        if ((e as { noRetry?: boolean }).noRetry) break;
        // 書き込みの再送は二重実行になりうるため、読み取りのみ1回だけ再試行する
      }
    }
    throw lastErr;
  }

  return {
    query(sql: string, params: unknown[], method: QueryMethod) {
      return call<{ rows: unknown[] }>("/d1/query", { sql, params, method }, method !== "run");
    },
    async batch(queries: RemoteBatchItem[]) {
      const r = await call<{ results: { rows: unknown[] }[] }>("/d1/batch", { queries }, false);
      return r.results;
    },
  };
}
