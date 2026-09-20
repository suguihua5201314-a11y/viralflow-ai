import type { DirectorRequest } from "../../director-core";
import DirectorShotImage from "../../director-shot-image";
import type { WorkspaceShot } from "../../director-workspace";

type StoryboardCanvasProps = {
  shot: WorkspaceShot | null;
  input: DirectorRequest;
  visualStyle: string;
  projectId: string | null;
  cameraLabel: (value: string) => string;
  stageLabel: (value: string) => string;
  onNavigateImages: () => void;
};

export default function StoryboardCanvas({
  shot,
  input,
  visualStyle,
  projectId,
  cameraLabel,
  stageLabel,
  onNavigateImages,
}: StoryboardCanvasProps) {
  if (!shot)
    return (
      <main className="vnext-storyboard-canvas">
        <div className="vnext-storyboard-empty">
          <span>◉</span>
          <h2>选择一个镜头开始导演</h2>
          <p>从左侧 Shot Rail 选择镜头，查看画面、动作和台词。</p>
        </div>
      </main>
    );
  const dialogue =
    shot.dialogue ||
    shot.voiceover ||
    shot.onScreenText ||
    "当前镜头没有独立台词";
  return (
    <main className="vnext-storyboard-canvas">
      <header className="vnext-storyboard-head">
        <div>
          <span>
            SHOT {String(shot.order).padStart(2, "0")} ·{" "}
            {shot.startTime.toFixed(1)}–{shot.endTime.toFixed(1)}s
          </span>
          <h2>
            {shot.onScreenText || shot.dialogue || stageLabel(shot.stage)}
          </h2>
        </div>
        {shot.locked ? <small aria-label="镜头已锁定">🔒 已锁定</small> : null}
      </header>
      <div className="vnext-storyboard-visual">
        <DirectorShotImage
          shot={shot}
          input={input}
          visualStyle={visualStyle}
          projectId={projectId}
          onNavigate={onNavigateImages}
        />
      </div>
      <section className="vnext-shot-summary" aria-label="当前镜头导演信息">
        <article>
          <span>动作</span>
          <p>
            {shot.talentAction || shot.productAction || "保持当前镜头动作连续"}
          </p>
        </article>
        <article>
          <span>台词</span>
          <p>{dialogue}</p>
        </article>
        <article>
          <span>视觉重点</span>
          <p>
            {shot.visualDescription ||
              shot.proofRequirement ||
              "尚未填写视觉重点"}
          </p>
        </article>
      </section>
      <footer>
        <span>{cameraLabel(shot.framing)}</span>
        <span>{cameraLabel(shot.cameraAngle)}</span>
        <span>{cameraLabel(shot.cameraMovement)}</span>
      </footer>
    </main>
  );
}
