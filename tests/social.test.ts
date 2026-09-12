import { beforeEach, describe, expect, it } from 'vitest';
import {
  canManageSocialAccounts,
  createOAuthState,
  decryptSocialToken,
  encryptSocialToken,
  validateOAuthState,
} from '@/lib/social';

describe('LinkedIn social account security helpers', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-auth-secret';
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
  });

  it.each([
    ['ADMIN', true],
    ['MANAGER', false],
    ['CREATOR', false],
  ] as const)('allows only %s to manage social accounts', (role, expected) => {
    expect(canManageSocialAccounts(role)).toBe(expected);
  });

  it('validates OAuth state and rejects tampering', () => {
    const state = createOAuthState('user-a', 'workspace-a');
    expect(validateOAuthState(state)).toMatchObject({ userId: 'user-a', workspaceId: 'workspace-a' });
    expect(validateOAuthState(`${state}tampered`)).toBeNull();
  });

  it('encrypts tokens without retaining the plaintext and decrypts them', () => {
    const encrypted = encryptSocialToken('linkedin-secret-token');
    expect(encrypted).not.toContain('linkedin-secret-token');
    expect(decryptSocialToken(encrypted)).toBe('linkedin-secret-token');
  });
});