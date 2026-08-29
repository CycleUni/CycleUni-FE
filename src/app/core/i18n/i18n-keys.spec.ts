import * as fs from 'fs';
import * as path from 'path';
import { en } from './en';
import { zhTW } from './zh-TW';
import { zhHK } from './zh-HK';
import { IMAGE_PREVIEW_TOKEN } from '../../features/messages/message-formatting.util';

const I18N_DIR = path.join(process.cwd(), 'src/app/core/i18n');
const SRC_DIR = path.join(process.cwd(), 'src/app');
// A sibling directory on disk, not a name in this file's own vocabulary.
// When the rename swept it up the first time, existsSync went false and the
// orphan check silently stopped seeing the ~50 keys the backend references
// by name, reporting every one of them as unused. It tracks the directory,
// which is now UniBooks-BE; the GitHub repository is a separate name and
// does not have to match.
const BE_DIR = path.join(process.cwd(), '..', 'UniBooks-BE');

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

  it('should declare every key the app actually renders', () => {
    // The orphan check above looks the other way: declared but unreferenced.
    // Nothing caught a key that is *rendered but never declared*, so
    // `admin.editRegion` shipped and the admin page displayed the raw key
    // string as its heading. Unit tests cannot see that; only a browser or
    // this check can.
    const feFiles = walk(SRC_DIR, ['.ts', '.html'], ['i18n']).filter(f => !f.endsWith('.spec.ts'));

    // A key built at runtime ('order.status.' + s) is declared under its
    // concrete forms, so only the literal call sites can be checked.
    const dynamicPrefixes = new Set<string>();
    const dynamicPrefixPattern = /['"]([a-zA-Z0-9_.]+[._])['"]\s*\+/g;
    const dynamicTemplatePattern = /`([a-zA-Z0-9_.]+[._])\$\{/g;

    const rendered = new Map<string, string>();
    // Only forms that reach the translator: the `| t` pipe in a template and
    // i18n.t('...') in TypeScript. A bare string that merely looks like a key
    // — a backend error code being compared, say — is not a render.
    const pipePattern = /['"]([a-zA-Z0-9_]+\.[a-zA-Z0-9._]+)['"]\s*\|\s*t\b/g;
    const callPattern = /\.t\(\s*['"]([a-zA-Z0-9_]+\.[a-zA-Z0-9._]+)['"]/g;

    for (const file of feFiles) {
      const source = fs.readFileSync(file, 'utf-8');
      let match: RegExpExecArray | null;
      for (const pattern of [dynamicPrefixPattern, dynamicTemplatePattern]) {
        pattern.lastIndex = 0;
        while ((match = pattern.exec(source)) !== null) dynamicPrefixes.add(match[1]);
      }
      for (const pattern of [pipePattern, callPattern]) {
        pattern.lastIndex = 0;
        while ((match = pattern.exec(source)) !== null) {
          if (!rendered.has(match[1])) rendered.set(match[1], path.relative(SRC_DIR, file));
        }
      }
    }

    const prefixes = [...dynamicPrefixes];
    const undeclared = [...rendered.entries()]
      .filter(([key]) => !prefixes.some(prefix => key.startsWith(prefix)))
      .filter(([key]) => !(key in en))
      .map(([key, file]) => `${key} (${file})`)
      .sort();

    expect(undeclared).toEqual([]);
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
