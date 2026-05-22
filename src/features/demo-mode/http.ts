import { getDemoModeConfig } from '@/features/demo-mode/config';
import { runDemoDataCleanupIfNeeded } from '@/features/demo-mode/cleanup';
import { getIpHash } from '@/features/demo-mode/ip';
import {
  DemoQuotaExceededError,
  getDemoUsageStore,
  type DemoUsageStore
} from '@/features/demo-mode/quota';
import { getOrCreateSignedVisitor } from '@/features/demo-mode/visitor';

export type DemoRequestContext = {
  enabled: true;
  visitorId: string;
  ipHash: string;
  store: DemoUsageStore;
  setCookie: string | null;
};

export async function getDemoRequestContext(request: Request): Promise<DemoRequestContext | null> {
  if (!getDemoModeConfig().enabled) {
    return null;
  }

  await runDemoDataCleanupIfNeeded();

  const visitor = await getOrCreateSignedVisitor(request);
  const ipHash = await getIpHash(request);

  return {
    enabled: true,
    visitorId: visitor.visitorId,
    ipHash,
    store: getDemoUsageStore(),
    setCookie: visitor.setCookie
  };
}

function appendSetCookie(headers: Headers, context: DemoRequestContext | null) {
  if (context?.setCookie) {
    headers.append('Set-Cookie', context.setCookie);
  }
}

export function jsonWithDemoContext(body: unknown, init: ResponseInit = {}, context: DemoRequestContext | null = null) {
  const headers = new Headers(init.headers);
  appendSetCookie(headers, context);
  return Response.json(body, { ...init, headers });
}

export function demoQuotaResponse(error: unknown, context: DemoRequestContext | null) {
  if (error instanceof DemoQuotaExceededError) {
    return jsonWithDemoContext({ error: error.userMessage, code: error.code }, { status: error.status }, context);
  }

  return null;
}
