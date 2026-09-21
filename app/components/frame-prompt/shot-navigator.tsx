import Image from "next/image";
import type { WorkspaceShot } from "../../director-workspace";

export default function FrameShotNavigator({
  shots,
  selected,
  previews,
  onSelect,
}: {
  shots: WorkspaceShot[];
  selected: number;
  previews: Record<string, string>;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className="vnext-frame-shot-nav" aria-label="画面提示词分镜导航">
      <header>
        <span>DIRECTOR SHOTS</span>
        <h2>镜头</h2>
      </header>
      <div>
        {shots.map((shot, index) => {
          const imageUrl = previews[shot.shotId];
          return (
            <button
              type="button"
              key={shot.shotId}
              className={index === selected ? "is-selected" : ""}
              aria-current={index === selected ? "true" : undefined}
              onClick={() => onSelect(index)}
            >
              <i>
                {imageUrl ? (
                  <Image src={imageUrl} alt="" fill sizes="52px" unoptimized />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </i>
              <span>
                <b>Shot {String(index + 1).padStart(2, "0")}</b>
                <small>
                  {shot.startTime.toFixed(1)}–{shot.endTime.toFixed(1)}s
                </small>
                <em>{shot.visualDescription}</em>
              </span>
              <strong>{imageUrl ? "Has Image" : "Ready"}</strong>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
