/**
 * 按钮变体一致性测试
 *
 * 测试目标：确保所有使用按钮的地方遵循一致的变体规范
 * 基于 COMPONENT_CONSISTENCY_AUDIT_v170.md 的问题发现
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock next-intl
const mockUseTranslations = vi.fn((namespace: string) => (key: string) => `${namespace}.${key}`);
vi.mock("next-intl", () => ({
  useTranslations: () => mockUseTranslations,
}));

import { Button } from "@/components/ui/Button";

describe("Button Variant Consistency Tests", () => {
  describe("按钮变体颜色一致性", () => {
    it("primary 变体应该使用蓝色系颜色", () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-blue-600");
      expect(button).toHaveClass("hover:bg-blue-700");
      expect(button).toHaveClass("focus:ring-blue-500");
    });

    it("secondary 变体应该使用中性灰色系颜色", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-zinc-600");
      expect(button).toHaveClass("hover:bg-zinc-700");
      expect(button).toHaveClass("focus:ring-zinc-500");
    });

    it("danger 变体应该使用红色系颜色", () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-red-600");
      expect(button).toHaveClass("hover:bg-red-700");
      expect(button).toHaveClass("focus:ring-red-500");
    });

    it("outline 变体应该有边框但没有背景色", () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("border-2");
      expect(button).toHaveClass("border-zinc-300");
      expect(button).not.toHaveClass("bg-"); // 不应该有背景色
    });

    it("ghost 变体应该是透明背景，hover时显示背景", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("hover:bg-zinc-100");
      expect(button).toHaveClass("dark:hover:bg-zinc-800");
      expect(button).not.toHaveClass("bg-"); // 默认状态无背景色
    });

    it("link 变体应该看起来像链接", () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("text-blue-600");
      expect(button).toHaveClass("hover:underline");
    });
  });

  describe("按钮尺寸一致性", () => {
    const sizeClasses: Record<string, { padding: string[], textSize: string }> = {
      xs: { padding: ["px-3", "py-1.5"], textSize: "text-xs" },
      sm: { padding: ["px-3", "py-2"], textSize: "text-sm" },
      md: { padding: ["px-4", "py-2"], textSize: "text-base" },
      lg: { padding: ["px-6", "py-3"], textSize: "text-lg" },
      xl: { padding: ["px-8", "py-4"], textSize: "text-xl" },
    };

    Object.entries(sizeClasses).forEach(([size, classes]) => {
      it(`${size} 尺寸应该使用一致的 padding 和文本大小`, () => {
        render(<Button size={size as any}>{size.toUpperCase()}</Button>);
        const button = screen.getByRole("button");
        classes.padding.forEach(cls => {
          expect(button).toHaveClass(cls);
        });
        expect(button).toHaveClass(classes.textSize);
      });
    });
  });

  describe("按钮状态一致性", () => {
    it("disabled 状态应该有统一的透明度和光标样式", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("disabled:opacity-50");
      expect(button).toHaveClass("disabled:cursor-not-allowed");
      expect(button).toBeDisabled();
    });

    it("loading 状态应该禁用按钮并显示加载指示器", () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("所有变体都应该有 focus ring", () => {
      const variants: Array<"primary" | "secondary" | "outline" | "ghost" | "danger" | "link"> =
        ["primary", "secondary", "outline", "ghost", "danger", "link"];

      variants.forEach((variant) => {
        const { unmount } = render(<Button variant={variant}>{variant}</Button>);
        const button = screen.getByRole("button");
        expect(button).toHaveClass("focus:outline-none");
        expect(button).toHaveClass("focus:ring-2");
        expect(button).toHaveClass("focus:ring-offset-2");
        unmount();
      });
    });
  });

  describe("按钮图标一致性", () => {
    it("图标在左侧应该有正确的间距", () => {
      const icon = <span data-testid="icon">★</span>;
      render(<Button icon={icon}>With Icon</Button>);
      const iconEl = screen.getByTestId("icon");
      expect(iconEl.parentElement).toHaveClass("mr-2");
    });

    it("图标在右侧应该有正确的间距", () => {
      const icon = <span data-testid="icon">★</span>;
      render(
        <Button icon={icon} iconPosition="right">
          With Icon
        </Button>
      );
      const iconEl = screen.getByTestId("icon");
      expect(iconEl.parentElement).toHaveClass("ml-2");
    });

    it("loading 状态下不应该显示图标", () => {
      const icon = <span data-testid="icon">★</span>;
      render(
        <Button icon={icon} loading>
          Loading
        </Button>
      );
      expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
    });
  });

  describe("暗色模式一致性", () => {
    it("所有变体都应该有暗色模式样式", () => {
      const variants = ["primary", "secondary", "outline", "ghost", "danger", "link"];

      variants.forEach((variant) => {
        const { unmount } = render(<Button variant={variant as any}>{variant}</Button>);
        const button = screen.getByRole("button");
        // 检查是否有暗色模式的 focus ring offset
        expect(button).toHaveClass("dark:focus:ring-offset-zinc-900");
        unmount();
      });
    });

    it("outline 变体在暗色模式下应该使用暗色边框", () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("dark:border-zinc-600");
      expect(button).toHaveClass("dark:text-zinc-300");
    });

    it("ghost 变体在暗色模式下应该有暗色 hover 背景", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("dark:hover:bg-zinc-800");
    });
  });

  describe("按钮变体完整性", () => {
    it("所有定义的变体都应该能正确渲染", () => {
      const variants: Array<"primary" | "secondary" | "outline" | "ghost" | "danger" | "link"> =
        ["primary", "secondary", "outline", "ghost", "danger", "link"];

      variants.forEach((variant) => {
        const { unmount } = render(<Button variant={variant}>{variant}</Button>);
        expect(screen.getByRole("button")).toBeInTheDocument();
        unmount();
      });
    });

    it("所有定义的尺寸都应该能正确渲染", () => {
      const sizes = ["xs", "sm", "md", "lg", "xl"];

      sizes.forEach((size) => {
        const { unmount } = render(<Button size={size as any}>{size}</Button>);
        expect(screen.getByRole("button")).toBeInTheDocument();
        unmount();
      });
    });
  });
});
