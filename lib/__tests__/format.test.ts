import { describe, expect, it } from 'vitest';
import { formatCamera } from '@/lib/format';

describe('formatCamera', () => {
  it('inserts a space before MP values', () => {
    expect(formatCamera(108)).toBe('108 MP');
  });

  it('keeps descriptor text without collapsing whitespace', () => {
    expect(formatCamera(50, 'Main Camera')).toBe('50 MP Main Camera');
  });

  it('normalizes extra spacing when descriptor is omitted', () => {
    expect(formatCamera(12.5)).toBe('12.5 MP');
  });
});
