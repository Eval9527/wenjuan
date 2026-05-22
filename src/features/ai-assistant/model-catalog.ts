export type AiModelCatalogModel = {
  id: string;
  alias?: string;
  primary?: boolean;
  timeoutMs?: number;
  autoTimeoutMs?: number;
  singleTimeoutMs?: number;
};

export type AiModelCatalogProvider = {
  id: string;
  alias?: string;
  api?: 'openai-completions';
  baseUrl?: string;
  baseUrlEnv?: string;
  apiKeyEnv: string;
  headers?: Readonly<Record<string, string>>;
  timeoutMs?: number;
  autoTimeoutMs?: number;
  singleTimeoutMs?: number;
  models: readonly AiModelCatalogModel[];
};

export type AiModelCatalog = readonly AiModelCatalogProvider[];

export const aiModelCatalog = [
  {
    // Vercel/本地需要配置 WENJUAN_AI_LOCAL_BASE_URL 与 WENJUAN_AI_LOCAL_API_KEY 才会启用该 provider。
    id: 'local',
    alias: '本地服务',
    api: 'openai-completions',
    baseUrlEnv: 'WENJUAN_AI_LOCAL_BASE_URL',
    apiKeyEnv: 'WENJUAN_AI_LOCAL_API_KEY',
    autoTimeoutMs: 90_000,
    singleTimeoutMs: 120_000,
    models: [
      { id: 'mimo-v2.5', alias: 'mimo-v2.5', primary: true },
      { id: 'mimo-v2-omni', alias: 'mimo-v2-omni' }
    ]
  }
] as const satisfies AiModelCatalog;
