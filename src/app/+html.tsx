import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();
  return <html {...htmlAttributes} lang="vi">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="theme-color" content="#1769E0" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="UniNet" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <link rel="manifest" href="/manifest.webmanifest" />
      <link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png" sizes="180x180" />
      <ScrollViewStyleReset />
      {headNodes}
    </head>
    <body {...bodyAttributes}>{children}{bodyNodes}</body>
  </html>;
}
