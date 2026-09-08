import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export function sha256Hash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function generateUUID(): string {
  return uuidv4();
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validate file signature (magic bytes) to prevent MIME spoofing
 */
export function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  const signatures: Record<string, number[][]> = {
    'image/jpeg': [[0xff, 0xd8, 0xff]],
    'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header for WebP
  };

  const allowedSigs = signatures[mimeType];
  if (!allowedSigs) return false;

  return allowedSigs.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}
