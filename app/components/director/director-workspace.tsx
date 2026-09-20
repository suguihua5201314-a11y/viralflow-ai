import type { ReactNode } from "react";
import type { WorkspaceShot } from "../../director-workspace";
export default function DirectorWorkspace({
  shots,
  selected,
  onSelect,
  onReorder,
  preview,
  children,
  inspector,
  onToggleLock,
  onDuplicate,
  onDelete,
  brief: _brief,
}: {
  shots: WorkspaceShot[];
  selected: number | null;
  onSelect: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  preview: (shot: WorkspaceShot) => ReactNode;
  children: ReactNode;
  inspector: ReactNode;
  onToggleLock?: (index: number) => void;
  onDuplicate?: (index: number) => void;
  onDelete?: (index: number) => void;
  brief?: ReactNode;
}) {
  return (
    <div className="vnext-director-layout">
      <nav className="vnext-shot-rail" aria-label="Shot 分镜">
        <header>
          <span>SHOT RAIL</span>
          <h3>镜头列表</h3>
        </header>
        {shots.map((shot, index) => (
          <article
            className={`vnext-shot-card${index === selected ? " is-selected" : ""}`}
            key={shot.shotId}
            draggable
            onDragStart={(event) =>
              event.dataTransfer.setData("text/x-shot-index", String(index))
            }
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const value = event.dataTransfer.getData("text/x-shot-index");
              if (/^\d+$/.test(value)) onReorder(Number(value), index);
            }}
          >
            <button
              type="button"
              className="vnext-shot-card-main"
              aria-pressed={index === selected}
              onClick={() => onSelect(index)}
            >
              {preview(shot)}
              <span>
                <b>Shot {String(index + 1).padStart(2, "0")}</b>
                <small>
                  {shot.startTime.toFixed(1)}–{shot.endTime.toFixed(1)}s
                </small>
                <span>{shot.visualDescription}</span>
              </span>
            </button>
            <footer>
              <span>
                {shot.locked
                  ? "Locked"
                  : shot.status === "Shot"
                    ? "Image Ready"
                    : shot.status}
              </span>
              {onDuplicate && onToggleLock && onDelete ? (
                <details>
                  <summary aria-label={`Shot ${index + 1} 更多操作`}>
                    •••
                  </summary>
                  <div>
                    <button type="button" onClick={() => onDuplicate(index)}>
                      复制
                    </button>
                    <button type="button" onClick={() => onToggleLock(index)}>
                      {shot.locked ? "解锁" : "锁定"}
                    </button>
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => onDelete(index)}
                    >
                      删除
                    </button>
                  </div>
                </details>
              ) : null}
            </footer>
          </article>
        ))}
      </nav>
      {children}
      {inspector}
    </div>
  );
}
