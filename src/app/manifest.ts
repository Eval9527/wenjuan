import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wenjuan｜AI-first 问卷编辑器',
    short_name: 'Wenjuan',
    description: 'AI-first survey editor for generating, publishing, and analyzing surveys.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f5f8',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ]
  };
}
