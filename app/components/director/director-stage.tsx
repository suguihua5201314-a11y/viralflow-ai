"use client";

import { useState } from "react";
import type { WorkspaceShot } from "../../director-workspace";

type ScriptSummary = {
  title: string;
  hook: string;
  duration: number;
  sceneCount: number;
};

type DirectorStageProps = {
  script: ScriptSummary;
  shots: WorkspaceShot[];
  selected: number | null;
  busy: boolean;
  error: string;
  diagnostics: string[];
  modificationPreview?: { index: number; before: WorkspaceShot; after: WorkspaceShot } | null;
  cameraLabel: (value: string) => string;
  onGenerate: () => void;
  onRegenerate: () => void;
  onSelect: (index: number) => void;
  onModify: (index: number, instruction: string) => Promise<void>;
  onAcceptModification: () => void;
  onDismissModification: () => void;
  onReturnToScript: () => void;
  onContinueToImages: () => void;
};

const displayText = (...values: Array<string | undefined>) =>
  values.find((value) => value?.trim())?.trim() || "—";

function ShotRow({
  shot,
  index,
  selected,
  busy,
  cameraLabel,
  onSelect,
  onModify,
}: {
  shot: WorkspaceShot;
  index: number;
  selected: boolean;
  busy: boolean;
  cameraLabel: (value: string) => string;
  onSelect: () => void;
  onModify: (instruction: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState("");
  const action = displayText(shot.talentAction, shot.productAction);
  const dialogue = displayText(shot.dialogue, shot.voiceover, shot.onScreenText);
  const productTask = displayText(shot.proofRequirement, shot.productAction);

  return (
    <article
      className={`ux4-shot-card${selected ? " is-selected" : ""}`}
      data-shot-id={shot.shotId}
    >
      <button className="ux4-shot-card-select" type="button" onClick={onSelect}>
        <span>镜头 {String(index + 1).padStart(2, "0")}</span>
        <b>{shot.startTime.toFixed(1)}–{shot.endTime.toFixed(1)}s</b>
      </button>
      <div className="ux4-shot-card-grid">
        <section className="ux4-shot-visual">
          <span>画面</span>
          <p>{displayText(shot.visualDescription)}</p>
        </section>
        <section>
          <span>动作</span>
          <p>{action}</p>
        </section>
        <section>
          <span>台词 / 口播</span>
          <p>{dialogue}</p>
        </section>
        <section className="ux4-shot-proof">
          <span>产品任务</span>
          <p>{productTask}</p>
        </section>
      </div>
      <div className="ux4-shot-secondary">
        <span>{shot.purpose}</span>
        {shot.continuityNotes ? <span>{shot.continuityNotes}</span> : null}
      </div>
      <div className="ux4-shot-actions">
        <button type="button" onClick={() => setEditing((value) => !value)}>
          修改镜头
        </button>
        <details>
          <summary>查看镜头详情</summary>
          <dl>
            <div><dt>景别</dt><dd>{cameraLabel(shot.framing)}</dd></div>
            <div><dt>机位</dt><dd>{cameraLabel(shot.cameraAngle)}</dd></div>
            <div><dt>镜头运动</dt><dd>{cameraLabel(shot.cameraMovement)}</dd></div>
            <div><dt>构图 / 字幕</dt><dd>{displayText(shot.onScreenText)}</dd></div>
            <div><dt>转场</dt><dd>{displayText(shot.transition)}</dd></div>
            <div><dt>剪辑</dt><dd>{displayText(shot.editingNotes)}</dd></div>
            <div><dt>声音</dt><dd>{displayText(shot.audioSfx)}</dd></div>
            <div><dt>道具 / 环境</dt><dd>{shot.props.join("、") || "—"} · {displayText(shot.environment)}</dd></div>
            <div><dt>连续性</dt><dd>{displayText(shot.continuityNotes)}</dd></div>
          </dl>
        </details>
      </div>
      {editing ? (
        <form
          className="ux4-shot-modify"
          onSubmit={(event) => {
            event.preventDefault();
            if (!instruction.trim()) return;
            void onModify(instruction.trim()).then(() => {
              setInstruction("");
              setEditing(false);
            });
          }}
        >
          <label htmlFor={`modify-${shot.shotId}`}>告诉 AI 你想怎么修改这个镜头</label>
          <textarea
            id={`modify-${shot.shotId}`}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="例如：这个镜头改成手持近景，产品再明显一点"
          />
          <button className="vf-button vf-button-secondary" type="submit" disabled={busy || !instruction.trim()}>
            生成修改方案
          </button>
        </form>
      ) : null}
    </article>
  );
}

export default function DirectorStage({
  script,
  shots,
  selected,
  busy,
  error,
  diagnostics,
  modificationPreview,
  cameraLabel,
  onGenerate,
  onRegenerate,
  onSelect,
  onModify,
  onAcceptModification,
  onDismissModification,
  onReturnToScript,
  onContinueToImages,
}: DirectorStageProps) {
  const hasShots = shots.length > 0;
  return (
    <main className="ux4-director-stage" data-production-stage="director">
      <header className="ux4-director-header">
        <div>
          <span>04 · 导演</span>
          <h1>把脚本拆成可以直接执行的镜头</h1>
          <p>确认每个镜头拍什么、怎么动、说什么，以及产品需要证明什么。</p>
        </div>
        <button type="button" onClick={onReturnToScript}>返回修改脚本</button>
      </header>

      <section className="ux4-script-summary" aria-label="当前脚本摘要">
        <div><span>当前脚本</span><h2>{script.title}</h2></div>
        <div><span>Hook</span><p>{script.hook || "当前脚本未提供独立 Hook"}</p></div>
        <dl>
          <div><dt>总时长</dt><dd>{script.duration} 秒</dd></div>
          <div><dt>场景</dt><dd>{script.sceneCount} 个</dd></div>
        </dl>
      </section>

      {!hasShots ? (
        <section className="ux4-director-empty" aria-busy={busy}>
          {busy ? (
            <div className="ux4-generation-progress">
              <span className="ux4-spinner" />
              <h2>正在生成镜头</h2>
              <p>正在分析脚本…</p>
              <p>正在拆分镜头…</p>
              <p>正在完善画面和动作…</p>
            </div>
          ) : (
            <>
              <h2>{error ? "镜头没有成功生成" : "脚本已准备好"}</h2>
              <p>{error || "生成后，你可以按顺序查看并修改每一个镜头。"}</p>
              <button className="vf-button vf-button-primary" type="button" onClick={onGenerate}>
                生成镜头
              </button>
            </>
          )}
        </section>
      ) : (
        <>
          <section className="ux4-shot-list" aria-label="镜头表">
            <header><div><span>镜头表</span><h2>{shots.length} 个镜头 · 按拍摄顺序</h2></div></header>
            {shots.map((shot, index) => (
              <ShotRow
                key={shot.shotId}
                shot={shot}
                index={index}
                selected={selected === index}
                busy={busy}
                cameraLabel={cameraLabel}
                onSelect={() => onSelect(index)}
                onModify={(value) => onModify(index, value)}
              />
            ))}
          </section>
          {modificationPreview ? (
            <section className="ux4-modification-preview" aria-label="镜头修改预览">
              <div>
                <span>镜头 {String(modificationPreview.index + 1).padStart(2, "0")} 修改预览</span>
                <h3>确认后才会替换当前镜头</h3>
              </div>
              <dl>
                <div><dt>修改前</dt><dd>{modificationPreview.before.visualDescription}</dd></div>
                <div><dt>修改后</dt><dd>{modificationPreview.after.visualDescription}</dd></div>
              </dl>
              <footer>
                <button type="button" onClick={onDismissModification}>放弃修改</button>
                <button className="vf-button vf-button-secondary" type="button" onClick={onAcceptModification}>采用修改</button>
              </footer>
            </section>
          ) : null}
          <footer className="ux4-director-footer">
            <div>
              <button type="button" disabled={busy} onClick={onRegenerate}>重新生成镜头</button>
              <details>
                <summary>诊断详情</summary>
                <p>{diagnostics.length ? diagnostics.join("；") : "镜头结构与当前脚本一致。"}</p>
              </details>
            </div>
            <button className="vf-button vf-button-primary" type="button" onClick={onContinueToImages}>
              确认镜头并进入图片
            </button>
          </footer>
        </>
      )}
    </main>
  );
}
