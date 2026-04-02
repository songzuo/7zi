/**
 * @fileoverview Wallet types unit tests
 * @description Tests for wallet type constants and configurations
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_WALLET_CONFIG,
  TRANSACTION_TYPE_CONFIG,
  TRANSACTION_STATUS_CONFIG,
} from '@/types/wallet'

describe('DEFAULT_WALLET_CONFIG', () => {
  it('should have all required configuration properties', () => {
    expect(DEFAULT_WALLET_CONFIG).toHaveProperty('minTransferAmount')
    expect(DEFAULT_WALLET_CONFIG).toHaveProperty('maxTransferAmount')
    expect(DEFAULT_WALLET_CONFIG).toHaveProperty('transferFeeRate')
    expect(DEFAULT_WALLET_CONFIG).toHaveProperty('allowNegativeBalance')
    expect(DEFAULT_WALLET_CONFIG).toHaveProperty('currencySymbol')
    expect(DEFAULT_WALLET_CONFIG).toHaveProperty('currencyName')
  })

  it('should have correct data types', () => {
    expect(typeof DEFAULT_WALLET_CONFIG.minTransferAmount).toBe('number')
    expect(typeof DEFAULT_WALLET_CONFIG.maxTransferAmount).toBe('number')
    expect(typeof DEFAULT_WALLET_CONFIG.transferFeeRate).toBe('number')
    expect(typeof DEFAULT_WALLET_CONFIG.allowNegativeBalance).toBe('boolean')
    expect(typeof DEFAULT_WALLET_CONFIG.currencySymbol).toBe('string')
    expect(typeof DEFAULT_WALLET_CONFIG.currencyName).toBe('string')
  })

  it('should have reasonable default values', () => {
    expect(DEFAULT_WALLET_CONFIG.minTransferAmount).toBeGreaterThan(0)
    expect(DEFAULT_WALLET_CONFIG.maxTransferAmount).toBeGreaterThan(
      DEFAULT_WALLET_CONFIG.minTransferAmount
    )
    expect(DEFAULT_WALLET_CONFIG.transferFeeRate).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_WALLET_CONFIG.transferFeeRate).toBeLessThanOrEqual(1)
  })

  it('should have non-empty currency info', () => {
    expect(DEFAULT_WALLET_CONFIG.currencySymbol.length).toBeGreaterThan(0)
    expect(DEFAULT_WALLET_CONFIG.currencyName.length).toBeGreaterThan(0)
  })
})

describe('TRANSACTION_TYPE_CONFIG', () => {
  it('should have all required transaction types', () => {
    expect(TRANSACTION_TYPE_CONFIG).toHaveProperty('deposit')
    expect(TRANSACTION_TYPE_CONFIG).toHaveProperty('withdraw')
    expect(TRANSACTION_TYPE_CONFIG).toHaveProperty('transfer')
    expect(TRANSACTION_TYPE_CONFIG).toHaveProperty('reward')
    expect(TRANSACTION_TYPE_CONFIG).toHaveProperty('penalty')
  })

  it('should have correct structure for each type', () => {
    Object.values(TRANSACTION_TYPE_CONFIG).forEach(config => {
      expect(config).toHaveProperty('icon')
      expect(config).toHaveProperty('label')
      expect(config).toHaveProperty('color')
      expect(typeof config.icon).toBe('string')
      expect(typeof config.label).toBe('string')
      expect(typeof config.color).toBe('string')
    })
  })

  it('should have valid Tailwind color classes', () => {
    Object.values(TRANSACTION_TYPE_CONFIG).forEach(config => {
      expect(config.color).toMatch(/^text-\w+-600/)
    })
  })

  it('should include emoji in icons', () => {
    Object.values(TRANSACTION_TYPE_CONFIG).forEach(config => {
      expect(config.icon).toMatch(/[\p{Emoji}]/u)
    })
  })

  it('should have unique labels', () => {
    const labels = Object.values(TRANSACTION_TYPE_CONFIG).map(c => c.label)
    const uniqueLabels = new Set(labels)
    expect(uniqueLabels.size).toBe(labels.length)
  })

  it('should have unique icons', () => {
    const icons = Object.values(TRANSACTION_TYPE_CONFIG).map(c => c.icon)
    const uniqueIcons = new Set(icons)
    expect(uniqueIcons.size).toBe(icons.length)
  })
})

describe('TRANSACTION_STATUS_CONFIG', () => {
  it('should have all required transaction statuses', () => {
    expect(TRANSACTION_STATUS_CONFIG).toHaveProperty('pending')
    expect(TRANSACTION_STATUS_CONFIG).toHaveProperty('completed')
    expect(TRANSACTION_STATUS_CONFIG).toHaveProperty('failed')
    expect(TRANSACTION_STATUS_CONFIG).toHaveProperty('cancelled')
  })

  it('should have correct structure for each status', () => {
    Object.values(TRANSACTION_STATUS_CONFIG).forEach(config => {
      expect(config).toHaveProperty('icon')
      expect(config).toHaveProperty('label')
      expect(config).toHaveProperty('color')
      expect(typeof config.icon).toBe('string')
      expect(typeof config.label).toBe('string')
      expect(typeof config.color).toBe('string')
    })
  })

  it('should have valid Tailwind color and bg classes', () => {
    Object.values(TRANSACTION_STATUS_CONFIG).forEach(config => {
      expect(config.color).toMatch(/text-\w+-600/)
      expect(config.color).toMatch(/bg-\w+-100/)
    })
  })

  it('should include emoji in icons', () => {
    Object.values(TRANSACTION_STATUS_CONFIG).forEach(config => {
      expect(config.icon).toMatch(/[\p{Emoji}]/u)
    })
  })

  it('should have unique labels', () => {
    const labels = Object.values(TRANSACTION_STATUS_CONFIG).map(c => c.label)
    const uniqueLabels = new Set(labels)
    expect(uniqueLabels.size).toBe(labels.length)
  })

  it('should have unique icons', () => {
    const icons = Object.values(TRANSACTION_STATUS_CONFIG).map(c => c.icon)
    const uniqueIcons = new Set(icons)
    expect(uniqueIcons.size).toBe(icons.length)
  })
})

describe('Wallet type consistency', () => {
  it('should have matching keys between configs and types', () => {
    // TransactionType should match TRANSACTION_TYPE_CONFIG keys
    const transactionTypes = ['deposit', 'withdraw', 'transfer', 'reward', 'penalty'] as const
    expect(Object.keys(TRANSACTION_TYPE_CONFIG)).toEqual(transactionTypes)

    // TransactionStatus should match TRANSACTION_STATUS_CONFIG keys
    const transactionStatuses = ['pending', 'completed', 'failed', 'cancelled'] as const
    expect(Object.keys(TRANSACTION_STATUS_CONFIG)).toEqual(transactionStatuses)
  })

  it('should have consistent icon usage across configs', () => {
    const allIcons = [
      ...Object.values(TRANSACTION_TYPE_CONFIG).map(c => c.icon),
      ...Object.values(TRANSACTION_STATUS_CONFIG).map(c => c.icon),
    ]
    const uniqueIcons = new Set(allIcons)
    expect(uniqueIcons.size).toBe(allIcons.length)
  })
})

describe('Wallet config validation', () => {
  it('should allow creating a valid wallet config', () => {
    const customConfig = {
      ...DEFAULT_WALLET_CONFIG,
      minTransferAmount: 10,
      maxTransferAmount: 10000,
    }

    expect(customConfig.minTransferAmount).toBe(10)
    expect(customConfig.maxTransferAmount).toBe(10000)
  })

  it('should handle edge cases for transfer amounts', () => {
    expect(DEFAULT_WALLET_CONFIG.minTransferAmount).toBeLessThan(
      DEFAULT_WALLET_CONFIG.maxTransferAmount
    )
  })

  it('should have reasonable fee rate', () => {
    const { transferFeeRate } = DEFAULT_WALLET_CONFIG
    expect(transferFeeRate).toBeGreaterThan(0)
    expect(transferFeeRate).toBeLessThan(0.01) // Less than 1%
  })
})
