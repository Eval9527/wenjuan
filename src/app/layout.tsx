import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { DemoModeBanner } from '@/components/demo/DemoModeBanner';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: 'Wenjuan',
  title: {
    default: 'Wenjuan｜AI-first 问卷编辑器',
    template: '%s｜Wenjuan'
  },
  description: 'Wenjuan 是一个 AI-first 问卷编辑器 demo，支持自然语言生成问卷、可视化编辑、发布收集与数据分析。',
  keywords: ['AI 问卷', '问卷编辑器', '在线问卷', 'Next.js', 'Postgres', 'Survey Builder'],
  authors: [{ name: 'Wenjuan Contributors' }],
  creator: 'Wenjuan Contributors',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    siteName: 'Wenjuan',
    title: 'Wenjuan｜AI-first 问卷编辑器',
    description: '用 AI 快速生成、编辑、发布问卷，并在一个演示站里查看答卷数据。',
    images: [
      {
        url: '/og.svg',
        width: 1200,
        height: 630,
        alt: 'Wenjuan AI-first survey editor'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wenjuan｜AI-first 问卷编辑器',
    description: 'AI 生成问卷、在线编辑、一键发布与数据分析。',
    images: ['/og.svg']
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: [{ url: '/apple-icon.svg', type: 'image/svg+xml' }]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <DemoModeBanner />
        {children}
      </body>
    </html>
  );
}
