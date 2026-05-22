import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getClientIp, getIpHash } from '@/features/demo-mode/ip';

describe('demo ip hashing', () => {
  beforeEach(() => {
    process.env.WENJUAN_DEMO_IP_HASH_SECRET = 'ip-hash-test-secret';
  });

  afterEach(() => {
    delete process.env.WENJUAN_DEMO_IP_HASH_SECRET;
  });

  it('prefers Cloudflare connecting ip and hashes without storing raw ip', async () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '198.51.100.99, 10.0.0.1',
        'cf-connecting-ip': '203.0.113.8'
      }
    });

    expect(getClientIp(request)).toBe('203.0.113.8');
    const hash = await getIpHash(request);

    expect(hash).toMatch(/^ip_/);
    expect(hash).not.toContain('203.0.113.8');
    await expect(getIpHash(request)).resolves.toBe(hash);
  });

  it('falls back to the first x-forwarded-for ip', () => {
    expect(
      getClientIp(
        new Request('http://localhost', {
          headers: { 'x-forwarded-for': '198.51.100.99, 10.0.0.1' }
        })
      )
    ).toBe('198.51.100.99');
  });
});
