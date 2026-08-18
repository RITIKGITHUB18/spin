import { describe, expect, it } from 'vitest';
import { maskPhone, normalizeIndianPhone, toMsg91Identifier } from './phone';
import { AppError } from './AppError';

describe('normalizeIndianPhone', () => {
  it('accepts every input form and produces one canonical value', () => {
    for (const input of [
      '9876543210',
      '+919876543210',
      '919876543210',
      '98765 43210',
      '+91 98765-43210',
      '09876543210'.replace(/^0/, ''), // 10-digit after stripping a leading 0
    ]) {
      expect(normalizeIndianPhone(input)).toBe('+919876543210');
    }
  });

  it('rejects numbers that are not Indian mobiles', () => {
    // Indian mobiles start 6-9; these are landline prefixes, wrong lengths or
    // other countries.
    for (const bad of ['1234567890', '5876543210', '98765', '+14155552671', '', '98765432101']) {
      expect(() => normalizeIndianPhone(bad)).toThrow(AppError);
    }
  });

  it('never silently accepts an arbitrary international number', () => {
    // +1 415 555 2671 -> 11 digits, must not be coerced into a valid Indian one
    expect(() => normalizeIndianPhone('+14155552671')).toThrow(/valid 10-digit Indian/);
  });
});

describe('toMsg91Identifier', () => {
  it('drops the leading plus for the widget identifier', () => {
    expect(toMsg91Identifier('+919876543210')).toBe('919876543210');
  });
});

describe('maskPhone', () => {
  it('hides the middle digits', () => {
    const masked = maskPhone('+919876543210');
    expect(masked).toBe('+9198*****10');
    expect(masked).not.toContain('76543');
  });
});
