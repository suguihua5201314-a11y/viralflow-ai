import type { Metadata } from "next";
import "./globals.css";
import "./styles/dashboard.css";
import "./styles/data-center.css";
import "./styles/viral-analyzer.css";
import "./styles/viral-replication.css";
import "./styles/replication-intelligence.css";
import "./styles/workspace-states.css";
import "./styles/interaction.css";
import "./styles/analyzer-replication-workspace.css";
import "./styles/design-tokens.css";
import "./styles/workspace-components.css";
export const metadata: Metadata = { title: "ViralFlow AI", description: "面向短视频团队的 AI Creative Pipeline 创意生产工作台", other: { "codex-preview": "development" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
