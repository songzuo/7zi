/**
 * UserSettings 表单验证工具
 */

/**
 * 验证昵称
 */
export const validateNickname = (value: string): string | undefined => {
  if (!value.trim()) return '昵称不能为空';
  if (value.length < 2) return '昵称至少需要 2 个字符';
  if (value.length > 20) return '昵称不能超过 20 个字符';
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(value)) {
    return '昵称只能包含中文、字母、数字和下划线';
  }
  return undefined;
};

/**
 * 验证简介
 */
export const validateBio = (value: string): string | undefined => {
  if (value.length > 200) return '简介不能超过 200 个字符';
  return undefined;
};

/**
 * 验证密码
 */
export const validatePassword = (value: string): string | undefined => {
  if (!value) return '请输入密码';
  if (value.length < 8) return '密码至少需要 8 个字符';
  if (!/[A-Z]/.test(value)) return '密码需要包含至少一个大写字母';
  if (!/[a-z]/.test(value)) return '密码需要包含至少一个小写字母';
  if (!/[0-9]/.test(value)) return '密码需要包含至少一个数字';
  return undefined;
};

/**
 * 验证确认密码
 */
export const validateConfirmPassword = (password: string, confirm: string): string | undefined => {
  if (!confirm) return '请确认密码';
  if (password !== confirm) return '两次输入的密码不一致';
  return undefined;
};