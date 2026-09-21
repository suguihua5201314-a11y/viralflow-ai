import Image from "next/image";
import PromptEditor from "./prompt-editor";

export default function FrameCard({
  kind,
  title,
  imageUrl,
  prompt,
  automaticPrompt,
  onPromptChange,
  onGenerate,
  onOpen,
}: {
  kind: "start" | "end";
  title: string;
  imageUrl?: string;
  prompt: string;
  automaticPrompt: string;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  onOpen: () => void;
}) {
  return (
    <article className={`vnext-frame-card is-${kind}`}>
      <header>
        <span>{kind === "start" ? "START FRAME" : "END FRAME"}</span>
        <h2>{title}</h2>
      </header>
      <div className="vnext-frame-preview">
        {imageUrl ? (
          <>
            <button
              type="button"
              onClick={onOpen}
              aria-label={`查看${title}大图`}
            >
              <Image
                src={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 900px) 90vw, 420px"
                unoptimized
              />
            </button>
            <nav>
              <button type="button" onClick={onGenerate}>
                重新生成
              </button>
              <button type="button" onClick={onOpen}>
                查看大图
              </button>
            </nav>
          </>
        ) : (
          <div>
            <span>✦</span>
            <b>{title}尚未生成</b>
            <p>使用当前导演镜头与提示词进入现有视觉创作工作台。</p>
            <button
              type="button"
              className="vf-button vf-button-secondary"
              onClick={onGenerate}
            >
              生成{title} →
            </button>
          </div>
        )}
      </div>
      <PromptEditor
        label={`${title}提示词`}
        value={prompt}
        automaticValue={automaticPrompt}
        onChange={onPromptChange}
        compact
      />
    </article>
  );
}
