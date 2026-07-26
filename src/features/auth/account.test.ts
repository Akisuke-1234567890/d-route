import { describe, expect, it } from 'vitest';
import { normalizeLoginId, validateLoginId, validatePassword } from './account';

describe('v2 account validation', () => {
  it('normalizes login ids for stable lookup', () => {
    expect(normalizeLoginId('  Route.User_1 ')).toBe('route.user_1');
  });

  it('accepts the supported login id character set', () => {
    expect(validateLoginId('route_user-01')).toBeNull();
  });

  it('rejects short or unsupported login ids', () => {
    expect(validateLoginId('abc')).toBeTruthy();
    expect(validateLoginId('route user')).toBeTruthy();
  });

  it('requires at least 8 password characters in the client guard', () => {
    expect(validatePassword('1234567')).toBeTruthy();
    expect(validatePassword('12345678')).toBeNull();
  });
});
