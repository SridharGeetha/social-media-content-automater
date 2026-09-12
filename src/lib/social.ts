import crypto from 'crypto';
import { UserRole } from '@/models/WorkspaceMember';

const STATE_TTL_MS = 10 * 60 * 1000;
const STATE_COOKIE_NAME = 'linkedin_oauth_state';

interface OAuthStatePayload {
  nonce: string;
  userId: string;
  workspaceId: string;
  expiresAt: number;
}

function getStateSecret(): string {
  return process.env.AUTH_SECRET || 'super-secret-auth-key-social-media-automater-2026';
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getStateSecret()).update(value).digest('base64url');
}

export function createOAuthState(userId: string, workspaceId: string): string {
  const payload: OAuthStatePayload = {
    nonce: crypto.randomBytes(32).toString('base64url'),
    userId,
    workspaceId,
    expiresAt: Date.now() + STATE_TTL_MS,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function validateOAuthState(state: string | undefined): OAuthStatePayload | null {
  if (!state) return null;

  const [encodedPayload, signature] = state.split('.');
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(decode(encodedPayload)) as OAuthStatePayload;
    if (
      typeof payload.nonce !== 'string' ||
      typeof payload.userId !== 'string' ||
      typeof payload.workspaceId !== 'string' ||
      typeof payload.expiresAt !== 'number' ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function canManageSocialAccounts(role: UserRole | undefined): boolean {
  return role === 'ADMIN';
}

function getEncryptionKey(): Buffer {
  const value = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!value) {
    throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY is missing.');
  }

  const base64Key = Buffer.from(value, 'base64');
  if (base64Key.length === 32 && base64Key.toString('base64').replace(/=+$/, '') === value.replace(/=+$/, '')) {
    return base64Key;
  }

  const rawKey = Buffer.from(value, 'utf8');
  if (rawKey.length === 32) return rawKey;

  throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY must be a 32-byte value or base64-encoded 32-byte value.');
}

export function encryptSocialToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptSocialToken(value: string): string {
  const [ivValue, authTagValue, encryptedValue] = value.split('.');
  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error('Invalid encrypted social token.');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export { STATE_COOKIE_NAME };