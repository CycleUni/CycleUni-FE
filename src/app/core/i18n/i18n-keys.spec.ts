import * as fs from 'fs';
import * as path from 'path';
import { en } from './en';
import { zhTW } from './zh-TW';

/**
 * Static checks on the translation dictionaries themselves. These catch
 * drift that's easy to introduce by hand-editing en.ts/zh-TW.ts — missing a
 * key in one language, pasting a duplicate, or leaving a key behind after
 * removing the code that used it — none of which TypeScript's
 * Record<string, string> type catches on its own (duplicate object-literal
 * keys just silently collapse to the last one at parse time).
 */

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

describe('i18n translation keys (en.ts / zh-TW.ts)', () => {
  it('should have the exact same set of keys in both languages (no missing keys)', () => {
    const enKeys = new Set(Object.keys(en));
    const zhKeys = new Set(Object.keys(zhTW));

    const missingInZh = [...enKeys].filter(k => !zhKeys.has(k)).sort();
    const missingInEn = [...zhKeys].filter(k => !enKeys.has(k)).sort();

    expect(missingInZh).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it('should not declare the same key twice within one language file', () => {
    // Duplicate keys in a `Record<string,string>` literal silently collapse
    // to the last one at parse time, so Object.keys() on the already-
    // imported `en`/`zhTW` objects can never reveal a duplicate existed —
    // this reads the raw source text instead.
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
  });

  it('should not declare keys that nothing in the app references', () => {
    // Heuristic, source-text based — not a real TS/HTML AST parse. A key
    // counts as "used" if its quoted literal appears anywhere in the
    // frontend source, or in the Django backend: many keys are returned as
    // error codes (e.g. {"error": {"code": "acct.errEduEmail"}}) and
    // translated dynamically via `i18n.t(code)` on the frontend, so a plain
    // substring search — not requiring adjacency to `| t` — is what catches
    // those without simulating every call site. Keys built by string
    // concatenation (`'cond.' + listing.condition`) have no literal to
    // find at all, so any such prefix seen in the source is treated as
    // "used" for every key starting with it.
    //
    // If this fails on a key that IS genuinely used, the scan missed the
    // pattern — extend the prefix/source detection below rather than
    // deleting the check. If it fails on a key that's genuinely dead,
    // delete it from en.ts and zh-TW.ts.
    const feFiles = walk(SRC_DIR, ['.ts'], ['i18n']).filter(f => !f.endsWith('.spec.ts'));
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

    // The Django backend is a sibling directory, not guaranteed to be
    // present in every checkout of this repo alone — skip gracefully
    // rather than failing the whole suite if it's missing.
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
});
