import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { Lang, TRANSLATIONS } from './i18n';

const STORAGE_KEY = 'lang';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  readonly lang = signal<Lang>(this.initialLang());

  private initialLang(): Lang {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'zh-TW') {
        return stored;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) {
      return 'zh-TW';
    }
    return 'en';
  }

  setLang(lang: Lang) {
    this.lang.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }

  /** Translate a key with optional {param} interpolation. Unknown keys fall
   * back to English, then to the key itself so gaps stay visible. */
  t(key: string, params?: Record<string, string | number>): string {
    const table = TRANSLATIONS[this.lang()] ?? TRANSLATIONS['en'];
    let text = table[key] ?? TRANSLATIONS['en'][key] ?? key;
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  }
}

/** `{{ 'key' | t }}` / `{{ 'key' | t:{n: 3} }}` — impure so language switches
 * re-evaluate bindings; lookups are cheap dictionary reads. */
@Pipe({
  name: 't',
  standalone: true,
  pure: false
})
export class TPipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
