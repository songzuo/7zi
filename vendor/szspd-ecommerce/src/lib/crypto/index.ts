/**
 * 加密/解密工具模块
 * 提供统一的 API Key 加密和敏感数据处理功能
 */

import * as crypto from 'crypto'
import { generateUUID as generateUUIDFromUtils } from '../utils'

/**
 * 加密 API Key
 * @param apiKey - 原始 API Key
 * @param secret - 加密密钥
 * @returns 加密后的字符串 (iv:encrypted)
 */
export function encryptApiKey(apiKey: string, secret: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(secret, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

/**
 * 解密 API Key
 * @param encryptedKey - 加密后的字符串
 * @param secret - 加密密钥
 * @returns 原始 API Key
 */
export function decryptApiKey(encryptedKey: string, secret: string): string {
  const [ivHex, encrypted] = encryptedKey.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const key = crypto.scryptSync(secret, 'salt', 32)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * 获取加密密钥
 * @returns 32字节的加密密钥
 * @throws {Error} If neither AGENT_ENCRYPTION_SECRET nor JWT_SECRET is set
 */
export function getEncryptionSecret(): string {
  const secret = process.env.AGENT_ENCRYPTION_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw new Error('AGENT_ENCRYPTION_SECRET or JWT_SECRET environment variable is required')
  }
  if (secret.length < 32) {
    return secret.padEnd(32, '0')
  }
  return secret
}

/**
 * 生成安全的随机令牌
 * @returns 32字节长度的十六进制字符串
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 生成 UUID v4
 * @returns UUID 字符串
 * @deprecated Use generateUUID() from '../utils' instead
 */
export function generateUUID(): string {
  return generateUUIDFromUtils()
}

/**
 * 加密敏感数据
 * @param data - 要加密的数据
 * @param secret - 加密密钥（可选，默认使用 getEncryptionSecret()）
 * @returns 加密后的数据
 */
export function encryptSensitiveData(data: string, secret?: string): string {
  return encryptApiKey(data, secret || getEncryptionSecret())
}

/**
 * 解密敏感数据
 * @param encryptedData - 加密后的数据
 * @param secret - 加密密钥（可选，默认使用 getEncryptionSecret()）
 * @returns 解密后的数据
 */
export function decryptSensitiveData(encryptedData: string, secret?: string): string {
  return decryptApiKey(encryptedData, secret || getEncryptionSecret())
}
