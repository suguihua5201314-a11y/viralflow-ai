export const DEFAULT_WORKSPACE_LANGUAGE = "zh-CN" as const;

export type WorkspaceLanguage = typeof DEFAULT_WORKSPACE_LANGUAGE;

export type CreationLanguageContext = {
  workspaceLanguage: WorkspaceLanguage;
  targetLanguage: string;
  market: string;
  platform: string;
};

export type CreationLanguageContextSource = {
  workspaceLanguage?: WorkspaceLanguage;
  targetLanguage?: string;
  language?: string;
  market?: string;
  platform?: string;
};

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function resolveCreationLanguageContext(source: CreationLanguageContextSource): CreationLanguageContext {
  return {
    workspaceLanguage: source.workspaceLanguage ?? DEFAULT_WORKSPACE_LANGUAGE,
    targetLanguage: clean(source.targetLanguage) || clean(source.language) || DEFAULT_WORKSPACE_LANGUAGE,
    market: clean(source.market),
    platform: clean(source.platform),
  };
}
