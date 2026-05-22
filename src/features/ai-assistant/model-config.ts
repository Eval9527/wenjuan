import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LEGACY_AI_CONFIG_KEYS = {
  baseUrl: 'WENJUAN_AI_BASE_URL',
  apiKey: 'WENJUAN_AI_API_KEY',
  model: 'WENJUAN_AI_MODEL',
  modelAlias: 'WENJUAN_AI_MODEL_ALIAS',
  providerAlias: 'WENJUAN_AI_PROVIDER_ALIAS'
} as const;

const AI_PROVIDERS_JSON_KEY = 'WENJUAN_AI_PROVIDERS_JSON';
const AI_CONFIG_FILE_KEYS = ['WENJUAN_AI_CONFIG_FILE', 'WENJUAN_AI_CONFIG_PATH'] as const;

const configuredModelObjectSchema = z.object({
  id: z.string().min(1),
  alias: z.string().min(1).optional(),
  primary: z.boolean().optional()
});

const configuredModelSchema = z.union([
  z.string().min(1),
  configuredModelObjectSchema
]);

const configuredProviderSchema = z.object({
  id: z.string().min(1).optional(),
  alias: z.string().min(1).optional(),
  api: z.literal('openai-completions').optional(),
  baseUrl: z.string().min(1),
  apiKey: z.string().min(1),
  headers: z.record(z.string()).optional(),
  models: z.array(configuredModelSchema).min(1)
});

const configuredProvidersSchema = z.array(configuredProviderSchema).min(1);
const configuredRootSchema = z.union([
  configuredProvidersSchema,
  z.object({ providers: configuredProvidersSchema }),
  z.object({ sites: configuredProvidersSchema }),
  configuredProviderSchema
]);

type ConfiguredProvider = z.infer<typeof configuredProviderSchema>;
type ConfiguredModel = z.infer<typeof configuredModelSchema>;

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

function normalizeConfiguredModel(model: ConfiguredModel) {
  if (typeof model === 'string') {
    return {
      id: model,
      alias: model,
      primary: false
    };
  }

  return {
    id: model.id,
    alias: model.alias?.trim() || model.id,
    primary: model.primary === true
  };
}

function normalizeProviders(root: z.infer<typeof configuredRootSchema>): ConfiguredProvider[] {
  if (Array.isArray(root)) {
    return root;
  }

  if ('providers' in root) {
    return root.providers;
  }

  if ('sites' in root) {
    return root.sites;
  }

  return [root];
}

function candidatesFromProviders(providers: ConfiguredProvider[]): AiModelCandidate[] {
  const candidates = providers.flatMap((provider, providerIndex) => {
    const providerId = provider.id?.trim() || `site-${providerIndex + 1}`;
    const providerAlias = provider.alias?.trim() || providerId;
    const headers = provider.headers ?? {};
    return provider.models.map((model) => {
      const normalizedModel = normalizeConfiguredModel(model);
      return {
        id: `${safeModelIdSegment(providerId)}:${safeModelIdSegment(normalizedModel.id)}`,
        alias: normalizedModel.alias,
        providerAlias,
        api: provider.api ?? 'openai-completions',
        baseUrl: normalizeBaseUrl(provider.baseUrl),
        apiKey: provider.apiKey.trim(),
        headers,
        model: normalizedModel.id,
        primary: normalizedModel.primary
      };
    });
  });

  return sortPrimaryFirst(candidates);
}

function parseAiConfigPayload(payload: unknown): AiModelCandidate[] {
  const root = configuredRootSchema.safeParse(payload);
  if (!root.success) {
    return [];
  }

  return candidatesFromProviders(normalizeProviders(root.data));
}

function parseRawConfigJson(raw: string): AiModelCandidate[] {
  try {
    return parseAiConfigPayload(JSON.parse(raw));
  } catch {
    return [];
  }
}

function parseConfigFile(env: NodeJS.ProcessEnv): AiModelCandidate[] {
  const configPath = AI_CONFIG_FILE_KEYS
    .map((key) => env[key]?.trim())
    .find((value): value is string => Boolean(value));

  if (!configPath) {
    return [];
  }

  const resolvedPath = resolve(configPath);
  if (!existsSync(resolvedPath)) {
    return [];
  }

  return parseRawConfigJson(readFileSync(resolvedPath, 'utf8'));
}

function parseProvidersJson(env: NodeJS.ProcessEnv): AiModelCandidate[] {
  const raw = env[AI_PROVIDERS_JSON_KEY]?.trim();
  if (!raw) {
    return [];
  }

  return parseRawConfigJson(raw);
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
      api: 'openai-completions',
      baseUrl: normalizeBaseUrl(baseUrl),
      apiKey,
      headers: {},
      model,
      primary: true
    }
  ];
}

export function getAiModelCandidates(env: NodeJS.ProcessEnv = process.env): AiModelCandidate[] {
  const fileCandidates = parseConfigFile(env);
  if (fileCandidates.length > 0) {
    return fileCandidates;
  }

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
