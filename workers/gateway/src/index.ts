/**
 * Stark Report データゲートウェイ（Cloudflare Worker）
 *
 * Vercel 上の Next.js サーバーからだけ呼ばれ、D1（データベース）と R2（写真・ロゴ）を操作する。
 * D1 / R2 の認証情報はこの Worker のバインディングにだけ存在し、ブラウザやVercelには渡らない。
 * 呼び出しには共有シークレット（GATEWAY_SECRET）が必要。
 *
 *   POST   /d1/query   { sql, params, method }       → { rows }
 *   POST   /d1/batch   { queries: [{sql,params,method}] } → { results: [{rows}] }（1トランザクション）
 *   PUT    /r2/<key>   body=バイナリ, content-type   → 204
 *   GET    /r2/<key>                                 → バイナリ
 *   DELETE /r2/<key>                                 → 204
 */

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  GATEWAY_SECRET: string;
}

type Method = "run" | "all" | "values" | "get";
type Query = { sql: string; params: unknown[]; method: Method };

const KEY_RE = /^orgs\/[0-9a-f-]{36}\/[A-Za-z0-9/_.-]+$/;
const MAX_OBJECT_BYTES = 10 * 1024 * 1024;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

async function authorized(req: Request, env: Env): Promise<boolean> {
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.GATEWAY_SECRET}`;
  if (!env.GATEWAY_SECRET || env.GATEWAY_SECRET.length < 32) return false;
  // 長さに依存しない定数時間比較
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(header)), crypto.subtle.digest("SHA-256", enc.encode(expected))]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function prepare(env: Env, q: Query) {
  if (typeof q.sql !== "string" || !Array.isArray(q.params)) throw new Error("bad query");
  return env.DB.prepare(q.sql).bind(...q.params);
}

async function runQuery(env: Env, q: Query) {
  const stmt = prepare(env, q);
  if (q.method === "run") {
    await stmt.run();
    return { rows: [] };
  }
  const rows = await stmt.raw();
  if (q.method === "get") return { rows: rows[0] ?? undefined };
  return { rows };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (!(await authorized(req, env))) return json({ error: "unauthorized" }, 401);
    const url = new URL(req.url);

    try {
      if (url.pathname === "/d1/query" && req.method === "POST") {
        const q = (await req.json()) as Query;
        return json(await runQuery(env, q));
      }

      if (url.pathname === "/d1/batch" && req.method === "POST") {
        const { queries } = (await req.json()) as { queries: Query[] };
        if (!Array.isArray(queries) || queries.length === 0 || queries.length > 500) return json({ error: "bad batch" }, 400);
        const results = await env.DB.batch(queries.map((q) => prepare(env, q)));
        // D1 の batch はオブジェクト形式で返すので、配列形式に揃える
        return json({
          results: results.map((r, i) => {
            const objs = (r.results ?? []) as Record<string, unknown>[];
            const arrays = objs.map((o) => Object.values(o));
            if (queries[i].method === "run") return { rows: [] };
            if (queries[i].method === "get") return { rows: arrays[0] };
            return { rows: arrays };
          }),
        });
      }

      if (url.pathname.startsWith("/r2/")) {
        const key = decodeURIComponent(url.pathname.slice(4));
        if (!KEY_RE.test(key) || key.includes("..")) return json({ error: "bad key" }, 400);
        if (req.method === "PUT") {
          const len = Number(req.headers.get("content-length") ?? 0);
          if (len > MAX_OBJECT_BYTES) return json({ error: "too large" }, 413);
          await env.BUCKET.put(key, req.body, { httpMetadata: { contentType: req.headers.get("content-type") ?? "application/octet-stream" } });
          return new Response(null, { status: 204 });
        }
        if (req.method === "GET") {
          const obj = await env.BUCKET.get(key);
          if (!obj) return json({ error: "not found" }, 404);
          return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream" } });
        }
        if (req.method === "DELETE") {
          await env.BUCKET.delete(key);
          return new Response(null, { status: 204 });
        }
      }
      return json({ error: "not found" }, 404);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // SQL エラー等は 400（呼び出し側はリトライしない）
      return json({ error: message }, /D1_|SQLITE|syntax|constraint/i.test(message) ? 400 : 500);
    }
  },
};
