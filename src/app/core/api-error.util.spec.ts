import { describe, it, expect } from 'vitest';
import { parseApiError } from './api-error.util';
import { en } from './i18n/en';

// Same double as admin-error.util.spec: t() echoes an unknown key, tOrNull()
// is the guard built on that, and telling a real code from a string that
// merely looks like one is the whole job here.
const i18n = {
  t: (key: string) => en[key] ?? key,
  tOrNull: (key: unknown) => {
    if (typeof key !== 'string' || !key) return null;
    return en[key] ?? null;
  },
} as any;

describe('parseApiError', () => {
  it('reads the {"error": {"code": ...}} shape hand-written views use', () => {
    // Google sign-in with an address Google has not verified.
    const err = { error: { error: { code: 'auth.errEmailNotVerified' } } };
    expect(parseApiError(err, i18n, 'auth.errGoogleLoginFailed'))
      .toBe(en['auth.errEmailNotVerified']);
  });

  it('reads the DRF field shape a serializer raise produces', () => {
    // The accept-order guard raises ValidationError({'status': ...}), which
    // never passes through the {"error": {...}} contract.
    expect(parseApiError({ error: { status: ['checkout.errListingUnavailable'] } }, i18n, 'acct.updateFailed'))
      .toBe(en['checkout.errListingUnavailable']);
  });

  it('falls back rather than showing the user a raw key', () => {
    expect(parseApiError({ error: { error: { code: 'listing.errNotTranslatedYet' } } }, i18n, 'acct.updateFailed'))
      .toBe(en['acct.updateFailed']);
    expect(parseApiError({ error: { detail: 'Some untranslated prose' } }, i18n, 'acct.updateFailed'))
      .toBe(en['acct.updateFailed']);
    expect(parseApiError({}, i18n, 'acct.updateFailed')).toBe(en['acct.updateFailed']);
  });

  it('survives a body that is not an object', () => {
    expect(parseApiError({ error: 'Bad Gateway' }, i18n, 'acct.updateFailed')).toBe(en['acct.updateFailed']);
    expect(parseApiError({ error: ['nope'] }, i18n, 'acct.updateFailed')).toBe(en['acct.updateFailed']);
  });
});
