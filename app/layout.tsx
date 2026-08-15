import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "爆款脚本生成器", description: "面向TikTok电商团队的多语言爆款脚本工作台", other: { "codex-preview": "development" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
