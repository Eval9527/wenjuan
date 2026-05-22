import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getOrCreateSignedVisitor, verifySignedVisitorCookie } from '@/features/demo-mode/visitor';

const COOKIE_NAME = 'wenjuan_demo_visitor';

describe('demo visitor signed cookie', () => {
  beforeEach(() => {
    process.env.WENJUAN_DEMO_VISITOR_SECRET = 'visitor-test-secret';
  });

  afterEach(() => {
    delete process.env.WENJUAN_DEMO_VISITOR_SECRET;
  });

  it('creates an http-only signed visitor cookie when one is missing', async () => {
    const visitor = await getOrCreateSignedVisitor(new Request('http://localhost'));

    expect(visitor.visitorId).toMatch(/^vis_/);
    expect(visitor.setCookie).toContain(`${COOKIE_NAME}=${visitor.cookieValue}`);
    expect(visitor.setCookie).toContain('HttpOnly');
    expect(visitor.setCookie).toContain('SameSite=Lax');
    expect(verifySignedVisitorCookie(visitor.cookieValue)).toBe(visitor.visitorId);
  });

  it('accepts a valid cookie without issuing a replacement', async () => {
    const first = await getOrCreateSignedVisitor(new Request('http://localhost'));
    const second = await getOrCreateSignedVisitor(
      new Request('http://localhost', {
        headers: { cookie: `${COOKIE_NAME}=${first.cookieValue}` }
      })
    );

    expect(second.visitorId).toBe(first.visitorId);
    expect(second.setCookie).toBeNull();
  });

  it('rejects a tampered cookie and rotates to a new visitor id', async () => {
    const first = await getOrCreateSignedVisitor(new Request('http://localhost'));
    const tampered = first.cookieValue.replace(first.visitorId, 'vis_tampered');
    const next = await getOrCreateSignedVisitor(
      new Request('http://localhost', {
        headers: { cookie: `${COOKIE_NAME}=${tampered}` }
      })
    );

    expect(verifySignedVisitorCookie(tampered)).toBeNull();
    expect(next.visitorId).not.toBe(first.visitorId);
    expect(next.setCookie).toContain(`${COOKIE_NAME}=${next.cookieValue}`);
  });
});
