/**
 * Card.stories.ts - Card 组件的 Storybook 故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  CardImage,
  CardTitle,
  CardText,
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    shadow: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      description: '阴影大小',
    },
    clickable: {
      control: 'boolean',
      description: '是否可点击',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

// 基础卡片
export const Default: Story = {
  render: () => (
    <Card>
      <CardBody>
        <CardTitle>基础卡片</CardTitle>
        <CardText>这是一个基础的卡片组件，可以包含标题、文本和其他内容。</CardText>
      </CardBody>
    </Card>
  ),
};

// 带图片的卡片
export const WithImage: Story = {
  render: () => (
    <Card>
      <CardImage
        src="https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800"
        alt="Card Image"
      />
      <CardBody>
        <CardTitle>带图片的卡片</CardTitle>
        <CardText>这个卡片包含一张图片，适合展示产品、文章等。</CardText>
      </CardBody>
    </Card>
  ),
};

// 完整卡片
export const CompleteCard: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>完整卡片</CardTitle>
      </CardHeader>
      <CardBody>
        <CardText>
          这是一个完整的卡片示例，包含头部、主体和底部区域。适合展示详细内容。
        </CardText>
      </CardBody>
      <CardFooter>
        <Button size="sm">取消</Button>
        <Button size="sm" variant="primary">确认</Button>
      </CardFooter>
    </Card>
  ),
};

// 可点击卡片
export const Clickable: Story = {
  render: () => (
    <Card clickable shadow="lg">
      <CardBody>
        <CardTitle>可点击卡片</CardTitle>
        <CardText>点击这个卡片可以触发某些操作。</CardText>
      </CardBody>
    </Card>
  ),
};

// 不同阴影
export const ShadowVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Card shadow="none">
        <CardBody className="p-4">无阴影</CardBody>
      </Card>
      <Card shadow="sm">
        <CardBody className="p-4">小阴影</CardBody>
      </Card>
      <Card shadow="md">
        <CardBody className="p-4">中阴影</CardBody>
      </Card>
      <Card shadow="lg">
        <CardBody className="p-4">大阴影</CardBody>
      </Card>
      <Card shadow="xl">
        <CardBody className="p-4">特大阴影</CardBody>
      </Card>
    </div>
  ),
};

// 卡片网格
export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card shadow="lg">
        <CardImage
          src="https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400"
          alt="Product 1"
        />
        <CardBody>
          <CardTitle>产品 1</CardTitle>
          <CardText>这是第一个产品的描述信息。</CardText>
        </CardBody>
      </Card>
      
      <Card shadow="lg">
        <CardImage
          src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400"
          alt="Product 2"
        />
        <CardBody>
          <CardTitle>产品 2</CardTitle>
          <CardText>这是第二个产品的描述信息。</CardText>
        </CardBody>
      </Card>
      
      <Card shadow="lg">
        <CardImage
          src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400"
          alt="Product 3"
        />
        <CardBody>
          <CardTitle>产品 3</CardTitle>
          <CardText>这是第三个产品的描述信息。</CardText>
        </CardBody>
      </Card>
    </div>
  ),
};

// 文章卡片
export const ArticleCard: Story = {
  render: () => (
    <Card shadow="lg" clickable>
      <CardImage
        src="https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800"
        alt="Article"
      />
      <CardBody>
        <div className="text-sm text-blue-600 mb-2">技术文章</div>
        <CardTitle className="text-2xl mb-2">
          如何使用 Storybook 构建设计系统
        </CardTitle>
        <CardText>
          Storybook 是一个强大的工具，可以帮助我们构建可复用的 UI 组件。
          在这篇文章中，我们将学习如何使用 Storybook 创建设计系统。
        </CardText>
      </CardBody>
      <CardFooter>
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-gray-500">2024年3月28日</span>
          <Button size="sm">阅读更多</Button>
        </div>
      </CardFooter>
    </Card>
  ),
};

// 用户资料卡片
export const ProfileCard: Story = {
  render: () => (
    <Card shadow="lg" className="max-w-md">
      <CardBody>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            JD
          </div>
          <div>
            <CardTitle className="text-xl">John Doe</CardTitle>
            <p className="text-gray-500">前端开发工程师</p>
          </div>
        </div>
        <CardText>
          热爱编程，专注于 React 和前端技术栈。喜欢学习新技术，
          分享开发经验。
        </CardText>
      </CardBody>
      <CardFooter>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">关注</Button>
          <Button size="sm">私信</Button>
        </div>
      </CardFooter>
    </Card>
  ),
};
