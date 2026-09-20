/**
 * 表单验证辅助函数
 * 提供统一的错误消息生成和格式化功能
 */

/**
 * 生成必填验证错误消息
 */
export function getRequiredErrorMessage(customMessage?: string): string {
  return customMessage || '此字段为必填项'
}

/**
 * 生成最小长度验证错误消息
 */
export function getMinLengthErrorMessage(min: number, customMessage?: string): string {
  return customMessage || `最少需要 ${min} 个字符`
}

/**
 * 生成最大长度验证错误消息
 */
export function getMaxLengthErrorMessage(max: number, customMessage?: string): string {
  return customMessage || `最多允许 ${max} 个字符`
}

/**
 * 生成范围验证错误消息
 */
export function getRangeErrorMessage(min: number, max: number, customMessage?: string): string {
  return customMessage || `数值必须在 ${min} 到 ${max} 之间`
}

/**
 * 生成模式验证错误消息
 */
export function getPatternErrorMessage(customMessage?: string): string {
  return customMessage || '格式不正确'
}

/**
 * 生成邮箱验证错误消息
 */
export function getEmailErrorMessage(customMessage?: string): string {
  return customMessage || '请输入有效的邮箱地址'
}

/**
 * 生成手机号验证错误消息
 */
export function getPhoneErrorMessage(customMessage?: string): string {
  return customMessage || '请输入有效的手机号码'
}

/**
 * 生成 URL 验证错误消息
 */
export function getUrlErrorMessage(customMessage?: string): string {
  return customMessage || '请输入有效的 URL'
}

/**
 * 生成数字验证错误消息
 */
export function getNumericErrorMessage(customMessage?: string): string {
  return customMessage || '请输入有效的数字'
}

/**
 * 生成整数验证错误消息
 */
export function getIntegerErrorMessage(customMessage?: string): string {
  return customMessage || '请输入整数'
}

/**
 * 生成确认密码验证错误消息
 */
export function getConfirmPasswordErrorMessage(customMessage?: string): string {
  return customMessage || '两次输入的密码不一致'
}
