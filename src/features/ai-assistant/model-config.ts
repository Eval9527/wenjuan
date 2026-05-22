import { aiModelCatalog, type AiModelCatalog, type AiModelCatalogModel } from '@/features/ai-assistant/model-catalog';

let aiModelCatalogForTests: AiModelCatalog | null = null;

export type AiModelCandidate = {
  id: string;
  alias: string;
  providerAlias: string;
  api: 'openai-completions';
  baseUrl: string;
  apiKey: string;
  headers: Record<string, string>;
  model: string;
  primary: boolean;
  autoTimeoutMs?: number;
  singleTimeoutMs?: number;
};

export type PublicAiModelOption = {
  id: string;
  alias: string;
  providerAlias: string;
  primary: boolean;
};

export type PublicAiModelOptions = {
  mode: 'configured' | 'builtin-only';
  defaultSelection: 'auto' | string;
  showSelector: boolean;
  models: PublicAiModelOption[];
};

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

function safeModelIdSegment(value: string) {
  return value.replace(/:/g, '-');
}

function sortPrimaryFirst(candidates: AiModelCandidate[]) {
  return [...candidates].sort((left, right) => Number(right.primary) - Number(left.primary));
}

function normalizeCatalogModel(model: AiModelCatalogModel) {
  return {
    id: model.id,
    alias: model.alias?.trim() || model.id,
    primary: model.primary === true,
    timeoutMs: model.timeoutMs,
    autoTimeoutMs: model.autoTimeoutMs,
    singleTimeoutMs: model.singleTimeoutMs
  };
}

function normalizeTimeouts(...values: Array<number | undefined>) {
  return values.find((value) => typeof value === 'number' && Number.isFinite(value) && value > 0);
}

function getActiveCatalog(): AiModelCatalog {
  return aiModelCatalogForTests ?? aiModelCatalog;
}

export function getAiModelCandidates(env: NodeJS.ProcessEnv = process.env): AiModelCandidate[] {
  const candidates = getActiveCatalog().flatMap((provider) => {
    const apiKey = env[provider.apiKeyEnv]?.trim();
    if (!apiKey) {
      return [];
    }

    const baseUrl = provider.baseUrl?.trim() || (provider.baseUrlEnv ? env[provider.baseUrlEnv]?.trim() : '');
    if (!baseUrl) {
      return [];
    }

    const providerAlias = provider.alias?.trim() || provider.id;
    const headers = { ...(provider.headers ?? {}) };

    return provider.models.map((model) => {
      const normalizedModel = normalizeCatalogModel(model);
      return {
        id: `${safeModelIdSegment(provider.id)}:${safeModelIdSegment(normalizedModel.id)}`,
        alias: normalizedModel.alias,
        providerAlias,
        api: provider.api ?? 'openai-completions',
        baseUrl: normalizeBaseUrl(baseUrl),
        apiKey,
        headers,
        model: normalizedModel.id,
        primary: normalizedModel.primary,
        autoTimeoutMs: normalizeTimeouts(normalizedModel.autoTimeoutMs, normalizedModel.timeoutMs, provider.autoTimeoutMs, provider.timeoutMs),
        singleTimeoutMs: normalizeTimeouts(normalizedModel.singleTimeoutMs, normalizedModel.timeoutMs, provider.singleTimeoutMs, provider.timeoutMs)
      };
    });
  });

  return sortPrimaryFirst(candidates);
}

export function setAiModelCatalogForTests(catalog: AiModelCatalog | null) {
  aiModelCatalogForTests = catalog;
}

export function getPublicAiModelOptions(env: NodeJS.ProcessEnv = process.env): PublicAiModelOptions {
  const candidates = getAiModelCandidates(env);
  const models = candidates.map((candidate) => ({
    id: candidate.id,
    alias: candidate.alias,
    providerAlias: candidate.providerAlias,
    primary: candidate.primary
  }));

  return {
    mode: models.length > 0 ? 'configured' : 'builtin-only',
    defaultSelection: models.length >= 2 ? 'auto' : models[0]?.id ?? 'auto',
    showSelector: models.length >= 2,
    models
  };
}
