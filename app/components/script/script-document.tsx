"use client";

import { useMemo, useState } from "react";
import type { StudioScript } from "../../script-studio";

export type ScriptDocumentBlock = {
  key: string;
  label: string;
  type: string;
  duration: string;
  text: string;
};

type ScriptDocumentProps = {
  script: StudioScript;
  blocks: ScriptDocumentBlock[];
  selectedKey: string;
  editingKey: string | null;
  locked: Record<string, boolean>;
  busy: boolean;
  onSelect: (key: string) => void;
  onToggleEdit: (key: string) => void;
  onChange: (key: string, value: string) => void;
  onRewrite: (key: string, action: string) => void;
  onCopy: (value: string) => void;
  onToggleLock: (key: string) => void;
};

type ScriptView = "text" | "shots";

function InlineToolbar({
  block,
  editing,
  locked,
  busy,
  onToggleEdit,
  onRewrite,
  onCopy,
  onToggleLock,
}: {
  block: ScriptDocumentBlock;
  editing: boolean;
  locked: boolean;
  busy: boolean;
  onToggleEdit: () => void;
  onRewrite: () => void;
  onCopy: () => void;
  onToggleLock: () => void;
}) {
  return (
    <div className="vnext-inline-toolbar" aria-label={`${block.label}操作`}>
      <button type="button" onClick={onToggleEdit}>
        {editing ? "完成" : "编辑"}
      </button>
      <button type="button" disabled={busy || locked} onClick={onRewrite}>
        AI 精修
      </button>
      <details>
        <summary aria-label="更多操作">•••</summary>
        <div className="vnext-inline-more-menu">
          <button type="button" onClick={onCopy}>
            复制
          </button>
          <button type="button" onClick={onToggleLock}>
            {locked ? "解锁" : "锁定"}
          </button>
        </div>
      </details>
    </div>
  );
}

function EditableBlock({
  block,
  selected,
  editing,
  locked,
  busy,
  emphasis,
  onSelect,
  onToggleEdit,
  onChange,
  onRewrite,
  onCopy,
  onToggleLock,
}: {
  block: ScriptDocumentBlock;
  selected: boolean;
  editing: boolean;
  locked: boolean;
  busy: boolean;
  emphasis: "hook" | "body" | "cta";
  onSelect: () => void;
  onToggleEdit: () => void;
  onChange: (value: string) => void;
  onRewrite: () => void;
  onCopy: () => void;
  onToggleLock: () => void;
}) {
  return (
    <section
      className={`vnext-writing-block vnext-writing-block-${emphasis}${selected ? " is-selected" : ""}`}
      onClick={onSelect}
    >
      {editing ? (
        <textarea
          autoFocus
          value={block.text}
          aria-label={`编辑${block.label}`}
          onChange={(event) => onChange(event.target.value)}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <p>{block.text}</p>
      )}
      {selected ? (
        <InlineToolbar
          block={block}
          editing={editing}
          locked={locked}
          busy={busy}
          onToggleEdit={onToggleEdit}
          onRewrite={onRewrite}
          onCopy={onCopy}
          onToggleLock={onToggleLock}
        />
      ) : null}
    </section>
  );
}

function ScriptTextView(props: ScriptDocumentProps) {
  const hook = props.blocks.find((block) => block.key === "hook");
  const cta = props.blocks.find((block) => block.key === "cta");
  const body = props.blocks.filter(
    (block) => block.key !== "hook" && block.key !== "cta",
  );
  const proofNote =
    props.script.proofMechanism || props.script.shootingSuggestion;
  const renderBlock = (
    block: ScriptDocumentBlock,
    emphasis: "hook" | "body" | "cta",
  ) => (
    <EditableBlock
      key={block.key}
      block={block}
      selected={props.selectedKey === block.key}
      editing={props.editingKey === block.key}
      locked={Boolean(props.locked[block.key])}
      busy={props.busy}
      emphasis={emphasis}
      onSelect={() => props.onSelect(block.key)}
      onToggleEdit={() => props.onToggleEdit(block.key)}
      onChange={(value) => props.onChange(block.key, value)}
      onRewrite={() =>
        props.onRewrite(
          block.key,
          block.key === "hook" ? "优化 Hook" : "更像真人",
        )
      }
      onCopy={() => props.onCopy(block.text)}
      onToggleLock={() => props.onToggleLock(block.key)}
    />
  );

  return (
    <div className="vnext-script-text-view">
      {hook ? (
        <div className="vnext-document-section">
          <span className="vnext-section-marker">Hook</span>
          {renderBlock(hook, "hook")}
        </div>
      ) : null}
      <div className="vnext-document-section vnext-body-section">
        <span className="vnext-section-marker">口播正文</span>
        <div className="vnext-spoken-paragraphs">
          {body.map((block) => renderBlock(block, "body"))}
        </div>
      </div>
      {proofNote ? (
        <aside className="vnext-proof-note">
          <span>视觉证明</span>
          <p>{proofNote}</p>
        </aside>
      ) : null}
      {cta ? (
        <div className="vnext-document-section vnext-cta-section">
          <span className="vnext-section-marker">CTA</span>
          {renderBlock(cta, "cta")}
        </div>
      ) : null}
    </div>
  );
}

function ShotBreakdownView({ script }: { script: StudioScript }) {
  return (
    <div className="vnext-shot-breakdown">
      {script.scenes.map((scene, index) => (
        <article className="vnext-shot-row" key={`${scene.time}-${index}`}>
          <div className="vnext-shot-index">
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <span>{scene.time}</span>
          </div>
          <div className="vnext-shot-core">
            <div>
              <span>视觉</span>
              <p>{scene.visual}</p>
            </div>
            <div>
              <span>台词</span>
              <p>{scene.line}</p>
            </div>
          </div>
          {scene.edit ? (
            <details className="vnext-shot-detail">
              <summary>展开</summary>
              <div>
                <span>剪辑提示</span>
                <p>{scene.edit}</p>
              </div>
            </details>
          ) : null}
        </article>
      ))}
    </div>
  );
}

/** VNext presentation only: every field comes from the existing public Script contract. */
export default function ScriptDocument(props: ScriptDocumentProps) {
  const [view, setView] = useState<ScriptView>("text");
  const context = useMemo(
    () =>
      [props.script.country, "TikTok", props.script.language]
        .filter(Boolean)
        .join(" · "),
    [props.script.country, props.script.language],
  );
  return (
    <article className="vnext-script-document creative-script-document vnext-script-canvas">
      <header className="vnext-document-header">
        <div>
          <strong>{props.script.style || "KOC / UGC"}</strong>
          <span>{context}</span>
        </div>
        <div
          className="vnext-script-view-tabs"
          role="tablist"
          aria-label="脚本文档视图"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "text"}
            className={view === "text" ? "is-active" : ""}
            onClick={() => setView("text")}
          >
            脚本文本
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "shots"}
            className={view === "shots" ? "is-active" : ""}
            onClick={() => setView("shots")}
          >
            镜头拆解
          </button>
        </div>
      </header>
      {view === "text" ? (
        <ScriptTextView {...props} />
      ) : (
        <ShotBreakdownView script={props.script} />
      )}
    </article>
  );
}
