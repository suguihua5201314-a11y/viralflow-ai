import Image from "next/image";
import type { ReactNode } from "react";
import type { ImageAsset } from "../../image-assets";
import { EmptyState, VersionRail } from "../workspace/workspace";

export default function ImageStudioWorkspace({ asset, assets, onSelect, onOpen, onUse, onRegenerate, busy, context }: {
  asset: ImageAsset | null; assets: ImageAsset[]; onSelect: (id: string) => void; onOpen: () => void;
  onUse: (asset: ImageAsset) => void; onRegenerate: (asset: ImageAsset) => void; busy: boolean; context: ReactNode;
}) {
  return <section className="creative-image-studio"><div className="creative-source">{context}</div>
    {asset ? <><button className="creative-image-canvas" onClick={onOpen} aria-label="查看当前图片大图"><Image src={asset.imageUrl} alt={asset.prompt} fill sizes="(max-width: 900px) 95vw, 65vw" unoptimized /></button><div className="creative-toolbar"><span>{asset.metadata?.sourceReference?.shotId || "项目视觉素材"}</span><button onClick={() => onUse(asset)}>使用提示词</button><button disabled={busy} onClick={() => onRegenerate(asset)}>重新生成</button></div></> : <EmptyState title="开始创建视觉素材">从导演分镜进入，或在图片生成器中输入提示词。</EmptyState>}
    <h3>版本与项目图片</h3><VersionRail>{assets.map((item, index) => <button key={item.id} aria-pressed={item.id === asset?.id} onClick={() => onSelect(item.id)}><span className="creative-version-image"><Image src={item.imageUrl} alt={item.prompt} fill sizes="96px" unoptimized /></span><span>版本 {assets.length - index}</span><small>{item.metadata?.sourceReference?.shotId || "独立创作"}</small></button>)}</VersionRail>
  </section>;
}
