import type {
  AiProviderType,
  ImprovementAction,
  LanguageOption,
  OllamaEndpointType,
  SelectOption,
  TextPilotSettings,
  ToneOption
} from "./types";

export const MESSAGE_IMPROVE_TEXT = "TEXTPILOT_IMPROVE_TEXT" as const;
export const MESSAGE_OPEN_REVIEW_PANEL = "TEXTPILOT_OPEN_REVIEW_PANEL" as const;
export const MESSAGE_PING = "TEXTPILOT_PING" as const;
export const MESSAGE_PONG = "TEXTPILOT_PONG" as const;
export const COMMAND_OPEN_PANEL = "textpilot-open-panel" as const;
export const COMMAND_SHORTCUT_STORAGE_KEY = "textpilotCommandShortcut" as const;
export const COMMAND_SHORTCUT_MISSING_STORAGE_KEY = "textpilotCommandShortcutMissing" as const;

export const DEFAULT_SETTINGS: TextPilotSettings = {
  provider: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "",
  model: "openai/gpt-4o-mini",
  customPrompt: "",
  defaultLanguage: "auto",
  defaultTone: "profissional",
  sensitiveDataProtectionEnabled: true,
  floatingButtonEnabled: true,
  blockedDomains: [],
  allowedDomains: [],
  ollamaEndpointType: "chat"
};

export const PROVIDER_OPTIONS: SelectOption<AiProviderType>[] = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "gemini", label: "Google Gemini" },
  { value: "ollama", label: "Ollama/local" },
  { value: "custom-openai", label: "Endpoint customizado estilo OpenAI" }
];

export const OLLAMA_ENDPOINT_OPTIONS: SelectOption<OllamaEndpointType>[] = [
  { value: "chat", label: "Ollama /api/chat" },
  { value: "generate", label: "Ollama /api/generate" }
];

export const IMPROVEMENT_ACTIONS: SelectOption<ImprovementAction>[] = [
  { value: "clarity", label: "Melhorar clareza" },
  { value: "professional", label: "Tornar mais profissional" },
  { value: "objective", label: "Tornar mais objetivo" },
  { value: "grammar", label: "Corrigir gramatica" },
  { value: "friendly", label: "Tornar mais cordial" },
  { value: "summarize", label: "Resumir" },
  { value: "expand", label: "Expandir com mais contexto" },
  { value: "corporate-reply", label: "Transformar em resposta corporativa" },
  { value: "technical-support", label: "Transformar em mensagem de suporte tecnico" },
  { value: "professional-email", label: "Transformar em e-mail profissional" }
];

export const LANGUAGE_OPTIONS: SelectOption<LanguageOption>[] = [
  { value: "auto", label: "Auto-detectar" },
  { value: "pt-BR", label: "Portugues" },
  { value: "en-US", label: "Ingles" }
];

export const TONE_OPTIONS: SelectOption<ToneOption>[] = [
  { value: "profissional", label: "Profissional" },
  { value: "direto", label: "Direto" },
  { value: "cordial", label: "Cordial" },
  { value: "tecnico", label: "Tecnico" },
  { value: "comercial", label: "Comercial" },
  { value: "suporte", label: "Suporte ao cliente" },
  { value: "formal", label: "Formal" },
  { value: "neutro", label: "Neutro" }
];

export const PROVIDER_BASE_URL_HINTS: Record<AiProviderType, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  ollama: "http://localhost:11434",
  "custom-openai": "https://api.openai.com/v1"
};

export const PROVIDER_MODEL_HINTS: Record<AiProviderType, string> = {
  openrouter: "openai/gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  ollama: "llama3.1",
  "custom-openai": "gpt-4o-mini"
};

export const PROVIDER_HELP_LINKS: Partial<Record<AiProviderType, { label: string; url: string }>> = {
  openrouter: {
    label: "Chaves OpenRouter",
    url: "https://openrouter.ai/workspaces/default/keys"
  },
  gemini: {
    label: "Chaves Google Gemini",
    url: "https://aistudio.google.com/app/api-keys"
  },
  ollama: {
    label: "Docs API Ollama",
    url: "https://docs.ollama.com/api"
  }
};
