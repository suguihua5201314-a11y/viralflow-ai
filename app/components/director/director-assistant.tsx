import type { ReactNode } from "react";

type DirectorAssistantProps = {
  title: string;
  strategy: ReactNode;
  camera: ReactNode;
  proof: ReactNode;
  check: ReactNode;
  advanced: ReactNode;
  suggestions?: ReactNode;
};

function AssistantSection({
  title,
  children,
  open = false,
}: {
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="vnext-director-assistant-section" open={open}>
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

export default function DirectorAssistant({
  title,
  strategy,
  camera,
  proof,
  check,
  advanced,
  suggestions,
}: DirectorAssistantProps) {
  return (
    <aside className="vnext-director-assistant" aria-label="AI 导演助手">
      <header>
        <span>✨ AI 导演助手</span>
        <h3>{title}</h3>
      </header>
      <AssistantSection title="镜头策略" open>
        {strategy}
      </AssistantSection>
      <AssistantSection title="摄影设计" open>
        {camera}
      </AssistantSection>
      <AssistantSection title="Proof 设计">{proof}</AssistantSection>
      <AssistantSection title="镜头检查">{check}</AssistantSection>
      <AssistantSection title="高级设置">{advanced}</AssistantSection>
      {suggestions ? (
        <section className="vnext-director-suggestions">
          <header>
            <b>AI 导演建议</b>
            <span>最多展示 3 条关键建议</span>
          </header>
          {suggestions}
        </section>
      ) : null}
    </aside>
  );
}
