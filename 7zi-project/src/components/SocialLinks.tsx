"use client";

import Link from "next/link";

interface SocialLink {
  name: string;
  icon: string;
  description: string;
  link: string;
  color: string;
}

interface SocialLinksProps {
  variant?: "horizontal" | "vertical" | "grid";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const socialLinks: SocialLink[] = [
  {
    name: "微信公众号",
    icon: "💬",
    description: "关注我们获取最新资讯",
    link: "#",
    color: "from-green-500 to-emerald-600",
  },
  {
    name: "GitHub",
    icon: "🐙",
    description: "查看我们的开源项目",
    link: "https://github.com/7zi-studio",
    color: "from-zinc-700 to-zinc-900",
  },
  {
    name: "Twitter",
    icon: "🐦",
    description: "关注我们的最新动态",
    link: "https://twitter.com/7zistudio",
    color: "from-sky-400 to-sky-600",
  },
  {
    name: "LinkedIn",
    icon: "💼",
    description: "专业网络连接",
    link: "https://linkedin.com/company/7zistudio",
    color: "from-blue-600 to-blue-800",
  },
  {
    name: "Discord",
    icon: "🎮",
    description: "加入我们的社区",
    link: "#",
    color: "from-indigo-500 to-purple-600",
  },
  {
    name: "YouTube",
    icon: "📺",
    description: "观看教程和演示",
    link: "#",
    color: "from-red-500 to-red-700",
  },
];

export function SocialLinks({ variant = "grid", size = "md", className = "" }: SocialLinksProps) {
  const sizeClasses = {
    sm: "p-3 text-sm",
    md: "p-4 text-base",
    lg: "p-6 text-lg",
  };

  const iconSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  if (variant === "horizontal") {
    return (
      <div className={`flex flex-wrap gap-3 ${className}`}>
        {socialLinks.map((social) => (
          <Link
            key={social.name}
            href={social.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center gap-2 bg-gradient-to-br ${social.color} ${sizeClasses[size]} rounded-xl hover:scale-105 transition-all duration-300`}
          >
            <span className={iconSizes[size]}>{social.icon}</span>
            <span className="font-medium text-white">{social.name}</span>
          </Link>
        ))}
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div className={`space-y-3 ${className}`}>
        {socialLinks.map((social) => (
          <Link
            key={social.name}
            href={social.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center gap-4 bg-gradient-to-br ${social.color} ${sizeClasses[size]} rounded-xl hover:scale-105 transition-all duration-300`}
          >
            <span className={iconSizes[size]}>{social.icon}</span>
            <div>
              <div className="font-medium text-white">{social.name}</div>
              <div className="text-xs text-white/70">{social.description}</div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${className}`}>
      {socialLinks.map((social) => (
        <Link
          key={social.name}
          href={social.link}
          target="_blank"
          rel="noopener noreferrer"
          className={`group flex items-center gap-3 bg-gradient-to-br ${social.color} ${sizeClasses[size]} rounded-xl hover:scale-105 transition-all duration-300`}
        >
          <span className={iconSizes[size]}>{social.icon}</span>
          <div>
            <div className="font-medium text-white">{social.name}</div>
            {size !== "sm" && (
              <div className="text-xs text-white/70">{social.description}</div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

export default SocialLinks;
