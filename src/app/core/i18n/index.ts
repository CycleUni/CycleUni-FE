export type Lang = 'en' | 'zh-TW' | 'zh-HK';

import { en } from './en';

export const TRANSLATIONS: Partial<Record<Lang, Record<string, string>>> & { en: Record<string, string> } = {
  en,
};
