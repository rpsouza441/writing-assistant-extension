import { DEFAULT_SETTINGS, PROVIDER_BASE_URL_HINTS, PROVIDER_MODEL_HINTS } from "../shared/constants";
import type {
  AiProviderType,
  LanguageOption,
  OllamaEndpointType,
  TextPilotSettings,
  ToneOption
} from "../shared/types";

type RawSettings = Partial<TextPilotSettings> & Record<string, unknown>;

export async function getSettings(): Promise<TextPilotSettings> {
  const stored = await chromeStorageGet(DEFAULT_SETTINGS);
  return normalizeSettings(stored);
}

export async function saveSettings(settings: Partial<TextPilotSettings>): Promise<TextPilotSettings> {
  const current = await getSettings();
  const next = normalizeSettings({ ...current, ...settings });

  await chromeStorageSet(next);
  return next;
}

export async function resetSettings(): Promise<TextPilotSettings> {
  await chromeStorageSet(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export function normalizeSettings(raw: RawSettings): TextPilotSettings {
  const provider = normalizeProvider(raw.provider);

  return {
    provider,
    baseUrl: normalizeText(raw.baseUrl, PROVIDER_BASE_URL_HINTS[provider]),
    apiKey: normalizeText(raw.apiKey, ""),
    model: normalizeText(raw.model, PROVIDER_MODEL_HINTS[provider]),
    customPrompt: normalizeText(raw.customPrompt, ""),
    defaultLanguage: normalizeLanguage(raw.defaultLanguage),
    defaultTone: normalizeTone(raw.defaultTone),
    sensitiveDataProtectionEnabled: raw.sensitiveDataProtectionEnabled !== false,
    floatingButtonEnabled: raw.floatingButtonEnabled !== false,
    blockedDomains: normalizeList(raw.blockedDomains),
    allowedDomains: normalizeList(raw.allowedDomains),
    ollamaEndpointType: normalizeOllamaEndpointType(raw.ollamaEndpointType)
  };
}

export function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(/[\n,;]/g))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,;]/g)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeProvider(value: unknown): AiProviderType {
  if (value === "openrouter" || value === "gemini" || value === "ollama" || value === "custom-openai") {
    return value;
  }

  return DEFAULT_SETTINGS.provider;
}

function normalizeLanguage(value: unknown): LanguageOption {
  if (value === "auto" || value === "pt-BR" || value === "en-US") {
    return value;
  }

  return DEFAULT_SETTINGS.defaultLanguage;
}

function normalizeTone(value: unknown): ToneOption {
  if (
    value === "profissional" ||
    value === "direto" ||
    value === "cordial" ||
    value === "tecnico" ||
    value === "comercial" ||
    value === "suporte" ||
    value === "formal" ||
    value === "neutro"
  ) {
    return value;
  }

  return DEFAULT_SETTINGS.defaultTone;
}

function normalizeOllamaEndpointType(value: unknown): OllamaEndpointType {
  if (value === "chat" || value === "generate") {
    return value;
  }

  return DEFAULT_SETTINGS.ollamaEndpointType;
}

function chromeStorageGet(defaults: TextPilotSettings): Promise<RawSettings> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(defaults, (items) => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(items as RawSettings);
    });
  });
}

function chromeStorageSet(settings: TextPilotSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(settings, () => {
      const error = chrome.runtime.lastError;

      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve();
    });
  });
}
