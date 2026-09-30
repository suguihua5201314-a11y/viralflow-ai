import { PRODUCTION_STAGES, PRODUCTION_STAGE_META, type ProductionStage, type ProductionStageStatus } from "../../production-stage";

export default function WorkflowStepBar({ current, statuses, onNavigate }: { current: ProductionStage; statuses: Record<ProductionStage, ProductionStageStatus>; onNavigate: (stage: ProductionStage) => void }) {
  return <nav className="os-vf-workflow-bar" aria-label="项目生产流程">
    <span className="os-vf-workflow-label">制作进度</span>
    <div>
      {PRODUCTION_STAGES.map(stage => {
        const meta = PRODUCTION_STAGE_META[stage], status = statuses[stage], locked = status === "locked";
        return <button
        key={stage}
        type="button"
        className={`is-${status}`}
        aria-current={stage === current ? "step" : undefined}
        aria-disabled={locked}
        disabled={locked}
        onClick={() => onNavigate(stage)}
      >
        <i>{status === "completed" ? "✓" : String(meta.order).padStart(2, "0")}</i>
        <span>{meta.label}</span>
      </button>})}
    </div>
  </nav>;
}
