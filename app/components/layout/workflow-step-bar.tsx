import type { ActiveView } from "../../navigation";

const steps: Array<{ id: ActiveView; label: string; future?: boolean }> = [
  { id: "breakdown", label: "爆款研究" },
  { id: "replicate", label: "内容策划" },
  { id: "create", label: "脚本创作" },
  { id: "director", label: "AI 分镜导演" },
  { id: "frames", label: "画面提示词" },
  { id: "images", label: "视觉创作" },
  { id: "assets", label: "素材管理" },
  { id: "voice", label: "声音制作" },
  { id: "video", label: "视频分析" },
];

export default function WorkflowStepBar({ active, onNavigate }: { active: ActiveView; onNavigate: (view: ActiveView) => void }) {
  const activeIndex = steps.findIndex(step => step.id === active);
  if (activeIndex < 0) return null;
  return <nav className="os-vf-workflow-bar" aria-label="创作流程">
    <span className="os-vf-workflow-label">创作流程</span>
    <div>
      {steps.map((step, index) => <button
        key={step.id}
        type="button"
        className={index === activeIndex ? "is-active" : ""}
        aria-current={index === activeIndex ? "step" : undefined}
        onClick={() => onNavigate(step.id)}
      >
        <i>{index + 1}</i>
        <span>{step.label}</span>
        {step.future ? <em>即将开放</em> : null}
      </button>)}
    </div>
  </nav>;
}
