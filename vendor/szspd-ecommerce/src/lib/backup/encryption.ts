/**
 * Backup Encryption Module
 * Handles encryption and decryption of backup files
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'
import { EncryptionAlgorithm } from './types'

const scryptAsync = promisify(scrypt)

/**
 * Generate encryption key from password
 */
async function generateKey(password: string, salt: Buffer): Promise<Buffer> {
  const key = await scryptAsync(password, salt, 32)
  return key as Buffer
}

/**
 * Encrypt backup data
 */
export async function encryptBackup(
  data: string,
  algorithm: EncryptionAlgorithm,
  password: string
): Promise<string> {
  try {
    if (algorithm === EncryptionAlgorithm.NONE) {
      return data
    }

    const salt = randomBytes(16)
    const iv = randomBytes(16)
    const key = await generateKey(password, salt)

    let encrypted: Buffer

    switch (algorithm) {
      case EncryptionAlgorithm.AES256GCM: {
        const cipher = createCipheriv('aes-256-gcm', key, iv)
        const plaintext = Buffer.from(data, 'utf-8')

        encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
        break
      }

      case EncryptionAlgorithm.AES256CBC: {
        const cipher = createCipheriv('aes-256-cbc', key, iv)
        const plaintext = Buffer.from(data, 'utf-8')

        encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
        break
      }

      default:
        throw new Error(`Unsupported encryption algorithm: ${algorithm}`)
    }

    // Combine salt, iv, and encrypted data
    // Format: salt(16) + iv(16) + encrypted_data
    const combined = Buffer.concat([salt, iv, encrypted])

    return combined.toString('base64')
  } catch (error) {
    console.error('Failed to encrypt backup:', error)
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Decrypt backup data
 */
export async function decryptBackup(
  encryptedData: string,
  algorithm: EncryptionAlgorithm,
  password: string
): Promise<string> {
  try {
    if (algorithm === EncryptionAlgorithm.NONE) {
      return encryptedData
    }

    const combined = Buffer.from(encryptedData, 'base64')

    // Extract salt, iv, and encrypted data
    const salt = combined.subarray(0, 16)
    const iv = combined.subarray(16, 32)
    const encrypted = combined.subarray(32)

    const key = await generateKey(password, salt)

    let decrypted: Buffer

    switch (algorithm) {
      case EncryptionAlgorithm.AES256GCM: {
        // Extract auth tag (last 16 bytes)
        const authTag = encrypted.subarray(-16)
        const ciphertext = encrypted.subarray(0, -16)

        const decipher = createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAuthTag(authTag)

        decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
        break
      }

      case EncryptionAlgorithm.AES256CBC: {
        const decipher = createDecipheriv('aes-256-cbc', key, iv)

        decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
        break
      }

      default:
        throw new Error(`Unsupported encryption algorithm: ${algorithm}`)
    }

    return decrypted.toString('utf-8')
  } catch (error) {
    console.error('Failed to decrypt backup:', error)
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Validate encryption key format
 */
export function validateEncryptionKey(key: string): boolean {
  // Key should be a hex string of at least 32 bytes (64 hex chars)
  return /^[0-9a-f]{64}$/i.test(key)
}

/**
 * Hash a password for storage
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString('hex')
  const key = await generateKey(password, Buffer.from(salt, 'hex'))
  return {
    hash: key.toString('hex'),
    salt,
  }
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string
): Promise<boolean> {
  const key = await generateKey(password, Buffer.from(salt, 'hex'))
  return key.toString('hex') === hash
}
