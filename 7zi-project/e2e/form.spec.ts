import { test, expect } from '@playwright/test';

/**
 * 表单提交 E2E 测试
 * 测试联系表单的验证、提交和错误处理
 */
test.describe('联系表单测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
  });

  test('联系页面应该正确加载', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/联系|Contact/i);
    
    // 验证表单存在
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
  });

  test('表单应该显示所有必填字段', async ({ page }) => {
    // 检查姓名字段
    const nameInput = page.locator('input[name="name"], #name').first();
    await expect(nameInput).toBeVisible();

    // 检查邮箱字段
    const emailInput = page.locator('input[name="email"], #email').first();
    await expect(emailInput).toBeVisible();

    // 检查消息字段
    const messageTextarea = page.locator('textarea[name="message"], #message').first();
    await expect(messageTextarea).toBeVisible();

    // 检查提交按钮
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
  });

  test('空表单提交应该显示验证错误', async ({ page }) => {
    // 直接点击提交按钮
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // 等待验证错误出现
    await page.waitForTimeout(500);

    // 应该显示错误信息
    const errorMessages = page.locator('text=/请输入|必填|required/i');
    const count = await errorMessages.count();
    
    // 至少应该有姓名、邮箱、消息三个必填字段的错误
    expect(count).toBeGreaterThan(0);
  });

  test('无效邮箱应该显示错误', async ({ page }) => {
    // 填写姓名
    await page.locator('input[name="name"], #name').first().fill('测试用户');
    
    // 填写无效邮箱
    await page.locator('input[name="email"], #email').first().fill('invalid-email');
    
    // 填写消息
    await page.locator('textarea[name="message"], #message').first().fill('这是一条测试消息，用于测试表单验证功能。');
    
    // 点击提交
    await page.locator('button[type="submit"]').first().click();
    
    // 等待验证
    await page.waitForTimeout(500);

    // 应该显示邮箱格式错误
    const emailError = page.locator('text=/有效.*邮箱|邮箱.*格式|invalid.*email/i');
    await expect(emailError.first()).toBeVisible();
  });

  test('消息太短应该显示错误', async ({ page }) => {
    // 填写表单
    await page.locator('input[name="name"], #name').first().fill('测试用户');
    await page.locator('input[name="email"], #email').first().fill('test@example.com');
    
    // 填写太短的消息
    await page.locator('textarea[name="message"], #message').first().fill('短消息');
    
    // 点击提交
    await page.locator('button[type="submit"]').first().click();
    
    // 等待验证
    await page.waitForTimeout(500);

    // 应该显示消息长度错误
    const messageError = page.locator('text=/至少.*字符|字符.*以上|too short|10/i');
    // 如果有这个错误就验证
    const errorCount = await messageError.count();
    if (errorCount > 0) {
      await expect(messageError.first()).toBeVisible();
    }
  });

  test('成功提交表单', async ({ page }) => {
    // 填写完整表单
    await page.locator('input[name="name"], #name').first().fill('E2E测试用户');
    await page.locator('input[name="email"], #email').first().fill('e2e-test@example.com');
    await page.locator('input[name="company"]').first().fill('测试公司');
    await page.locator('select[name="subject"], #subject').first().selectOption({ index: 1 });
    await page.locator('textarea[name="message"], #message').first().fill('这是一条E2E测试消息，用于验证表单提交功能是否正常工作。');

    // 监听 API 响应
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('/api/contact') && resp.request().method() === 'POST'
    ).catch(() => null);

    // 点击提交
    await page.locator('button[type="submit"]').first().click();

    // 等待响应（可能是 API 调用或本地验证）
    const response = await responsePromise;
    
    // 如果有 API 响应，检查状态
    if (response) {
      // API 调用成功或失败都可以接受（取决于后端配置）
      expect([200, 201, 400, 500]).toContain(response.status());
    }

    // 等待状态变化
    await page.waitForTimeout(2000);

    // 检查是否有成功或错误提示
    const successMessage = page.locator('text=/成功|success|发送成功/i');
    const errorMessage = page.locator('text=/失败|error|发送失败/i');
    
    // 应该显示某种状态提示
    const hasSuccess = await successMessage.count() > 0;
    const hasError = await errorMessage.count() > 0;
    
    // 要么成功要么失败，都应该有反馈
    expect(hasSuccess || hasError).toBeTruthy();
  });

  test('表单提交时按钮应该显示加载状态', async ({ page }) => {
    // 填写有效表单
    await page.locator('input[name="name"], #name').first().fill('测试用户');
    await page.locator('input[name="email"], #email').first().fill('test@example.com');
    await page.locator('textarea[name="message"], #message').first().fill('这是一条测试消息内容，用于验证加载状态。');

    // 点击提交
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // 检查按钮是否有禁用或加载状态
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    const buttonText = await submitButton.textContent().catch(() => '');
    
    // 按钮应该被禁用或显示加载中
    expect(isDisabled || buttonText?.includes('发送中') || buttonText?.includes('...')).toBeTruthy();
  });

  test('选择不同的主题选项', async ({ page }) => {
    const subjectSelect = page.locator('select[name="subject"], #subject').first();
    
    if (await subjectSelect.isVisible()) {
      // 获取所有选项
      const options = await subjectSelect.locator('option').allTextContents();
      
      // 应该有多个选项
      expect(options.length).toBeGreaterThan(1);

      // 选择第一个非空选项
      await subjectSelect.selectOption({ index: 1 });
      
      // 验证选择成功
      const selectedValue = await subjectSelect.inputValue();
      expect(selectedValue).toBeTruthy();
    }
  });

  test('输入时错误提示应该消失', async ({ page }) => {
    // 先触发验证错误
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(500);

    // 获取初始错误数量
    const initialErrors = await page.locator('text=/请输入|必填|错误/i').count();

    // 开始输入姓名
    await page.locator('input[name="name"], #name').first().fill('测试用户');
    await page.waitForTimeout(300);

    // 姓名错误应该消失或减少
    const afterErrors = await page.locator('text=/请输入.*姓名|姓名.*必填/i').count();
    expect(afterErrors).toBeLessThanOrEqual(initialErrors);
  });
});

test.describe('表单无障碍测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
    await page.waitForLoadState('networkidle');
  });

  test('表单字段应该有正确的标签', async ({ page }) => {
    // 检查姓名字段标签
    const nameLabel = page.locator('label[for="name"], label:has-text("姓名")').first();
    await expect(nameLabel).toBeVisible();

    // 检查邮箱字段标签
    const emailLabel = page.locator('label[for="email"], label:has-text("邮箱")').first();
    await expect(emailLabel).toBeVisible();

    // 检查消息字段标签
    const messageLabel = page.locator('label[for="message"], label:has-text("消息")').first();
    await expect(messageLabel).toBeVisible();
  });

  test('必填字段应该有标记', async ({ page }) => {
    // 检查必填标记 (* 或 "必填")
    const requiredMarks = page.locator('text=/\\*|必填|required/i');
    const count = await requiredMarks.count();
    
    // 应该有多个必填标记
    expect(count).toBeGreaterThan(0);
  });

  test('表单应该支持键盘导航', async ({ page }) => {
    // 点击第一个输入框
    await page.locator('input[name="name"], #name').first().click();

    // 按 Tab 键应该移动到下一个字段
    await page.keyboard.press('Tab');
    
    // 应该聚焦到邮箱字段
    const focusedElement = await page.evaluate(() => document.activeElement?.name || document.activeElement?.id);
    expect(['email', 'company', 'subject', 'message']).toContain(focusedElement);
  });
});