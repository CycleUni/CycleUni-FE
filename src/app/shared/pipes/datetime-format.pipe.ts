import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats an ISO 8601 datetime string into a human-readable form:
 *   `2026/07/29 12:12 (+08:00)`
 *
 * Usage: {{ meetupTime | dateTimeFormat }}
 *
 * Edge cases:
 * - null / undefined / empty → ''
 * - `2026-07-29` (date only)  → `2026/07/29`
 * - `2026-07-29T12:12:00Z`   → `2026/07/29 12:12 (+00:00)`
 * - invalid date string       → original value returned unchanged
 */
@Pipe({
  name: 'dateTimeFormat',
  standalone: true,
  pure: true
})
export class DateTimeFormatPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    const d = new Date(value);
    if (isNaN(d.getTime())) return value;

    const yyyy = d.getFullYear();
    const mm = this.pad(d.getMonth() + 1);
    const dd = this.pad(d.getDate());
    const datePart = `${yyyy}/${mm}/${dd}`;

    // Date-only input (no time component in the original string)
    const hasTime = this.hasTimeComponent(value);
    if (!hasTime) return datePart;

    const hh = this.pad(d.getHours());
    const min = this.pad(d.getMinutes());
    const timePart = `${hh}:${min}`;

    const tz = this.extractTz(value, d);

    return `${datePart} ${timePart} (${tz})`;
  }

  /**
   * Determines whether the original input string carries a time component.
   * Examples with time: `2026-07-29T12:12`, `2026-07-29T12:12:00Z`
   * Examples without : `2026-07-29`, `2026-07`
   */
  private hasTimeComponent(value: string): boolean {
    // Anything after a 'T' (or 't') is a time component.
    if (/T/i.test(value)) return true;
    // ISO ordinal date or longer date strings (YYYY-MM-DDThh:mm) handled above;
    // pure `YYYY-MM-DD` has no second separator, treat as date-only.
    return value.trim().length > 10;
  }

  /**
   * Prefer the timezone offset embedded in the source string; fall back to
   * the host environment's offset derived from the Date object.
   */
  private extractTz(value: string, d: Date): string {
    const match = value.match(/(\+|-)(\d{2}):(\d{2})$/);
    if (match) {
      return `${match[1]}${match[2]}:${match[3]}`;
    }
    // 'Z' suffix → UTC
    if (/Z$/i.test(value)) return '+00:00';
    // Fallback: compute from the Date object's local offset (minutes).
    return this.computeTzOffset(d);
  }

  private computeTzOffset(d: Date): string {
    const offsetMinutes = -d.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const hh = this.pad(Math.floor(abs / 60));
    const min = this.pad(abs % 60);
    return `${sign}${hh}:${min}`;
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : String(n);
  }
}
