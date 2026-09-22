import Image from "next/image";

export default function FrameCard({
  kind,
  title,
  imageUrl,
  onGenerate,
  onOpen,
  onDownload,
  onEdit,
}: {
  kind: "start" | "end";
  title: string;
  imageUrl?: string;
  onGenerate: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onEdit: () => void;
}) {
  return (
    <article className={`vnext-frame-card is-${kind}`}>
      <header>
        <span aria-hidden="true">{kind === "start" ? "◧" : "◇"}</span>
        <h2>{title} <small>({kind === "start" ? "Start Frame" : "End Frame"})</small></h2>
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
          </>
        ) : (
          <div>
            <span className="vnext-frame-placeholder-mark" aria-hidden="true">✧</span>
            <b>尚未生成{title}</b>
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
      <footer>
        <button type="button" onClick={onGenerate}><span aria-hidden="true">⟳</span>{imageUrl ? "重新生成" : "生成画面"}</button>
        <button type="button" onClick={onEdit}><span aria-hidden="true">✎</span>编辑</button>
        <button type="button" onClick={onDownload} disabled={!imageUrl}><span aria-hidden="true">⇩</span>下载</button>
        <details><summary aria-label="更多操作">···</summary><button type="button" onClick={onOpen} disabled={!imageUrl}>查看大图</button></details>
      </footer>
    </article>
  );
}
