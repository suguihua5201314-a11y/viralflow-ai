"use client";

import { useState } from "react";

export default function PromptEditor({
  label,
  id,
  value,
  automaticValue,
  onChange,
  compact = false,
}: {
  label: string;
  id?: string;
  value: string;
  automaticValue: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [copied, setCopied] = useState(false);

  function startEditing() {
    setDraft(value);
    setEditing(true);
  }

  function save() {
    onChange(draft.trim() || automaticValue);
    setEditing(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      id={id}
      className={`vnext-frame-prompt-editor${compact ? " is-compact" : ""}`}
    >
      <header>
        <h3>{label}</h3>
        <nav aria-label={`${label}操作`}>
          <button type="button" onClick={editing ? save : startEditing}>
            {editing ? "保存" : "编辑"}
          </button>
          {editing ? (
            <button type="button" onClick={() => setEditing(false)}>
              取消
            </button>
          ) : null}
          <button type="button" onClick={() => void copy()}>
            {copied ? "已复制" : "复制"}
          </button>
          <details>
            <summary>更多</summary>
            <button
              type="button"
              disabled
              title="AI Prompt Enhancement 将在 Provider 接入后开放"
            >
              AI 优化
            </button>
            <button type="button" onClick={() => onChange(automaticValue)}>
              恢复自动版本
            </button>
          </details>
        </nav>
      </header>
      {editing ? (
        <textarea
          aria-label={`${label}编辑器`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={compact ? 6 : 9}
          autoFocus
        />
      ) : (
        <p>{value}</p>
      )}
    </section>
  );
}
