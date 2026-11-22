import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "小貿老師給阿陶阿墨的分子探險教室",
  description: "用手指旋轉、縮放的立體分子模型。認識水、二氧化碳、葡萄糖、食鹽和咖啡因的形狀。",
  applicationName: "小貿老師給阿陶阿墨的分子探險教室",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "分子探險教室",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#160c36",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
