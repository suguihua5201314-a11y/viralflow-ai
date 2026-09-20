import type { ProductKnowledge } from "../../knowledge-context";
import type { PersistentProject } from "../../project-memory";
import { EmptyState, WorkspaceHeader, WorkspaceShell } from "../workspace/workspace";

export default function ProjectBrainWorkspace({ project, knowledge, reference, onEdit }: { project?: PersistentProject; knowledge?: ProductKnowledge; reference?: string; onEdit: () => void }) {
  const sections = [
    ["Product Knowledge · 产品知识", knowledge?.parameters],
    ["Selling Points · 核心卖点", knowledge?.sellingPoints],
    ["Compliance · 合规规则", knowledge?.bannedWords],
    ["Audience · 受众", knowledge?.audience],
    ["Market Context · 市场", project ? `${project.market} · ${project.platform} · ${project.language}` : ""],
    ["Brand Voice · 品牌语气", ""],
    ["Reference Scripts · 参考脚本", reference],
  ];
  return <WorkspaceShell kind="brain"><WorkspaceHeader title="项目大脑" context={project?.name || "请选择项目"} actions={<button onClick={onEdit}>编辑产品知识</button>} /><div className="creative-knowledge">{sections.map(([title, value]) => <section key={title}><h3>{title}</h3>{value ? <p>{value}</p> : <EmptyState title="尚无这类知识">仅展示当前项目已有资料。</EmptyState>}</section>)}</div></WorkspaceShell>;
}
