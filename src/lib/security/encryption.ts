/**
 * AES-256-GCM Encryption Module
 *
 * Provides authenticated encryption for sensitive data
 * Uses modern AEAD (Authenticated Encryption with Associated Data)
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Encryption result interface
 */
export interface EncryptedData {
  data: string; // base64 encoded encrypted data
  iv: string; // base64 encoded initialization vector
  authTag: string; // base64 encoded authentication tag
  salt: string; // base64 encoded salt for key derivation
}

/**
 * Encryption options
 */
export interface EncryptionOptions {
  keySize?: number; // default: 32 (256 bits)
  ivSize?: number; // default: 16 (128 bits)
  saltSize?: number; // default: 16 (128 bits)
  authTagSize?: number; // default: 16 (128 bits)
}

const DEFAULT_OPTIONS: EncryptionOptions = {
  keySize: 32,
  ivSize: 16,
  saltSize: 16,
  authTagSize: 16,
};

/**
 * Generate encryption key from password using scrypt
 */
async function deriveKey(
  password: string,
  salt: Buffer,
  keySize: number = 32
): Promise<Buffer> {
  const key = await scryptAsync(password, salt, keySize);
  return key as Buffer;
}

/**
 * Encrypt data using AES-256-GCM
 *
 * @param data - Data to encrypt (will be converted to string)
 * @param password - Encryption password
 * @param options - Encryption options
 * @returns Encrypted data with IV and auth tag
 */
export async function encryptGCM(
  data: unknown,
  password: string,
  options: EncryptionOptions = {}
): Promise<EncryptedData> {
  const keySize = options.keySize ?? DEFAULT_OPTIONS.keySize!;
  const ivSize = options.ivSize ?? DEFAULT_OPTIONS.ivSize!;
  const saltSize = options.saltSize ?? DEFAULT_OPTIONS.saltSize!;
  const authTagSize = options.authTagSize ?? DEFAULT_OPTIONS.authTagSize!;

  // Generate random salt and IV
  const salt = randomBytes(saltSize);
  const iv = randomBytes(ivSize);

  // Derive key from password
  const key = await deriveKey(password, salt, keySize);

  // Convert data to JSON string
  const plaintext = JSON.stringify(data);
  const plaintextBuffer = Buffer.from(plaintext, 'utf-8');

  // Create cipher
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  // Encrypt
  const encrypted = Buffer.concat([
    cipher.update(plaintextBuffer),
    cipher.final(),
  ]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  return {
    data: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 *
 * @param encrypted - Encrypted data object
 * @param password - Encryption password
 * @returns Decrypted data
 */
export async function decryptGCM<T = unknown>(
  encrypted: EncryptedData,
  password: string,
  options: EncryptionOptions = {}
): Promise<T> {
  const keySize = options.keySize ?? DEFAULT_OPTIONS.keySize!;
  
  // Decode base64 strings
  const salt = Buffer.from(encrypted.salt, 'base64');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');
  const encryptedData = Buffer.from(encrypted.data, 'base64');

  // Derive key from password
  const key = await deriveKey(password, salt, keySize);

  // Create decipher
  const decipher = createDecipheriv('aes-256-gcm', key, iv);

  // Set authentication tag
  decipher.setAuthTag(authTag);

  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  // Parse JSON
  const plaintext = decrypted.toString('utf-8');
  return JSON.parse(plaintext) as T;
}

/**
 * Encrypt API key using AES-256-GCM
 *
 * @param apiKey - API key to encrypt
 * @param password - Encryption password
 * @returns Encrypted API key as a single string (format: salt:iv:authTag:data)
 */
export async function encryptApiKeyGCM(
  apiKey: string,
  password: string
): Promise<string> {
  const encrypted = await encryptGCM(apiKey, password);
  return `${encrypted.salt}:${encrypted.iv}:${encrypted.authTag}:${encrypted.data}`;
}

/**
 * Decrypt API key using AES-256-GCM
 *
 * @param encryptedApiKey - Encrypted API key string
 * @param password - Encryption password
 * @returns Decrypted API key
 */
export async function decryptApiKeyGCM(
  encryptedApiKey: string,
  password: string
): Promise<string> {
  const [salt, iv, authTag, data] = encryptedApiKey.split(':');

  if (!salt || !iv || !authTag || !data) {
    throw new Error('Invalid encrypted API key format');
  }

  return await decryptGCM(
    { salt, iv, authTag, data },
    password
  );
}

/**
 * Encrypt sensitive data in object
 *
 * @param obj - Object containing sensitive fields
 * @param sensitiveFields - Array of field names to encrypt
 * @param password - Encryption password
 * @returns Object with encrypted fields (prefixed with '_encrypted_')
 */
export async function encryptSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: (keyof T)[],
  password: string
): Promise<T> {
  const result = { ...obj };

  for (const field of sensitiveFields) {
    const value = result[field];
    if (value !== undefined && value !== null) {
      const encrypted = await encryptApiKeyGCM(String(value), password);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[`_encrypted_${String(field)}`] = encrypted;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (result as any)[field];
    }
  }

  return result;
}

/**
 * Decrypt sensitive fields in object
 *
 * @param obj - Object with encrypted fields (prefixed with '_encrypted_')
 * @param password - Encryption password
 * @returns Object with decrypted fields
 */
export async function decryptSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  password: string
): Promise<T> {
  const result = { ...obj };

  for (const key in result) {
    if (key.startsWith('_encrypted_')) {
      const fieldName = key.replace('_encrypted_', '');
      const encryptedValue = result[key] as string;
      try {
        const decrypted = await decryptApiKeyGCM(encryptedValue, password);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result as any)[fieldName] = decrypted;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (result as any)[key];
      } catch (_error) {
        // If decryption fails, keep the encrypted field
        console.warn(`Failed to decrypt field ${fieldName}:`, error);
      }
    }
  }

  return result;
}

/**
 * Generate random encryption key
 *
 * @returns Random 256-bit key as hex string
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate encryption key format
 *
 * @param key - Key to validate
 * @returns True if valid
 */
export function validateEncryptionKey(key: string): boolean {
  // Key should be a hex string of at least 32 bytes (64 hex chars)
  return /^[0-9a-f]{64}$/i.test(key);
}
