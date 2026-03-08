/**
 * UserSettings Validation Functions
 */

/**
 * Validates password strength
 * @param password - Password to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validatePassword(password: string): string {
  if (!password) {
    return '请输入密码';
  }
  
  if (password.length < 8) {
    return '密码至少需要 8 个字符';
  }
  
  if (!/[a-z]/.test(password)) {
    return '密码需要包含至少一个小写字母';
  }
  
  if (!/[A-Z]/.test(password)) {
    return '密码需要包含至少一个大写字母';
  }
  
  if (!/[0-9]/.test(password)) {
    return '密码需要包含至少一个数字';
  }
  
  return '';
}

/**
 * Validates password confirmation match
 * @param password - Original password
 * @param confirmPassword - Confirmation password
 * @returns Error message if invalid, empty string if valid
 */
export function validateConfirmPassword(password: string, confirmPassword: string): string {
  if (!confirmPassword) {
    return '请确认密码';
  }
  
  if (password !== confirmPassword) {
    return '两次输入的密码不一致';
  }
  
  return '';
}

/**
 * Validates username format
 * @param username - Username to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validateUsername(username: string): string {
  if (!username) {
    return '请输入用户名';
  }
  
  if (username.length < 3) {
    return '用户名至少需要 3 个字符';
  }
  
  if (username.length > 20) {
    return '用户名不能超过 20 个字符';
  }
  
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return '用户名只能包含字母、数字、下划线和中文';
  }
  
  return '';
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validateEmail(email: string): string {
  if (!email) {
    return '请输入邮箱';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '请输入有效的邮箱地址';
  }
  
  return '';
}

/**
 * Validates display name
 * @param name - Display name to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validateDisplayName(name: string): string {
  if (!name) {
    return '请输入显示名称';
  }
  
  if (name.length < 2) {
    return '显示名称至少需要 2 个字符';
  }
  
  if (name.length > 50) {
    return '显示名称不能超过 50 个字符';
  }
  
  return '';
}

/**
 * Validates nickname
 * @param nickname - Nickname to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validateNickname(nickname: string): string {
  if (!nickname) {
    return '请输入昵称';
  }
  
  if (nickname.length < 2) {
    return '昵称至少需要 2 个字符';
  }
  
  if (nickname.length > 30) {
    return '昵称不能超过 30 个字符';
  }
  
  return '';
}

/**
 * Validates bio
 * @param bio - Bio to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validateBio(bio: string): string {
  if (bio && bio.length > 500) {
    return '个人简介不能超过 500 个字符';
  }
  
  return '';
}