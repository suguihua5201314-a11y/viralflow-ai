"use client";

import type { CreativeBriefV2 } from "../../creative-contract";
import type { CreativeDirectionSession } from "../../creative-direction-state";
import type { ScriptCriticAcceptanceState } from "../../script-critic-acceptance";
import type { ScriptWriterAcceptanceState } from "../../script-writer-acceptance";
import CreativeDirectionWorkspace from "../script/creative-direction-workspace";

type Props = {
  product: { name: string; market: string; platform: string; truths: string[] };
  session: CreativeDirectionSession;
  currentBrief: CreativeBriefV2 | null;
  disabled: boolean;
  onGenerate: () => void;
  onSelect: (opportunityId: string) => void;
  onContinueToScript: () => void;
  acceptanceEnabled: boolean;
  acceptanceActive: boolean;
  onActivateAcceptance: () => void;
  writerAcceptanceEnabled: boolean;
  writerAcceptance: ScriptWriterAcceptanceState;
  onTestWriter: () => void;
  criticAcceptanceEnabled: boolean;
  criticAcceptance: ScriptCriticAcceptanceState;
  onTestCritic: () => void;
};

export default function CreativeStage({ product, ...props }: Props) {
  return <main className="creative-stage" data-production-stage="creative">
    <header className="creative-stage-heading">
      <div><span>02 · CREATIVE</span><h1>这条商品视频准备从什么方向拍？</h1><p>选择一个最值得执行的方向，ViralFlow 会据此建立创意简报。</p></div>
      <aside aria-label="当前商品摘要"><b>{product.name}</b><span>{product.market} · {product.platform}</span>{product.truths.length > 0 && <small>{product.truths.slice(0, 3).join(" · ")}</small>}</aside>
    </header>
    <CreativeDirectionWorkspace {...props}/>
  </main>;
}
