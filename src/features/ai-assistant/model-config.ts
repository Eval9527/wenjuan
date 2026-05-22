import { z } from 'zod';

const LEGACY_AI_CONFIG_KEYS = {
  baseUrl: 'WENJUAN_AI_BASE_URL',
  apiKey: 'WENJUAN_AI_API_KEY',
  model: 'WENJUAN_AI_MODEL',
  modelAlias: 'WENJUAN_AI_MODEL_ALIAS',
  providerAlias: 'WENJUAN_AI_PROVIDER_ALIAS'
} as const;

const AI_PROVIDERS_JSON_KEY = 'WENJUAN_AI_PROVIDERS_JSON';

const configuredModelSchema = z.object({
  id: z.string().min(1),
  alias: z.string().min(1).optional(),
  primary: z.boolean().optional()
});

const configuredProviderSchema = z.object({
  id: z.string().min(1),
  alias: z.string().min(1).optional(),
  baseUrl: z.string().min(1),
  apiKey: z.string().min(1),
  models: z.array(configuredModelSchema).min(1)
});

const configuredProvidersSchema = z.array(configuredProviderSchema).min(1);

export type AiModelCandidate = {
  id: string;
  alias: string;
  providerAlias: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  primary: boolean;
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

function parseProvidersJson(env: NodeJS.ProcessEnv): AiModelCandidate[] {
  const raw = env[AI_PROVIDERS_JSON_KEY]?.trim();
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const providers = configuredProvidersSchema.safeParse(parsed);
  if (!providers.success) {
    return [];
  }

  const candidates = providers.data.flatMap((provider) => {
    const providerAlias = provider.alias?.trim() || provider.id;
    return provider.models.map((model) => ({
      id: `${safeModelIdSegment(provider.id)}:${safeModelIdSegment(model.id)}`,
      alias: model.alias?.trim() || model.id,
      providerAlias,
      baseUrl: normalizeBaseUrl(provider.baseUrl),
      apiKey: provider.apiKey.trim(),
      model: model.id,
      primary: model.primary === true
    }));
  });

  return sortPrimaryFirst(candidates);
}

function parseLegacyConfig(env: NodeJS.ProcessEnv): AiModelCandidate[] {
  const baseUrl = env[LEGACY_AI_CONFIG_KEYS.baseUrl]?.trim();
  const apiKey = env[LEGACY_AI_CONFIG_KEYS.apiKey]?.trim();
  const model = env[LEGACY_AI_CONFIG_KEYS.model]?.trim();

  if (!baseUrl || !apiKey || !model) {
    return [];
  }

  return [
    {
      id: `legacy:${safeModelIdSegment(model)}`,
      alias: env[LEGACY_AI_CONFIG_KEYS.modelAlias]?.trim() || model,
      providerAlias: env[LEGACY_AI_CONFIG_KEYS.providerAlias]?.trim() || '默认 AI 服务',
      baseUrl: normalizeBaseUrl(baseUrl),
      apiKey,
      model,
      primary: true
    }
  ];
}

export function getAiModelCandidates(env: NodeJS.ProcessEnv = process.env): AiModelCandidate[] {
  const providerCandidates = parseProvidersJson(env);
  if (providerCandidates.length > 0) {
    return providerCandidates;
  }

  return parseLegacyConfig(env);
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
