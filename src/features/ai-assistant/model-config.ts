import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_AI_CONFIG_FILE = 'config/ai-models.local.json';

let aiConfigFilePathForTests: string | null = null;

function timeoutSchema() {
  return z.number().int().positive().optional();
}

const configuredModelObjectSchema = z.object({
  id: z.string().min(1),
  alias: z.string().min(1).optional(),
  primary: z.boolean().optional(),
  timeoutMs: timeoutSchema(),
  autoTimeoutMs: timeoutSchema(),
  singleTimeoutMs: timeoutSchema()
});

const configuredModelSchema = z.union([
  z.string().min(1),
  configuredModelObjectSchema
]);

const configuredProviderSchema = z.object({
  _notes: z.union([z.string(), z.array(z.string())]).optional(),
  id: z.string().min(1).optional(),
  alias: z.string().min(1).optional(),
  api: z.literal('openai-completions').optional(),
  baseUrl: z.string().min(1),
  apiKey: z.string().min(1),
  headers: z.record(z.string()).optional(),
  timeoutMs: timeoutSchema(),
  autoTimeoutMs: timeoutSchema(),
  singleTimeoutMs: timeoutSchema(),
  models: z.array(configuredModelSchema).min(1)
});

const configuredProvidersSchema = z.array(configuredProviderSchema).min(1);
const configuredRootSchema = z.union([
  configuredProvidersSchema,
  z.object({
    _notes: z.union([z.string(), z.array(z.string())]).optional(),
    timeoutMs: timeoutSchema(),
    autoTimeoutMs: timeoutSchema(),
    singleTimeoutMs: timeoutSchema(),
    providers: configuredProvidersSchema
  }),
  z.object({
    _notes: z.union([z.string(), z.array(z.string())]).optional(),
    timeoutMs: timeoutSchema(),
    autoTimeoutMs: timeoutSchema(),
    singleTimeoutMs: timeoutSchema(),
    sites: configuredProvidersSchema
  }),
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

function normalizeConfiguredModel(model: ConfiguredModel) {
  if (typeof model === 'string') {
    return {
      id: model,
      alias: model,
      primary: false,
      timeoutMs: undefined,
      autoTimeoutMs: undefined,
      singleTimeoutMs: undefined
    };
  }

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

function normalizeRoot(root: z.infer<typeof configuredRootSchema>): {
  providers: ConfiguredProvider[];
  timeoutMs?: number;
  autoTimeoutMs?: number;
  singleTimeoutMs?: number;
} {
  if (Array.isArray(root)) {
    return { providers: root };
  }

  if ('providers' in root) {
    return {
      providers: root.providers,
      timeoutMs: root.timeoutMs,
      autoTimeoutMs: root.autoTimeoutMs,
      singleTimeoutMs: root.singleTimeoutMs
    };
  }

  if ('sites' in root) {
    return {
      providers: root.sites,
      timeoutMs: root.timeoutMs,
      autoTimeoutMs: root.autoTimeoutMs,
      singleTimeoutMs: root.singleTimeoutMs
    };
  }

  return { providers: [root] };
}

function candidatesFromProviders(
  providers: ConfiguredProvider[],
  rootTimeouts: { timeoutMs?: number; autoTimeoutMs?: number; singleTimeoutMs?: number } = {}
): AiModelCandidate[] {
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
        primary: normalizedModel.primary,
        autoTimeoutMs: normalizeTimeouts(normalizedModel.autoTimeoutMs, normalizedModel.timeoutMs, provider.autoTimeoutMs, provider.timeoutMs, rootTimeouts.autoTimeoutMs, rootTimeouts.timeoutMs),
        singleTimeoutMs: normalizeTimeouts(normalizedModel.singleTimeoutMs, normalizedModel.timeoutMs, provider.singleTimeoutMs, provider.timeoutMs, rootTimeouts.singleTimeoutMs, rootTimeouts.timeoutMs)
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

  const normalized = normalizeRoot(root.data);
  return candidatesFromProviders(normalized.providers, {
    timeoutMs: normalized.timeoutMs,
    autoTimeoutMs: normalized.autoTimeoutMs,
    singleTimeoutMs: normalized.singleTimeoutMs
  });
}

function parseRawConfigJson(raw: string): AiModelCandidate[] {
  try {
    return parseAiConfigPayload(JSON.parse(raw));
  } catch {
    return [];
  }
}

function parseConfigFile(env: NodeJS.ProcessEnv): AiModelCandidate[] {
  const resolvedPath = resolve(aiConfigFilePathForTests ?? DEFAULT_AI_CONFIG_FILE);
  if (!existsSync(resolvedPath)) {
    return [];
  }

  return parseRawConfigJson(readFileSync(resolvedPath, 'utf8'));
}

export function getAiModelCandidates(env: NodeJS.ProcessEnv = process.env): AiModelCandidate[] {
  return parseConfigFile(env);
}

export function setAiModelConfigFilePathForTests(path: string | null) {
  aiConfigFilePathForTests = path;
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
