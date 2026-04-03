/**
 * Data Masking Service
 * 数据脱敏服务
 */

/**
 * 脱敏类型
 */
export type MaskingType =
  | 'phone'
  | 'email'
  | 'idCard'
  | 'bankCard'
  | 'name'
  | 'address'
  | 'password'
  | 'apiKey'
  | 'creditCard'

/**
 * 脱敏配置
 */
export interface MaskingConfig {
  type: MaskingType
  preserveLength?: boolean
  maskChar?: string
}

/**
 * 数据脱敏服务类
 */
export class DataMaskingService {
  private defaultMaskChar = '*'

  /**
   * 手机号脱敏
   * 示例: 13812345678 -> 138****5678
   */
  maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone
    return phone.replace(/(\d{3})\d{4}(\d{4})/, `$1${this.defaultMaskChar.repeat(4)}$2`)
  }

  /**
   * 邮箱脱敏
   * 示例: example@domain.com -> e***@domain.com
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email
    
    const [username, domain] = email.split('@')
    if (!username) return email
    
    const maskedUsername = username[0] + this.defaultMaskChar.repeat(Math.min(username.length - 1, 3))
    return `${maskedUsername}@${domain}`
  }

  /**
   * 身份证脱敏
   * 示例: 110101199001011234 -> 110***********1234
   */
  maskIdCard(idCard: string): string {
    if (!idCard || idCard.length < 8) return idCard
    return idCard.replace(/(\d{3})\d+?(\d{4})/, `$1${this.defaultMaskChar.repeat(idCard.length - 7)}$2`)
  }

  /**
   * 银行卡脱敏
   * 示例: 6222021234567890123 -> ************0123
   */
  maskBankCard(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 8) return cardNumber
    const visibleDigits = 4
    const maskedLength = cardNumber.length - visibleDigits
    return this.defaultMaskChar.repeat(maskedLength) + cardNumber.slice(-visibleDigits)
  }

  /**
   * 姓名脱敏
   * 示例: 张三 -> 张*, 王小明 -> 王**
   */
  maskName(name: string): string {
    if (!name) return name
    if (name.length === 1) return name
    if (name.length === 2) return name[0] + this.defaultMaskChar
    
    // 3个字以上，保留首尾，中间脱敏
    return name[0] + this.defaultMaskChar.repeat(name.length - 2) + name[name.length - 1]
  }

  /**
   * 地址脱敏
   * 示例: 北京市朝阳区望京街道 -> 北京市朝阳区***
   */
  maskAddress(address: string): string {
    if (!address || address.length < 6) return address
    
    // 保留省市区
    const match = address.match(/^(.+?[市区县])/)
    if (match) {
      return match[1] + this.defaultMaskChar.repeat(3)
    }
    
    // 无法识别格式，保留前6个字符
    return address.substring(0, 6) + this.defaultMaskChar.repeat(3)
  }

  /**
   * 密码脱敏
   * 示例: MyP@ssw0rd -> ********
   */
  maskPassword(_password: string): string {
    return this.defaultMaskChar.repeat(8)
  }

  /**
   * API Key 脱敏
   * 示例: sk-1234567890abcdef -> sk-1234****cdef
   */
  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 10) return this.defaultMaskChar.repeat(8)
    
    const prefixLength = 6
    const suffixLength = 4
    
    if (apiKey.length <= prefixLength + suffixLength) {
      return apiKey.substring(0, 3) + this.defaultMaskChar.repeat(apiKey.length - 3)
    }
    
    return (
      apiKey.substring(0, prefixLength) +
      this.defaultMaskChar.repeat(4) +
      apiKey.slice(-suffixLength)
    )
  }

  /**
   * 信用卡号脱敏 (同银行卡)
   */
  maskCreditCard(cardNumber: string): string {
    return this.maskBankCard(cardNumber)
  }

  /**
   * 自动识别并脱敏
   */
  autoMask(value: string, type?: MaskingType): string {
    if (!value) return value
    
    if (type) {
      return this.maskByType(value, type)
    }
    
    // 自动识别类型
    if (this.isPhone(value)) return this.maskPhone(value)
    if (this.isEmail(value)) return this.maskEmail(value)
    if (this.isIdCard(value)) return this.maskIdCard(value)
    if (this.isBankCard(value)) return this.maskBankCard(value)
    
    return value
  }

  /**
   * 按类型脱敏
   */
  maskByType(value: string, type: MaskingType): string {
    switch (type) {
      case 'phone':
        return this.maskPhone(value)
      case 'email':
        return this.maskEmail(value)
      case 'idCard':
        return this.maskIdCard(value)
      case 'bankCard':
        return this.maskBankCard(value)
      case 'name':
        return this.maskName(value)
      case 'address':
        return this.maskAddress(value)
      case 'password':
        return this.maskPassword(value)
      case 'apiKey':
        return this.maskApiKey(value)
      case 'creditCard':
        return this.maskCreditCard(value)
      default:
        return value
    }
  }

  /**
   * 批量脱敏对象
   */
  maskObject(
    data: Record<string, unknown>,
    fields: Record<string, MaskingType>
  ): Record<string, unknown> {
    const masked = { ...data }
    
    for (const [field, type] of Object.entries(fields)) {
      if (masked[field] && typeof masked[field] === 'string') {
        masked[field] = this.maskByType(masked[field] as string, type)
      }
    }
    
    return masked
  }

  /**
   * 批量脱敏数组
   */
  maskArray(
    items: Record<string, unknown>[],
    fields: Record<string, MaskingType>
  ): Record<string, unknown>[] {
    return items.map(item => this.maskObject(item, fields))
  }

  /**
   * 深度脱敏对象
   */
  deepMask(
    data: unknown,
    fields: Record<string, MaskingType>
  ): unknown {
    if (Array.isArray(data)) {
      return data.map(item => this.deepMask(item, fields))
    }
    
    if (data && typeof data === 'object') {
      const result: Record<string, unknown> = {}
      
      for (const [key, value] of Object.entries(data)) {
        if (fields[key] && typeof value === 'string') {
          result[key] = this.maskByType(value, fields[key])
        } else if (typeof value === 'object' && value !== null) {
          result[key] = this.deepMask(value, fields)
        } else {
          result[key] = value
        }
      }
      
      return result
    }
    
    return data
  }

  /**
   * 检查是否为手机号
   */
  private isPhone(value: string): boolean {
    return /^1[3-9]\d{9}$/.test(value)
  }

  /**
   * 检查是否为邮箱
   */
  private isEmail(value: string): boolean {
    return /^[\w.-]+@[\w.-]+\.\w+$/.test(value)
  }

  /**
   * 检查是否为身份证
   */
  private isIdCard(value: string): boolean {
    return /^\d{17}[\dXx]$/.test(value)
  }

  /**
   * 检查是否为银行卡
   */
  private isBankCard(value: string): boolean {
    return /^\d{16,19}$/.test(value)
  }

  /**
   * 验证脱敏后的数据
   */
  isMasked(value: string): boolean {
    return value.includes(this.defaultMaskChar)
  }

  /**
   * 获取脱敏规则说明
   */
  getMaskingRules(): Record<MaskingType, { description: string; example: string }> {
    return {
      phone: {
        description: '保留前3后4位',
        example: '138****5678',
      },
      email: {
        description: '保留首字符和域名',
        example: 'e***@domain.com',
      },
      idCard: {
        description: '保留前3后4位',
        example: '110***********1234',
      },
      bankCard: {
        description: '保留后4位',
        example: '************1234',
      },
      name: {
        description: '保留首尾字符',
        example: '张**',
      },
      address: {
        description: '保留省市区',
        example: '北京市朝阳区***',
      },
      password: {
        description: '完全隐藏',
        example: '********',
      },
      apiKey: {
        description: '保留前6后4位',
        example: 'sk-1234****cdef',
      },
      creditCard: {
        description: '保留后4位',
        example: '************1234',
      },
    }
  }
}

// 导出单例
export const dataMaskingService = new DataMaskingService()