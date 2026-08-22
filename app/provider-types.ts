export type ProviderId="deepseek"|"doubao"|"openai";
export type ProviderErrorType="unauthorized"|"invalid_model_or_endpoint"|"provider_http_error"|"rate_limit"|"timeout"|"json_parse_error"|"schema_validation_error"|"empty_result"|"missing_field"|"structured_fields_missing"|"strategy_validation_error"|"fact_validation_error";
export type ProviderStatus={id:ProviderId;label:string;configured:boolean;state:"connected"|"unconfigured";model:string|null;baseUrl:string|null;missingFields:string[]};
export type ProviderRunMetadata={providerRequested:ProviderId;providerUsed:ProviderId|"local";aiGenerated:boolean;fallbackUsed:boolean;providerErrorType:ProviderErrorType|null;responseTimeMs:number|null};
