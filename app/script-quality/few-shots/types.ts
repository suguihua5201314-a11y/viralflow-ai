import type { WriterDraft } from "../types";

export type FewShotStatus = "curated-draft" | "approved" | "retired";

export type ScriptQualityFewShot = {
  id:string;
  title:string;
  status:FewShotStatus;
  market:string;
  platform:string;
  productCategory:string;
  contentFormat:string;
  creatorPersona:string;
  hookMechanism:string;
  openingVisual:string;
  primarySellingPoint:string;
  proofMechanism:string;
  ctaStyle:string;
  language:string;
  tags:string[];
  example:WriterDraft;
  whyItWorks:string[];
  doNotCopyLiterally:string[];
};

export type FewShotQuery = {
  market?:string;
  platform?:string;
  productCategory?:string;
  contentFormat?:string;
  creatorPersona?:string;
  hookMechanism?:string;
  primarySellingPoint?:string;
  proofMechanism?:string;
  language?:string;
};

export type FewShotSelectionOptions = {
  limit?:number;
  statuses?:FewShotStatus[];
};
