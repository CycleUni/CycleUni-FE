import { Injectable, Pipe, PipeTransform, inject, signal, effect } from '@angular/core';
import { Lang, TRANSLATIONS } from './i18n';

const STORAGE_KEY = 'lang';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  readonly lang = signal<Lang>(this.initialLang());

  constructor() {
    // index.html ships a hardcoded lang="en". initialLang() may resolve to
    // zh-TW from storage or navigator on the very first paint, and until now
    // only setLang() synced the attribute — so a reader arriving with a
    // Chinese browser got Traditional Chinese text inside a document still
    // declaring English. That mis-declares the language to screen readers,
    // and lets the browser pick Han glyph variants for the wrong locale
    // (several codepoints render differently for zh-TW, zh-CN and ja).
    effect(() => this.syncDocumentLang(this.lang()));
  }

  private syncDocumentLang(lang: Lang) {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }

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
    // The effect in the constructor propagates the change to <html lang>.
    this.lang.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
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
