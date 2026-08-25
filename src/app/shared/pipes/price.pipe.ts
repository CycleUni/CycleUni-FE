import { Pipe, PipeTransform } from '@angular/core';

export const DEFAULT_CURRENCY = 'NT$';

/**
 * Formats a numeric price with a currency prefix (default 'NT$').
 *
 * Usage:
 *   {{ 250 | price }}          // 250 -> 'NT$ 250'
 *   {{ 0 | price }}            // 0 -> 'NT$ 0'
 *   {{ price | price: '$' }}   // 250 -> '$ 250'
 *
 * Edge cases:
 * - null / undefined / '' -> ''
 * - 0 -> 'NT$ 0'
 * - numeric string (e.g. '250') -> 'NT$ 250'
 * - non-numeric string (e.g. '-') -> original value as string
 */
@Pipe({
  name: 'price',
  standalone: true,
  pure: true
})
export class PricePipe implements PipeTransform {
  transform(value: number | string | null | undefined, currency: string = DEFAULT_CURRENCY): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const num = typeof value === 'number' ? value : Number(value);
    if (isNaN(num)) {
      return String(value);
    }

    const prefix = currency ? `${currency.trim()} ` : '';
    return `${prefix}${num}`;
  }
}
