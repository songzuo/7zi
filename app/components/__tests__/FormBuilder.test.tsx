/**
 * FormBuilder 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  FormBuilder, 
  FormPreview, 
  createDefaultFormConfig,
  type FormConfig,
} from '../FormBuilder';

// Mock RichTextEditor
vi.mock('../RichTextEditor', () => ({
  RichTextEditor: vi.fn(({ content, onChange, placeholder }) => (
    <div data-testid="rich-text-editor">
      <textarea
        value={content}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        data-testid="rich-textarea"
      />
    </div>
  )),
}));

describe('FormBuilder', () => {
  let defaultConfig: FormConfig;

  beforeEach(() => {
    defaultConfig = createDefaultFormConfig();
  });

  describe('createDefaultFormConfig', () => {
    it('creates a valid default form configuration', () => {
      const config = createDefaultFormConfig();
      
      expect(config).toHaveProperty('id');
      expect(config).toHaveProperty('title', '新表单');
      expect(config).toHaveProperty('fields');
      expect(Array.isArray(config.fields)).toBe(true);
      expect(config.fields).toHaveLength(0);
    });

    it('generates unique IDs for each form', () => {
      const config1 = createDefaultFormConfig();
      const config2 = createDefaultFormConfig();
      
      expect(config1.id).not.toBe(config2.id);
    });
  });

  describe('FormBuilder component', () => {
    it('renders form title input', () => {
      render(<FormBuilder config={defaultConfig} onChange={vi.fn()} />);
      
      expect(screen.getByLabelText('表单标题')).toBeInTheDocument();
      expect(screen.getByDisplayValue('新表单')).toBeInTheDocument();
    });

    it('renders submit and reset text inputs', () => {
      render(<FormBuilder config={defaultConfig} onChange={vi.fn()} />);
      
      expect(screen.getByLabelText('提交按钮文本')).toBeInTheDocument();
      expect(screen.getByLabelText('重置按钮文本')).toBeInTheDocument();
    });

    it('renders field type buttons', () => {
      render(<FormBuilder config={defaultConfig} onChange={vi.fn()} />);
      
      expect(screen.getByText('📝 文本')).toBeInTheDocument();
      expect(screen.getByText('📧 邮箱')).toBeInTheDocument();
      expect(screen.getByText('🔑 密码')).toBeInTheDocument();
      expect(screen.getByText('✨ 富文本')).toBeInTheDocument();
      expect(screen.getByText('📋 下拉选择')).toBeInTheDocument();
    });

    it('adds a new field when clicking field type button', async () => {
      const handleChange = vi.fn();
      render(<FormBuilder config={defaultConfig} onChange={handleChange} />);
      
      const textFieldButton = screen.getByText('📝 文本');
      fireEvent.click(textFieldButton);
      
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ type: 'text' }),
          ]),
        })
      );
    });

    it('displays empty state when no fields exist', () => {
      render(<FormBuilder config={defaultConfig} onChange={vi.fn()} />);
      
      expect(screen.getByText('点击上方按钮添加字段')).toBeInTheDocument();
    });

    it('displays field list when fields exist', () => {
      const configWithField: FormConfig = {
        ...defaultConfig,
        fields: [
          {
            id: 'test-field',
            name: 'test',
            label: 'Test Field',
            type: 'text',
            order: 0,
          },
        ],
      };
      
      render(<FormBuilder config={configWithField} onChange={vi.fn()} />);
      
      expect(screen.getByText('Test Field')).toBeInTheDocument();
      expect(screen.getByText('字段列表 (1)')).toBeInTheDocument();
    });

    it('updates form title when changed', async () => {
      const handleChange = vi.fn();
      render(<FormBuilder config={defaultConfig} onChange={handleChange} />);
      
      const titleInput = screen.getByLabelText('表单标题');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, '新标题');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('renders preview mode when previewMode is true', () => {
      render(<FormBuilder config={defaultConfig} onChange={vi.fn()} previewMode />);
      
      // Preview mode shows form preview, not editor
      expect(screen.queryByLabelText('表单标题')).not.toBeInTheDocument();
    });
  });

  describe('FieldEditor', () => {
    it('displays field information in header', () => {
      const configWithField: FormConfig = {
        ...defaultConfig,
        fields: [
          {
            id: 'email-field',
            name: 'email',
            label: '邮箱地址',
            type: 'email',
            order: 0,
          },
        ],
      };
      
      render(<FormBuilder config={configWithField} onChange={vi.fn()} />);
      
      expect(screen.getByText('邮箱地址')).toBeInTheDocument();
      expect(screen.getByText(/email/)).toBeInTheDocument();
    });

    it('expands and collapses field editor', () => {
      const configWithField: FormConfig = {
        ...defaultConfig,
        fields: [
          {
            id: 'test-field',
            name: 'test',
            label: 'Test',
            type: 'text',
            order: 0,
          },
        ],
      };
      
      render(<FormBuilder config={configWithField} onChange={vi.fn()} />);
      
      // Should show field configuration by default
      expect(screen.getByLabelText('字段名称')).toBeInTheDocument();
      
      // Collapse
      const collapseButton = screen.getByTitle('收起');
      fireEvent.click(collapseButton);
      
      // Configuration should be hidden
      expect(screen.queryByLabelText('字段名称')).not.toBeInTheDocument();
    });

    it('deletes field when delete button is clicked', () => {
      const handleChange = vi.fn();
      const configWithField: FormConfig = {
        ...defaultConfig,
        fields: [
          {
            id: 'test-field',
            name: 'test',
            label: 'Test',
            type: 'text',
            order: 0,
          },
        ],
      };
      
      render(<FormBuilder config={configWithField} onChange={handleChange} />);
      
      const deleteButton = screen.getByTitle('删除');
      fireEvent.click(deleteButton);
      
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [],
        })
      );
    });

    it('shows options editor for select type', () => {
      const configWithSelect: FormConfig = {
        ...defaultConfig,
        fields: [
          {
            id: 'select-field',
            name: 'choice',
            label: 'Choice',
            type: 'select',
            order: 0,
            options: [
              { value: 'a', label: 'Option A' },
              { value: 'b', label: 'Option B' },
            ],
          },
        ],
      };
      
      render(<FormBuilder config={configWithSelect} onChange={vi.fn()} />);
      
      expect(screen.getByText('选项列表')).toBeInTheDocument();
      expect(screen.getByDisplayValue('a')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Option A')).toBeInTheDocument();
    });

    it('adds new option for select/radio fields', async () => {
      const handleChange = vi.fn();
      const configWithSelect: FormConfig = {
        ...defaultConfig,
        fields: [
          {
            id: 'select-field',
            name: 'choice',
            label: 'Choice',
            type: 'select',
            order: 0,
            options: [],
          },
        ],
      };
      
      render(<FormBuilder config={configWithSelect} onChange={handleChange} />);
      
      const addButton = screen.getByText('+ 添加选项');
      fireEvent.click(addButton);
      
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({
              options: expect.arrayContaining([
                expect.objectContaining({ label: '新选项' }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  describe('FormPreview component', () => {
    it('renders form title and description', () => {
      const config: FormConfig = {
        id: 'test',
        title: '测试表单',
        description: '<p>这是描述</p>',
        fields: [],
      };
      
      render(<FormPreview config={config} />);
      
      expect(screen.getByText('测试表单')).toBeInTheDocument();
      expect(screen.getByText('这是描述')).toBeInTheDocument();
    });

    it('renders submit and reset buttons', () => {
      const config: FormConfig = {
        id: 'test',
        title: 'Test',
        fields: [],
        submitText: '提交表单',
        resetText: '清空',
      };
      
      render(<FormPreview config={config} />);
      
      expect(screen.getByText('提交表单')).toBeInTheDocument();
      expect(screen.getByText('清空')).toBeInTheDocument();
    });

    it('renders text input field', () => {
      const config: FormConfig = {
        id: 'test',
        title: 'Test',
        fields: [
          {
            id: 'name',
            name: 'name',
            label: '姓名',
            type: 'text',
            order: 0,
            placeholder: '请输入姓名',
          },
        ],
      };
      
      render(<FormPreview config={config} />);
      
      expect(screen.getByLabelText(/姓名/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入姓名')).toBeInTheDocument();
    });

    it('renders required indicator', () => {
      const config: FormConfig = {
        id: 'test',
        title: 'Test',
        fields: [
          {
            id: 'name',
            name: 'name',
            label: '姓名',
            type: 'text',
            order: 0,
            required: true,
          },
        ],
      };
      
      render(<FormPreview config={config} />);
      
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders help text', () => {
      const config: FormConfig = {
        id: 'test',
        title: 'Test',
        fields: [
          {
            id: 'name',
            name: 'name',
            label: '姓名',
            type: 'text',
            order: 0,
            helpText: '请填写真实姓名',
          },
        ],
      };
      
      render(<FormPreview config={config} />);
      
      expect(screen.getByText('请填写真实姓名')).toBeInTheDocument();
    });

    it('renders select field with options', () => {
      const config: FormConfig = {
        id: 'test',
        title: 'Test',
        fields: [
          {
            id: 'role',
            name: 'role',
            label: '角色',
            type: 'select',
            order: 0,
            options: [
              { value: 'admin', label: '管理员' },
              { value: 'user', label: '普通用户' },
            ],
          },
        ],
      };
      
      render(<FormPreview config={config} />);
      
      expect(screen.getByLabelText(/角色/)).toBeInTheDocument();
      expect(screen.getByText('管理员')).toBeInTheDocument();
      expect(screen.getByText('普通用户')).toBeInTheDocument();
    });

    it('renders radio field', () => {
      const config: FormConfig = {
        id: 'test',
        title: 'Test',
        fields: [
          {
            id: 'gender',
            name: 'gender',
            label: '性别',
            type: 'radio',
            order: 0,
            options: [
              { value: 'male', label: '男' },
              { value: 'female', label: '女' },
            ],
          },
        ],
      };
      
      render(<FormPreview config={config} />);
      
      expect(screen.getByLabelText('男')).toBeInTheDocument();
      expect(screen.getByLabelText('女')).toBeInTheDocument();
    });

    it('renders checkbox field', () => {
      const config: FormConfig = {
        id: 'test',
        title: 'Test',
        fields: [
          {
            id: 'agree',
            name: 'agree',
            label: '同意',
            type: 'checkbox',
            order: 0,
            placeholder: '我同意条款',
          },
        ],
      };
      
      render(<FormPreview config={config} />);
      
      expect(screen.getByLabelText('我同意条款')).toBeInTheDocument();
    });

    it('calls onSubmit with form data', async () => {
      const handleSubmit = vi.fn();
      const config: FormConfig = {
        id: 'test',
        title: 'Test',
        fields: [
          {
            id: 'name',
            name: 'name',
            label: '姓名',
            type: 'text',
            order: 0,
          },
        ],
      };
      
      render(<FormPreview config={config} onSubmit={handleSubmit} />);
      
      const input = screen.getByLabelText(/姓名/);
      await userEvent.type(input, '张三');
      
      const submitButton = screen.getByText('提交');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: '张三',
          })
        );
      });
    });

    it('shows validation error for required field', async () => {
      const config: FormConfig = {
        id: 'test',
        title: 'Test',
        fields: [
          {
            id: 'name',
            name: 'name',
            label: '姓名',
            type: 'text',
            order: 0,
            required: true,
          },
        ],
      };
      
      render(<FormPreview config={config} />);
      
      const submitButton = screen.getByText('提交');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('此字段为必填项')).toBeInTheDocument();
      });
    });

    it('resets form when reset button is clicked', async () => {
      const config: FormConfig = {
        id: 'test',
        title: 'Test',
        fields: [
          {
            id: 'name',
            name: 'name',
            label: '姓名',
            type: 'text',
            order: 0,
          },
        ],
      };
      
      render(<FormPreview config={config} />);
      
      const input = screen.getByLabelText(/姓名/) as HTMLInputElement;
      await userEvent.type(input, '张三');
      expect(input.value).toBe('张三');
      
      const resetButton = screen.getByText('重置');
      fireEvent.click(resetButton);
      
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });
});