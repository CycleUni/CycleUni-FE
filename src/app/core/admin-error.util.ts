import { I18nService } from './i18n.service';

/** Was a local helper; the same guard is needed wherever a backend `error.code`
 *  reaches `t()`, so it now lives on the service that owns the echo behaviour. */
function translated(key: unknown, i18n: I18nService): string | null {
  return i18n.tOrNull(key);
}

export function parseAdminError(err: any, i18n: I18nService, fallbackKey = 'admin.errGeneric'): string {
  // The shape the views use deliberately: {"error": {"code": "..."}}.
  const direct = translated(err?.error?.error?.code, i18n);
  if (direct) return direct;

  // DRF serializer validation does not use that shape. A failed validate()
  // surfaces as a flat {field: message | [messages]} body, so a serializer
  // raising a perfectly good code was still landing on the generic message —
  // every region validation error read "something went wrong" no matter what
  // had actually gone wrong.
  const body = err?.error;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const value of Object.values(body)) {
      const hit = translated(Array.isArray(value) ? value[0] : value, i18n);
      if (hit) return hit;
    }
  }

  return i18n.t(fallbackKey);
}
