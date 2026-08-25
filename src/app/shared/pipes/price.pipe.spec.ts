import { PricePipe, DEFAULT_CURRENCY } from './price.pipe';

describe('PricePipe', () => {
  let pipe: PricePipe;

  beforeEach(() => {
    pipe = new PricePipe();
  });

  it('renders integer price with default NT$ prefix', () => {
    expect(pipe.transform(100)).toBe('NT$ 100');
    expect(pipe.transform(250)).toBe('NT$ 250');
    expect(pipe.transform(1500)).toBe('NT$ 1500');
  });

  it('renders zero as NT$ 0', () => {
    expect(pipe.transform(0)).toBe('NT$ 0');
  });

  it('renders decimal price correctly', () => {
    expect(pipe.transform(99.5)).toBe('NT$ 99.5');
  });

  it('handles null, undefined, and empty string safely by returning empty string', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('handles numeric string inputs correctly', () => {
    expect(pipe.transform('500')).toBe('NT$ 500');
    expect(pipe.transform('0')).toBe('NT$ 0');
    expect(pipe.transform('120.5')).toBe('NT$ 120.5');
  });

  it('handles non-numeric string inputs by returning them unchanged', () => {
    expect(pipe.transform('-')).toBe('-');
    expect(pipe.transform('N/A')).toBe('N/A');
    expect(pipe.transform('Free')).toBe('Free');
  });

  it('supports custom currency prefix', () => {
    expect(pipe.transform(250, '$')).toBe('$ 250');
    expect(pipe.transform(250, 'USD')).toBe('USD 250');
    expect(pipe.transform(0, 'USD')).toBe('USD 0');
  });

  it('handles custom currency with trailing whitespace cleanly', () => {
    expect(pipe.transform(250, 'NT$ ')).toBe('NT$ 250');
    expect(pipe.transform(250, ' $ ')).toBe('$ 250');
  });

  it('supports empty currency prefix', () => {
    expect(pipe.transform(250, '')).toBe('250');
    expect(pipe.transform(0, '')).toBe('0');
  });

  it('uses DEFAULT_CURRENCY constant', () => {
    expect(DEFAULT_CURRENCY).toBe('NT$');
  });
});
