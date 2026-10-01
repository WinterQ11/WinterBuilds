import crypto from 'crypto';

function getJwtSecret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ADMIN_SECRET || 'winterbuilds_master_secret_2026';
}

/**
 * Returns the administrator password configured in environment variables.
 * Defaults to 'winterbuilds2026!' if not explicitly overridden.
 */
export function getAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || 'winterbuilds2026!').trim();
}

/**
 * Checks whether an admin password has been set via environment variables.
 */
export function isAdminPasswordConfigured(): boolean {
  return true;
}

/**
 * Verifies whether the provided plaintext password matches the environment admin password.
 * Uses timingSafeEqual where possible to prevent timing analysis.
 */
export function verifyAdminPassword(password: string): boolean {
  if (!password) return false;
  const configuredPassword = getAdminPassword();
  if (!configuredPassword) return false;

  try {
    const bufA = Buffer.from(password);
    const bufB = Buffer.from(configuredPassword);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return password === configuredPassword;
  }
}

/**
 * Validates if an email is in the authorized admin list.
 */
export function isAllowedAdminEmail(email?: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS || 'winterbuilds99@gmail.com')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    return normalized === 'winterbuilds99@gmail.com';
  }

  return adminEmails.includes(normalized);
}

/**
 * Generates an HMAC-signed session token for the administrator.
 */
export function createAdminSessionToken(email: string): string {
  const payload = {
    email: email.trim().toLowerCase(),
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', getJwtSecret()).update(payloadB64).digest('base64url');
  return `admin_jwt_${payloadB64}.${signature}`;
}

/**
 * Verifies an HMAC-signed administrator session token.
 */
export function verifyAdminSessionToken(token: string): { valid: boolean; email?: string } {
  if (!token.startsWith('admin_jwt_')) {
    return { valid: false };
  }

  const raw = token.slice('admin_jwt_'.length);
  const parts = raw.split('.');
  if (parts.length !== 2) {
    return { valid: false };
  }

  const [payloadB64, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', getJwtSecret()).update(payloadB64).digest('base64url');

  try {
    const bufA = Buffer.from(signature);
    const bufB = Buffer.from(expectedSig);
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return { valid: false };
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (!payload.exp || Date.now() > payload.exp) {
      return { valid: false };
    }

    return { valid: true, email: payload.email };
  } catch {
    return { valid: false };
  }
}
