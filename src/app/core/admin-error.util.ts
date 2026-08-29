import { I18nService } from './i18n.service';

export function parseAdminError(err: any, i18n: I18nService, fallbackKey = 'admin.errGeneric'): string {
  const code = err?.error?.error?.code;
  if (code && typeof code === 'string') {
    const translated = i18n.t(code);
    if (translated !== code) {
      return translated;
    }
  }
  return i18n.t(fallbackKey);
}
