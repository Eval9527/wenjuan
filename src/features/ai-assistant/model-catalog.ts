export type AiModelCatalogModel = {
  id: string;
  alias?: string;
  primary?: boolean;
  timeoutMs?: number;
  autoTimeoutMs?: number;
  singleTimeoutMs?: number;
};

export type AiProviderApi = 'openai-completions' | 'google-generate-content';

export type AiModelCatalogProvider = {
  id: string;
  alias?: string;
  api?: AiProviderApi;
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
    id: 'google',
    alias: 'Google AI',
    api: 'google-generate-content',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'WENJUAN_AI_GOOGLE_API_KEY',
    models: [
      { id: 'gemini-2.5-flash', alias: 'Gemini 2.5 Flash', primary: true }
    ]
  },
  {
    id: 'bigmodel',
    alias: '智谱 AI',
    api: 'openai-completions',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyEnv: 'WENJUAN_AI_BIGMODEL_API_KEY',
    models: [
      { id: 'glm-4-flash-250414', alias: 'GLM-4-Flash-250414' }
    ]
  }
] as const satisfies AiModelCatalog;
