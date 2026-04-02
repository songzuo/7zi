export const metadata = {
  title: '用户反馈 - 7zi Studio',
  description:
    '欢迎提供您的反馈意见。无论是问题报告、功能建议还是其他反馈，我们都欢迎您的声音，并会认真对待每一条反馈。',
  keywords: ['用户反馈', '问题报告', '功能建议', '7zi Studio', '反馈系统'],
  openGraph: {
    title: '用户反馈 - 7zi Studio',
    description: '欢迎提供您的反馈意见。无论是问题报告、功能建议还是其他反馈，我们都欢迎您的声音。',
    type: 'website',
    url: 'https://7zi.studio/feedback',
    images: [
      {
        url: 'https://7zi.studio/images/og-feedback.jpg',
        width: 1200,
        height: 630,
        alt: '用户反馈页面',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '用户反馈 - 7zi Studio',
    description: '欢迎提供您的反馈意见。无论是问题报告、功能建议还是其他反馈，我们都欢迎您的声音。',
    images: ['https://7zi.studio/images/og-feedback.jpg'],
  },
}

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children
}
