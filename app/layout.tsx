import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "雷诺曼学院",
  description: "案例库与学习系统 MVP",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
