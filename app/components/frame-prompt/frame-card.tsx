import Image from "next/image";

export default function FrameCard({
  kind,
  title,
  imageUrl,
  onGenerate,
  onOpen,
  onDownload,
  onEdit,
  generating = false,
  error = "",
}: {
  kind: "start" | "end";
  title: string;
  imageUrl?: string;
  onGenerate: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onEdit: () => void;
  generating?: boolean;
  error?: string;
}) {
  return (
    <article className={`vnext-frame-card is-${kind} ${imageUrl ? "has-image" : "is-empty"}`} aria-busy={generating}>
      <header>
        <span aria-hidden="true">{kind === "start" ? "◧" : "◇"}</span>
        <h2>{title}</h2>
        {generating ? <em role="status">生成中…</em> : null}
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
        ) : generating ? (
          <div><span className="vnext-frame-placeholder-mark" aria-hidden="true">✦</span><b>正在生成{title}…</b></div>
        ) : (
          <div>
            <button
              type="button"
              className="vf-button vf-button-secondary"
              onClick={onGenerate}
              disabled={generating}
            >
              <span aria-hidden="true">＋</span> 生成{title}
            </button>
            <b>尚未生成</b>
          </div>
        )}
      </div>
      {error ? <p className="vnext-frame-generation-error" role="alert">{error}</p> : null}
      <footer>
        <button type="button" onClick={onGenerate} disabled={generating}><span aria-hidden="true">⟳</span>{generating ? "生成中…" : imageUrl ? "重新生成" : "生成画面"}</button>
        <button type="button" onClick={onEdit}><span aria-hidden="true">✎</span>编辑</button>
        <button type="button" onClick={onDownload} disabled={!imageUrl}><span aria-hidden="true">⇩</span>下载</button>
        <details><summary aria-label="更多操作">···</summary><button type="button" onClick={onOpen} disabled={!imageUrl}>查看大图</button></details>
      </footer>
    </article>
  );
}
