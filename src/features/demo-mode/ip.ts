import { createHmac } from 'node:crypto';

function getIpHashSecret() {
  const secret = process.env.WENJUAN_DEMO_IP_HASH_SECRET?.trim();

  if (!secret) {
    throw new Error('WENJUAN_DEMO_IP_HASH_SECRET is required when demo IP quota is used');
  }

  return secret;
}

export function getClientIp(request: Request) {
  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwardedFor) {
    return forwardedFor;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

export async function getIpHash(request: Request) {
  const ip = getClientIp(request);
  const digest = createHmac('sha256', getIpHashSecret()).update(ip).digest('base64url');
  return `ip_${digest}`;
}
