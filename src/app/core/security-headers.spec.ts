import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// public/_headers is the only place these are declared, and nothing else in
// the build would notice if a directive were dropped — Cloudflare just serves
// whatever the file says, and a missing header is silent.
const HEADERS_PATH = path.join(process.cwd(), 'public/_headers');
const source = fs.readFileSync(HEADERS_PATH, 'utf-8');

/** Header lines only: '#' comments carry the same words and would otherwise
 *  satisfy every assertion below without a header existing at all. */
const headerLines = source
  .split('\n')
  .filter(line => line.startsWith('  ') && !line.trimStart().startsWith('#'));

function headerValue(name: string): string | null {
  const hit = headerLines.find(line => line.trimStart().startsWith(`${name}:`));
  return hit ? hit.slice(hit.indexOf(':') + 1).trim() : null;
}

describe('public/_headers', () => {
  it('still sets the headers the app relies on', () => {
    // Each of these was added for a reason recorded in the file; a silent
    // regression here is the kind that is only noticed after an incident.
    expect(headerValue('X-Content-Type-Options')).toBe('nosniff');
    expect(headerValue('X-Frame-Options')).toBe('DENY');
    expect(headerValue('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headerValue('Strict-Transport-Security')).toContain('max-age=');
    expect(headerValue('Permissions-Policy')).toContain('camera=');
  });

  describe('Content-Security-Policy', () => {
    // Committed state is Report-Only; scripts/set-env.js rewrites this line at
    // build time and can promote it to enforcing. Either name is valid here —
    // what matters is that a policy exists and says the right things.
    const csp =
      headerValue('Content-Security-Policy-Report-Only') ??
      headerValue('Content-Security-Policy');

    const directive = (name: string) =>
      (csp ?? '')
        .split(';')
        .map(part => part.trim())
        .find(part => part === name || part.startsWith(`${name} `)) ?? null;

    it('is present', () => {
      expect(csp).not.toBeNull();
    });

    it('keeps the directives that do not depend on the deployment', () => {
      expect(directive('default-src')).toBe("default-src 'self'");
      expect(directive('object-src')).toBe("object-src 'none'");
      expect(directive('base-uri')).toBe("base-uri 'self'");
      expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
      expect(directive('form-action')).toBe("form-action 'self'");
    });

    it("never allows 'unsafe-eval', and no inline script", () => {
      // 'unsafe-inline' in style-src is a known, documented concession for
      // Angular's component styles. Script is a different matter: allowing it
      // there would defeat the point of having a policy at all.
      expect(csp).not.toContain("'unsafe-eval'");
      expect(directive('script-src')).not.toContain("'unsafe-inline'");
    });

    it('does not let a wildcard reach script-src', () => {
      // img-src/connect-src carry wildcards in the committed fallback (see the
      // file's comment); script-src must never be among them, in any state.
      expect(directive('script-src')).not.toMatch(/(^|\s)(\*|https:)(\s|$)/);
    });
  });
});
