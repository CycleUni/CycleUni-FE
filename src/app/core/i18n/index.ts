export type Lang = 'en' | 'zh-TW';

import { en } from './en';
import { zhTW } from './zh-TW';

export const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en,
  'zh-TW': zhTW,
};