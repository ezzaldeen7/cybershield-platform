/**
 * Encryption Service - AES-256-GCM
 * ================================
 * Encrypts sensitive user data at rest
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Generate from: node -e "console.log(crypto.randomBytes(32).toString('base64'))"
// In production, use: process.env.ENCRYPTION_KEY
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'base64')
  : Buffer.from('0'.repeat(64), 'hex');

export interface EncryptedData {
  iv: string;
  ciphertext: string;
  authTag: string;
}

export function encrypt(plaintext: string): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    ciphertext,
    authTag: authTag.toString('hex'),
  };
}

export function decrypt(encrypted: EncryptedData): string {
  if (!encrypted.iv || !encrypted.ciphertext || !encrypted.authTag) {
    throw new Error('Invalid encrypted data format');
  }
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(encrypted.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
  
  let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}

export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
