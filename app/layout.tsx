import type { Metadata } from "next";
import "./globals.css";
import "./styles/viralflow-shell.css";
import "./styles/script-studio.css";
export const metadata: Metadata = { title: "ViralFlow AI", description: "面向短视频团队的 AI Creative Pipeline 创意生产工作台", other: { "codex-preview": "development" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
