import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { DemoModeBanner } from '@/components/demo/DemoModeBanner';

export const metadata: Metadata = {
  title: 'Wenjuan',
  description: 'AI-first survey editor'
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
