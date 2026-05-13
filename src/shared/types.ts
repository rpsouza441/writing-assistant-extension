export type AiProviderType = "openrouter" | "gemini" | "ollama" | "custom-openai";

export type OllamaEndpointType = "chat" | "generate";

export type ImprovementAction =
  | "clarity"
  | "professional"
  | "objective"
  | "grammar"
  | "friendly"
  | "summarize"
  | "expand"
  | "corporate-reply"
  | "technical-support"
  | "professional-email";

export type LanguageOption = "auto" | "pt-BR" | "en-US";

export type ToneOption =
  | "profissional"
  | "direto"
  | "cordial"
  | "tecnico"
  | "comercial"
  | "suporte"
  | "formal"
  | "neutro";

export interface SelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

export interface TextPilotSettings {
  provider: AiProviderType;
  baseUrl: string;
  apiKey: string;
  model: string;
  customPrompt: string;
  defaultLanguage: LanguageOption;
  defaultTone: ToneOption;
  sensitiveDataProtectionEnabled: boolean;
  floatingButtonEnabled: boolean;
  blockedDomains: string[];
  allowedDomains: string[];
  ollamaEndpointType: OllamaEndpointType;
}

export interface ImproveTextRequest {
  text: string;
  action: ImprovementAction;
  language: LanguageOption;
  tone: ToneOption;
}

export interface ImproveTextResponse {
  text: string;
  provider: AiProviderType;
  model: string;
}

export type SensitiveDataSeverity = "block" | "warn";

export interface SensitiveDataFinding {
  type: string;
  label: string;
  severity: SensitiveDataSeverity;
  sample?: string;
}

export interface SensitiveDataScanResult {
  allowed: boolean;
  hasBlocks: boolean;
  hasWarnings: boolean;
  findings: SensitiveDataFinding[];
}

export interface ImproveTextRuntimeMessage {
  type: "TEXTPILOT_IMPROVE_TEXT";
  payload: ImproveTextRequest;
}

export interface OpenReviewPanelRuntimeMessage {
  type: "TEXTPILOT_OPEN_REVIEW_PANEL";
  payload?: {
    selectedText?: string;
  };
}

export interface PingRuntimeMessage {
  type: "TEXTPILOT_PING";
}

export type RuntimeMessage = ImproveTextRuntimeMessage | OpenReviewPanelRuntimeMessage | PingRuntimeMessage;

export interface OpenPanelResponse {
  opened: boolean;
  message: string;
}

export type RuntimeResponse<TData> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: string;
      code?: string;
    };
