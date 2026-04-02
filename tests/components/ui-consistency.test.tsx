/**
 * UI 组件一致性测试
 *
 * 测试目标：验证 UI 组件遵循 UI_CONSISTENCY_GUIDE.md 中定义的一致性标准
 *
 * 测试覆盖：
 * - Button 组件变体一致性（primary/secondary/destructive/ghost）
 * - 输入框状态样式一致性（error/success/warning）
 * - 卡片组件样式一致性
 * - 颜色使用一致性（主题色语义）
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import React from "react";

// Mock next-intl
const mockUseTranslations = vi.fn((namespace: string) => (key: string) => `${namespace}.${key}`);
vi.mock("next-intl", () => ({
  useTranslations: () => mockUseTranslations,
}));

// Import components
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

describe("UI Component Consistency Tests", () => {
  beforeEach(() => {
    cleanup();
  });

  describe("Button 变体一致性测试", () => {
    describe("primary 变体", () => {
      it("应该使用正确的蓝色主题色", () => {
        render(<Button variant="primary">Primary Button</Button>);
        const button = screen.getByRole("button");

        // 验证使用蓝色系颜色
        expect(button).toHaveClass("bg-blue-600");
        expect(button).toHaveClass("hover:bg-blue-700");
        expect(button).toHaveClass("focus:ring-blue-500");

        // 验证文本色
        expect(button).toHaveClass("text-white");
      });

      it("应该有阴影效果", () => {
        render(<Button variant="primary">Primary Button</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("shadow-md");
        expect(button).toHaveClass("hover:shadow-lg");
      });

      it("应该支持暗色模式", () => {
        render(<Button variant="primary">Primary Button</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("dark:focus:ring-offset-zinc-900");
      });
    });

    describe("secondary 变体", () => {
      it("应该使用中性灰色系", () => {
        render(<Button variant="secondary">Secondary Button</Button>);
        const button = screen.getByRole("button");

        // 验证使用锌灰色系
        expect(button).toHaveClass("bg-zinc-600");
        expect(button).toHaveClass("hover:bg-zinc-700");
        expect(button).toHaveClass("focus:ring-zinc-500");

        // 验证文本色
        expect(button).toHaveClass("text-white");
      });

      it("应该有阴影效果", () => {
        render(<Button variant="secondary">Secondary Button</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("shadow-md");
        expect(button).toHaveClass("hover:shadow-lg");
      });
    });

    describe("danger 变体（destructive）", () => {
      it("应该使用红色系危险色", () => {
        render(<Button variant="danger">Danger Button</Button>);
        const button = screen.getByRole("button");

        // 验证使用红色系颜色
        expect(button).toHaveClass("bg-red-600");
        expect(button).toHaveClass("hover:bg-red-700");
        expect(button).toHaveClass("focus:ring-red-500");

        // 验证文本色
        expect(button).toHaveClass("text-white");
      });

      it("应该有阴影效果", () => {
        render(<Button variant="danger">Danger Button</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("shadow-md");
        expect(button).toHaveClass("hover:shadow-lg");
      });
    });

    describe("ghost 变体", () => {
      it("应该是透明背景，hover 时显示背景", () => {
        render(<Button variant="ghost">Ghost Button</Button>);
        const button = screen.getByRole("button");

        // 验证默认状态无背景色
        expect(button).not.toHaveClass(/^bg-/);

        // 验证 hover 背景
        expect(button).toHaveClass("hover:bg-zinc-100");
        expect(button).toHaveClass("dark:hover:bg-zinc-800");
      });

      it("应该有正确的文本颜色", () => {
        render(<Button variant="ghost">Ghost Button</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("text-zinc-700");
        expect(button).toHaveClass("dark:text-zinc-300");
      });
    });

    describe("outline 变体", () => {
      it("应该有边框但无背景色", () => {
        render(<Button variant="outline">Outline Button</Button>);
        const button = screen.getByRole("button");

        // 验证边框
        expect(button).toHaveClass("border-2");
        expect(button).toHaveClass("border-zinc-300");
        expect(button).toHaveClass("dark:border-zinc-600");

        // 验证无背景色
        expect(button).not.toHaveClass(/^bg-([a-z]+)-\d+$/);
      });

      it("应该有正确的文本颜色", () => {
        render(<Button variant="outline">Outline Button</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("text-zinc-700");
        expect(button).toHaveClass("dark:text-zinc-300");
      });

      it("hover 时应该变蓝", () => {
        render(<Button variant="outline">Outline Button</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("hover:border-blue-500");
        expect(button).toHaveClass("hover:text-blue-600");
        expect(button).toHaveClass("dark:hover:text-blue-400");
      });
    });

    describe("Button 通用一致性", () => {
      it("所有变体都应该有 focus ring", () => {
        const variants = ["primary", "secondary", "danger", "ghost", "outline", "link"];

        variants.forEach((variant) => {
          const { unmount } = render(
            <Button variant={variant as any}>{variant}</Button>
          );
          const button = screen.getByRole("button");

          expect(button).toHaveClass("focus:outline-none");
          expect(button).toHaveClass("focus:ring-2");
          expect(button).toHaveClass("focus:ring-offset-2");

          unmount();
        });
      });

      it("所有变体都应该有过渡动画", () => {
        const variants = ["primary", "secondary", "danger", "ghost", "outline", "link"];

        variants.forEach((variant) => {
          const { unmount } = render(
            <Button variant={variant as any}>{variant}</Button>
          );
          const button = screen.getByRole("button");

          expect(button).toHaveClass("transition-all");
          expect(button).toHaveClass("duration-200");

          unmount();
        });
      });

      it("disabled 状态应该有统一的样式", () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("disabled:opacity-50");
        expect(button).toHaveClass("disabled:cursor-not-allowed");
        expect(button).toBeDisabled();
      });

      it("loading 状态应该禁用按钮", () => {
        render(<Button loading>Loading</Button>);
        const button = screen.getByRole("button");

        expect(button).toBeDisabled();
        expect(button.querySelector(".animate-spin")).toBeInTheDocument();
      });
    });
  });

  describe("Input 状态样式一致性测试", () => {
    describe("error 状态", () => {
      it("应该支持 error 状态类名", () => {
        const { container } = render(
          <Input
            label="Test Input Error"
            required
            className="focus:ring-red-500 focus:border-red-500"
          />
        );
        const input = container.querySelector("input");

        // 验证支持状态类名
        expect(input).toHaveClass("focus:ring-2");
        expect(input).toHaveClass("focus:ring-red-500");
        expect(input).toHaveClass("focus:border-red-500");
      });
    });

    describe("success 状态", () => {
      it("应该支持 success 状态类名", () => {
        const { container } = render(
          <Input
            label="Test Input Success"
            className="focus:ring-green-500 focus:border-green-500"
          />
        );
        const input = container.querySelector("input");

        expect(input).toHaveClass("focus:ring-2");
        expect(input).toHaveClass("focus:ring-green-500");
        expect(input).toHaveClass("focus:border-green-500");
      });
    });

    describe("warning 状态", () => {
      it("应该支持 warning 状态类名", () => {
        const { container } = render(
          <Input
            label="Test Input Warning"
            className="focus:ring-amber-500 focus:border-amber-500"
          />
        );
        const input = container.querySelector("input");

        expect(input).toHaveClass("focus:ring-2");
        expect(input).toHaveClass("focus:ring-amber-500");
        expect(input).toHaveClass("focus:border-amber-500");
      });
    });

    describe("Input 通用样式一致性", () => {
      it("应该有正确的边框样式", () => {
        const { container } = render(<Input label="Test Input" />);
        const input = container.querySelector("input");

        expect(input).toHaveClass("border");
        expect(input).toHaveClass("border-zinc-300");
        expect(input).toHaveClass("dark:border-zinc-600");
        expect(input).toHaveClass("rounded-lg");
      });

      it("应该有正确的内边距", () => {
        const { container } = render(<Input label="Test Input" />);
        const input = container.querySelector("input");

        expect(input).toHaveClass("px-4");
        expect(input).toHaveClass("py-2");
      });

      it("应该有正确的 focus 状态", () => {
        const { container } = render(<Input label="Test Input" />);
        const input = container.querySelector("input");

        expect(input).toHaveClass("focus:ring-2");
        expect(input).toHaveClass("focus:ring-blue-500");
        expect(input).toHaveClass("focus:border-transparent");
      });

      it("应该支持暗色模式", () => {
        const { container } = render(<Input label="Test Input" />);
        const input = container.querySelector("input");

        expect(input).toHaveClass("dark:bg-zinc-800");
        expect(input).toHaveClass("dark:text-white");
      });

      it("label 应该有正确的样式", () => {
        const { container } = render(<Input label="Test Input" />);
        const label = container.querySelector("label");

        expect(label).toBeInTheDocument();
        expect(label).toHaveClass("text-sm");
        expect(label).toHaveClass("font-medium");
      });

      it("required 标记应该是红色", () => {
        const { container } = render(<Input label="Test Input" required />);
        const requiredSpan = container.querySelector("span");

        expect(requiredSpan).toBeInTheDocument();
        expect(requiredSpan).toHaveClass("text-red-500");
        expect(requiredSpan).toHaveClass("ml-1");
      });
    });
  });

  describe("Card 组件样式一致性测试", () => {
    describe("Card 基础样式", () => {
      it("应该有正确的边框和圆角", () => {
        render(<Card>Card Content</Card>);
        const card = screen.getByText("Card Content");

        expect(card).toHaveClass("border");
        expect(card).toHaveClass("border-zinc-200");
        expect(card).toHaveClass("dark:border-zinc-800");
        expect(card).toHaveClass("rounded-lg");
      });

      it("应该有正确的背景色", () => {
        render(<Card>Card Content</Card>);
        const card = screen.getByText("Card Content");

        expect(card).toHaveClass("bg-white");
        expect(card).toHaveClass("dark:bg-zinc-900");
      });

      it("应该有正确的内边距", () => {
        render(<Card>Card Content</Card>);
        const card = screen.getByText("Card Content");

        expect(card).toHaveClass("p-4");
      });

      it("应该有阴影效果", () => {
        render(<Card>Card Content</Card>);
        const card = screen.getByText("Card Content");

        expect(card).toHaveClass("shadow-sm");
        expect(card).toHaveClass("dark:shadow-none");
      });
    });

    describe("CardHeader 样式", () => {
      it("应该有底边框分隔", () => {
        const { container } = render(
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
            </CardHeader>
          </Card>
        );
        const header = container.querySelector('[class*="border-b"]');

        expect(header).toBeInTheDocument();
        expect(header).toHaveClass("border-b");
        expect(header).toHaveClass("border-zinc-200");
        expect(header).toHaveClass("dark:border-zinc-800");
      });

      it("应该有正确的底部和底部外边距", () => {
        const { container } = render(
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
            </CardHeader>
          </Card>
        );
        const header = container.querySelector('[class*="border-b"]');

        expect(header).toHaveClass("pb-3");
        expect(header).toHaveClass("mb-3");
      });
    });

    describe("CardTitle 样式", () => {
      it("应该有正确的字号和字重", () => {
        render(
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
            </CardHeader>
          </Card>
        );
        const title = screen.getByText("Card Title");

        expect(title.tagName).toBe("H3");
        expect(title).toHaveClass("text-lg");
        expect(title).toHaveClass("font-semibold");
      });

      it("应该有正确的文本颜色", () => {
        render(
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
            </CardHeader>
          </Card>
        );
        const title = screen.getByText("Card Title");

        expect(title).toHaveClass("text-zinc-900");
        expect(title).toHaveClass("dark:text-zinc-100");
      });
    });

    describe("Card 自定义类名支持", () => {
      it("应该支持自定义类名", () => {
        render(
          <Card className="custom-class">Card Content</Card>
        );
        const card = screen.getByText("Card Content");

        expect(card).toHaveClass("custom-class");
      });

      it("应该支持 HTML 属性透传", () => {
        render(
          <Card data-testid="test-card">Card Content</Card>
        );
        const card = screen.getByTestId("test-card");

        expect(card).toBeInTheDocument();
      });
    });
  });

  describe("颜色使用一致性测试", () => {
    describe("主色调（蓝色）语义一致性", () => {
      it("Button primary 应该使用 blue-600", () => {
        render(<Button variant="primary">Primary</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("bg-blue-600");
      });

      it("Input focus 应该使用 blue-500 ring", () => {
        const { container } = render(<Input label="Test Input" />);
        const input = container.querySelector("input");

        expect(input).toHaveClass("focus:ring-blue-500");
      });

      it("Button outline hover 应该使用 blue-500", () => {
        render(<Button variant="outline">Outline</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("hover:border-blue-500");
        expect(button).toHaveClass("hover:text-blue-600");
      });

      it("Button link 应该使用 blue-600", () => {
        render(<Button variant="link">Link</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("text-blue-600");
        expect(button).toHaveClass("dark:text-blue-400");
      });
    });

    describe("成功色（绿色）语义一致性", () => {
      it("required 标记应该使用 red-500", () => {
        const { container } = render(<Input label="Test Input" required />);
        const requiredSpan = container.querySelector("span");

        expect(requiredSpan).toHaveClass("text-red-500");
      });

      it("Button danger 应该使用红色系", () => {
        render(<Button variant="danger">Danger</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("bg-red-600");
        expect(button).toHaveClass("hover:bg-red-700");
        expect(button).toHaveClass("focus:ring-red-500");
      });
    });

    describe("中性色（锌灰）语义一致性", () => {
      it("Button secondary 应该使用锌灰色系", () => {
        render(<Button variant="secondary">Secondary</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("bg-zinc-600");
        expect(button).toHaveClass("hover:bg-zinc-700");
        expect(button).toHaveClass("focus:ring-zinc-500");
      });

      it("Input 边框应该使用 zinc-300/zinc-600", () => {
        const { container } = render(<Input label="Test Input" />);
        const input = container.querySelector("input");

        expect(input).toHaveClass("border-zinc-300");
        expect(input).toHaveClass("dark:border-zinc-600");
      });

      it("Button ghost 文本应该使用 zinc-700/zinc-300", () => {
        render(<Button variant="ghost">Ghost</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("text-zinc-700");
        expect(button).toHaveClass("dark:text-zinc-300");
      });

      it("Card 标题应该使用 zinc-900/zinc-100", () => {
        render(
          <Card>
            <CardHeader>
              <CardTitle>Title</CardTitle>
            </CardHeader>
          </Card>
        );
        const title = screen.getByText("Title");

        expect(title).toHaveClass("text-zinc-900");
        expect(title).toHaveClass("dark:text-zinc-100");
      });
    });

    describe("暗色模式颜色映射一致性", () => {
      it("Card 背景应该正确映射", () => {
        render(<Card>Content</Card>);
        const card = screen.getByText("Content");

        expect(card).toHaveClass("bg-white");
        expect(card).toHaveClass("dark:bg-zinc-900");
      });

      it("Card 边框应该正确映射", () => {
        render(<Card>Content</Card>);
        const card = screen.getByText("Content");

        expect(card).toHaveClass("border-zinc-200");
        expect(card).toHaveClass("dark:border-zinc-800");
      });

      it("Input 背景和文本应该正确映射", () => {
        const { container } = render(<Input label="Test Input" />);
        const input = container.querySelector("input");

        expect(input).toHaveClass("dark:bg-zinc-800");
        expect(input).toHaveClass("dark:text-white");
      });

      it("Button 应该有正确的暗色模式 focus offset", () => {
        render(<Button variant="primary">Primary</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("dark:focus:ring-offset-zinc-900");
      });

      it("Button outline 应该有正确的暗色模式边框", () => {
        render(<Button variant="outline">Outline</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("dark:border-zinc-600");
        expect(button).toHaveClass("dark:text-zinc-300");
      });

      it("Button ghost 应该有正确的暗色模式 hover", () => {
        render(<Button variant="ghost">Ghost</Button>);
        const button = screen.getByRole("button");

        expect(button).toHaveClass("dark:hover:bg-zinc-800");
      });
    });
  });

  describe("样式变量使用一致性测试", () => {
    it("应该使用 Tailwind 类而不是硬编码颜色值", () => {
      // Button primary
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole("button");

      // 验证使用 Tailwind 类而不是 hex 值
      const classList = button.className;
      expect(classList).toMatch(/bg-blue-600/);
      expect(classList).not.toMatch(/bg-#\d+[a-fA-F]{5}/);
    });

    it("应该使用语义化的颜色类名", () => {
      // Button danger
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("bg-red-600");
      expect(button).toHaveClass("hover:bg-red-700");
    });

    it("应该使用统一的前缀（zinc 而不是 gray）", () => {
      // Button secondary
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");

      expect(button).toHaveClass("bg-zinc-600");
      expect(button.className).not.toMatch(/gray/);
    });
  });

  describe("变体组合一致性测试", () => {
    it("Button 应该支持所有 size 和 variant 的组合", () => {
      const variants = ["primary", "secondary", "danger", "ghost", "outline", "link"];
      const sizes = ["xs", "sm", "md", "lg", "xl"];

      variants.forEach((variant) => {
        sizes.forEach((size) => {
          const { unmount } = render(
            <Button variant={variant as any} size={size as any}>
              {variant}-{size}
            </Button>
          );
          const button = screen.getByRole("button");

          // 验证变体类存在 - 根据实际渲染的颜色类
          if (variant === "primary") {
            expect(button).toHaveClass("bg-blue-600");
          } else if (variant === "secondary") {
            expect(button).toHaveClass("bg-zinc-600");
          } else if (variant === "danger") {
            expect(button).toHaveClass("bg-red-600");
          } else if (variant === "ghost") {
            expect(button).toHaveClass("hover:bg-zinc-100");
          } else if (variant === "outline") {
            expect(button).toHaveClass("border-2");
          }

          // 验证尺寸类存在
          if (size === "xs") expect(button).toHaveClass("px-3");
          if (size === "sm") expect(button).toHaveClass("px-3");
          if (size === "md") expect(button).toHaveClass("px-4");
          if (size === "lg") expect(button).toHaveClass("px-6");
          if (size === "xl") expect(button).toHaveClass("px-8");

          unmount();
        });
      });
    });

    it("Input 应该支持 className 和其他属性的组合", () => {
      const { container } = render(
        <Input
          label="Test Input"
          required
          className="custom-class"
          placeholder="Placeholder"
          type="text"
        />
      );

      const input = container.querySelector("input");
      expect(input).toHaveClass("custom-class");
      expect(input).toHaveAttribute("placeholder", "Placeholder");
      expect(input).toHaveAttribute("type", "text");
    });

    it("Card 组件应该支持嵌套和自定义类名", () => {
      render(
        <Card className="custom-card">
          <CardHeader className="custom-header">
            <CardTitle className="custom-title">Title</CardTitle>
          </CardHeader>
        </Card>
      );

      const card = screen.getByText("Title").closest(".custom-card");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("custom-card");
    });
  });
});
