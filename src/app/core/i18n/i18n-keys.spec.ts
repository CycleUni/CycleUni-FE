import * as fs from 'fs';
import * as path from 'path';
import { en } from './en';
import { zhTW } from './zh-TW';
import { zhHK } from './zh-HK';
import { IMAGE_PREVIEW_TOKEN } from '../../features/messages/message-formatting.util';

const I18N_DIR = path.join(process.cwd(), 'src/app/core/i18n');
const SRC_DIR = path.join(process.cwd(), 'src/app');
const BE_DIR = path.join(process.cwd(), '..', 'CycleUni-BE');

function walk(dir: string, exts: string[], skipDirs: string[] = []): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full, exts, skipDirs));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

function extractDeclaredKeys(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf-8');
  const pattern = /^\s*'([a-zA-Z0-9_.]+)':/gm;
  const keys: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

describe('i18n translation keys (en.ts / zh-TW.ts / zh-HK.ts)', () => {
  it('should have the exact same set of keys in all languages (no missing keys)', () => {
    const enKeys = new Set(Object.keys(en));
    const zhTwKeys = new Set(Object.keys(zhTW));
    const zhHkKeys = new Set(Object.keys(zhHK));

    const missingInZhTw = [...enKeys].filter(k => !zhTwKeys.has(k)).sort();
    const missingInEn = [...zhTwKeys].filter(k => !enKeys.has(k)).sort();
    const missingInZhHk = [...enKeys].filter(k => !zhHkKeys.has(k)).sort();

    expect(missingInZhTw).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(missingInZhHk).toEqual([]);
  });

  it('should not declare the same key twice within one language file', () => {
    const findDuplicates = (filePath: string): string[] => {
      const keys = extractDeclaredKeys(filePath);
      const seen = new Map<string, number>();
      for (const key of keys) seen.set(key, (seen.get(key) ?? 0) + 1);
      return [...seen.entries()]
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
        .sort();
    };

    expect(findDuplicates(path.join(I18N_DIR, 'en.ts'))).toEqual([]);
    expect(findDuplicates(path.join(I18N_DIR, 'zh-TW.ts'))).toEqual([]);
    expect(findDuplicates(path.join(I18N_DIR, 'zh-HK.ts'))).toEqual([]);
  });

  it('should not declare keys that nothing in the app references', () => {
    const feFiles = walk(SRC_DIR, ['.ts', '.html'], ['i18n']).filter(f => !f.endsWith('.spec.ts'));
    let combinedSource = '';
    const dynamicPrefixes = new Set<string>();
    const dynamicPrefixPattern = /['"]([a-zA-Z0-9_.]+[._])['"]\s*\+/g;
    const dynamicTemplatePattern = /`([a-zA-Z0-9_.]+[._])\$\{/g;

    for (const file of feFiles) {
      const source = fs.readFileSync(file, 'utf-8');
      combinedSource += source;
      let match: RegExpExecArray | null;
      dynamicPrefixPattern.lastIndex = 0;
      while ((match = dynamicPrefixPattern.exec(source)) !== null) dynamicPrefixes.add(match[1]);
      dynamicTemplatePattern.lastIndex = 0;
      while ((match = dynamicTemplatePattern.exec(source)) !== null) dynamicPrefixes.add(match[1]);
    }

    let backendSource = '';
    if (fs.existsSync(BE_DIR)) {
      const beFiles = walk(BE_DIR, ['.py'], ['migrations', '.venv', 'tests', 'node_modules']);
      for (const file of beFiles) backendSource += fs.readFileSync(file, 'utf-8');
    }

    const allKeys = new Set([...Object.keys(en), ...Object.keys(zhTW)]);
    const prefixes = [...dynamicPrefixes];

    const unused = [...allKeys]
      .filter(key => {
        if (prefixes.some(prefix => key.startsWith(prefix))) return false;
        if (
          combinedSource.includes(`'${key}'`) ||
          combinedSource.includes(`"${key}"`) ||
          combinedSource.includes('`' + key)
        ) {
          return false;
        }
        if (backendSource && (backendSource.includes(`'${key}'`) || backendSource.includes(`"${key}"`))) {
          return false;
        }
        return true;
      })
      .sort();

    expect(unused).toEqual([]);
  });

  it('should resolve the image-preview token CFEdgeChat writes', () => {
    const key = IMAGE_PREVIEW_TOKEN.replace(/^\[SYSTEM:/, '').replace(/\]$/, '');

    expect(en[key]).toBeTruthy();
    expect(zhTW[key]).toBeTruthy();
    expect(zhHK[key]).toBeTruthy();
    expect(en[key]).not.toEqual(zhTW[key]);

    const chatRoom = path.join(process.cwd(), '..', 'CFEdgeChat', 'src', 'ChatRoom.ts');
    if (fs.existsSync(chatRoom)) {
      expect(fs.readFileSync(chatRoom, 'utf-8')).toContain(IMAGE_PREVIEW_TOKEN);
    }
  });
});
