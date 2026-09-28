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

export type InternalCreativeLanguageIssue = {
  code: "internal_language_mismatch";
  path: string;
};

export function validateInternalCreativeLanguage(
  fields: Array<{ path: string; text?: string }>,
  workspaceLanguage: WorkspaceLanguage,
): InternalCreativeLanguageIssue[] {
  if (workspaceLanguage !== DEFAULT_WORKSPACE_LANGUAGE) return [];
  return fields
    .filter(({ text }) => Boolean(text?.trim()) && !/\p{Script=Han}/u.test(text!))
    .map(({ path }) => ({ code: "internal_language_mismatch" as const, path }));
}
