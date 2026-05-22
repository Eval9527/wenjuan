import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const DEMO_VISITOR_COOKIE_NAME = 'wenjuan_demo_visitor';
const VISITOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getVisitorSecret() {
  const secret = process.env.WENJUAN_DEMO_VISITOR_SECRET?.trim();

  if (!secret) {
    throw new Error('WENJUAN_DEMO_VISITOR_SECRET is required when demo visitor cookies are used');
  }

  return secret;
}

function base64Url(input: Buffer) {
  return input.toString('base64url');
}

function signVisitorId(visitorId: string) {
  return base64Url(createHmac('sha256', getVisitorSecret()).update(visitorId).digest());
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildSignedVisitorCookieValue(visitorId: string) {
  return `${visitorId}.${signVisitorId(visitorId)}`;
}

export function verifySignedVisitorCookie(cookieValue: string | undefined | null) {
  if (!cookieValue) {
    return null;
  }

  const separatorIndex = cookieValue.indexOf('.');
  if (separatorIndex <= 0) {
    return null;
  }

  const visitorId = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);

  if (!visitorId.startsWith('vis_') || !signature) {
    return null;
  }

  return safeEqual(signature, signVisitorId(visitorId)) ? visitorId : null;
}

function parseCookie(header: string | null, name: string) {
  if (!header) {
    return null;
  }

  return header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? null;
}

function serializeVisitorCookie({ request, cookieValue }: { request: Request; cookieValue: string }) {
  const isSecure = new URL(request.url).protocol === 'https:' || process.env.NODE_ENV === 'production';
  return [
    `${DEMO_VISITOR_COOKIE_NAME}=${cookieValue}`,
    'Path=/',
    `Max-Age=${VISITOR_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
    isSecure ? 'Secure' : null
  ].filter(Boolean).join('; ');
}

export async function getOrCreateSignedVisitor(request: Request) {
  const cookieValue = parseCookie(request.headers.get('cookie'), DEMO_VISITOR_COOKIE_NAME);
  const verifiedVisitorId = verifySignedVisitorCookie(cookieValue);

  if (verifiedVisitorId && cookieValue) {
    return {
      visitorId: verifiedVisitorId,
      cookieValue,
      setCookie: null as string | null
    };
  }

  const visitorId = `vis_${randomUUID().replace(/-/g, '')}`;
  const nextCookieValue = buildSignedVisitorCookieValue(visitorId);

  return {
    visitorId,
    cookieValue: nextCookieValue,
    setCookie: serializeVisitorCookie({ request, cookieValue: nextCookieValue })
  };
}
