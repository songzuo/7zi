/**
 * Modal.stories.ts - Modal 组件的 Storybook 故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
      description: '模态框大小',
    },
    showCloseButton: {
      control: 'boolean',
      description: '是否显示关闭按钮',
    },
    closeOnOverlayClick: {
      control: 'boolean',
      description: '点击遮罩层是否关闭',
    },
    showOverlay: {
      control: 'boolean',
      description: '是否显示遮罩层',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

// 基础模态框
export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>打开模态框</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="基础模态框"
        >
          <p>这是一个基础的模态框组件。</p>
        </Modal>
      </div>
    );
  },
};

// 小尺寸
export const Small: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>小模态框</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="小尺寸模态框"
          size="sm"
        >
          <p>这是一个小尺寸的模态框。</p>
        </Modal>
      </div>
    );
  },
};

// 大尺寸
export const Large: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>大模态框</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="大尺寸模态框"
          size="lg"
        >
          <div className="space-y-4">
            <p>这是一个大尺寸的模态框。</p>
            <p>可以容纳更多的内容，适合展示详细信息或表单。</p>
            <p>这里可以放置各种内容，包括文本、图片、表格等。</p>
          </div>
        </Modal>
      </div>
    );
  },
};

// 超大尺寸
export const ExtraLarge: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>超大模态框</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="超大尺寸模态框"
          size="xl"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">区域 1</h3>
              <p>这是第一个内容区域。</p>
            </div>
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">区域 2</h3>
              <p>这是第二个内容区域。</p>
            </div>
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">区域 3</h3>
              <p>这是第三个内容区域。</p>
            </div>
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">区域 4</h3>
              <p>这是第四个内容区域。</p>
            </div>
          </div>
        </Modal>
      </div>
    );
  },
};

// 无遮罩层
export const NoOverlay: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>无遮罩模态框</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="无遮罩层模态框"
          showOverlay={false}
        >
          <p>这个模态框没有遮罩层。</p>
        </Modal>
      </div>
    );
  },
};

// 禁止点击遮罩关闭
export const CloseOnlyByButton: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>
          只能通过按钮关闭
        </Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="禁止点击遮罩关闭"
          closeOnOverlayClick={false}
        >
          <p>这个模态框只能通过关闭按钮或 ESC 键关闭。</p>
        </Modal>
      </div>
    );
  },
};

// 带页脚
export const WithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>带页脚模态框</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="确认操作"
          footer={
            <>
              <Button onClick={() => setIsOpen(false)} variant="outline">
                取消
              </Button>
              <Button onClick={() => setIsOpen(false)} variant="danger">
                删除
              </Button>
            </>
          }
        >
          <p>您确定要执行此操作吗？此操作无法撤销。</p>
        </Modal>
      </div>
    );
  },
};

// 表单模态框
export const FormModal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>打开表单</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="编辑用户信息"
          size="lg"
          footer={
            <>
              <Button onClick={() => setIsOpen(false)} variant="outline">
                取消
              </Button>
              <Button onClick={() => setIsOpen(false)} variant="primary">
                保存
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="用户名"
              placeholder="请输入用户名"
            />
            <Input
              label="邮箱"
              type="email"
              placeholder="example@email.com"
            />
            <Input
              label="手机号"
              type="tel"
              placeholder="请输入手机号"
            />
          </div>
        </Modal>
      </div>
    );
  },
};

// 无标题
export const WithoutTitle: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>无标题模态框</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          showCloseButton={false}
        >
          <div className="text-center">
            <div className="text-green-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">操作成功</h3>
            <p className="text-gray-600 mb-4">您的操作已成功完成！</p>
            <Button onClick={() => setIsOpen(false)}>确定</Button>
          </div>
        </Modal>
      </div>
    );
  },
};

// 长内容
export const LongContent: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>长内容模态框</Button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="服务条款"
          size="lg"
        >
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <p>欢迎使用我们的服务。在使用本服务之前，请仔细阅读以下条款。</p>
            
            <h3 className="text-lg font-semibold">1. 服务说明</h3>
            <p>
              我们提供各种在线服务，包括但不限于数据存储、文件传输、即时通讯等功能。
              用户可以根据需要选择使用哪些服务。
            </p>
            
            <h3 className="text-lg font-semibold">2. 用户责任</h3>
            <p>
              用户在使用本服务时，必须遵守相关法律法规，不得利用本服务从事任何违法活动。
              用户对自己账户的安全负责，包括保护密码不被泄露。
            </p>
            
            <h3 className="text-lg font-semibold">3. 隐私政策</h3>
            <p>
              我们重视用户的隐私保护。我们会收集必要的信息以提供服务，但不会将您的个人信息
              泄露给第三方，除非获得您的明确同意或法律法规要求。
            </p>
            
            <h3 className="text-lg font-semibold">4. 服务变更</h3>
            <p>
              我们保留随时修改或终止服务的权利。在重大变更时，我们会提前通知用户。
            </p>
            
            <h3 className="text-lg font-semibold">5. 免责声明</h3>
            <p>
              在法律允许的范围内，我们不对因使用或无法使用本服务而造成的任何直接或间接损失承担责任。
            </p>
            
            <h3 className="text-lg font-semibold">6. 争议解决</h3>
            <p>
              如发生争议，双方应友好协商解决。协商不成的，可向有管辖权的人民法院提起诉讼。
            </p>
          </div>
        </Modal>
      </div>
    );
  },
};
