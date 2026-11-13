export type QueryMethod = "run" | "all" | "values" | "get";
export type RemoteBatchItem = { sql: string; params: unknown[]; method: QueryMethod };
export interface RemoteDriver {
  query(sql: string, params: unknown[], method: QueryMethod): Promise<{ rows: unknown[] }>;
  /** 全体を1トランザクションとして実行する */
  batch(queries: RemoteBatchItem[]): Promise<{ rows: unknown[] }[]>;
}
