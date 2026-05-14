import {
  COMMAND_OPEN_PANEL,
  LANGUAGE_OPTIONS,
  OLLAMA_ENDPOINT_OPTIONS,
  PROVIDER_BASE_URL_HINTS,
  PROVIDER_HELP_LINKS,
  PROVIDER_MODEL_HINTS,
  PROVIDER_OPTIONS,
  TONE_OPTIONS
} from "../shared/constants";
import type { AiProviderType, LanguageOption, OllamaEndpointType, ToneOption } from "../shared/types";
import { getSettings, resetSettings, saveSettings } from "../storage/settings-store";

const form = query<HTMLFormElement>("#settingsForm");
const providerSelect = query<HTMLSelectElement>("#provider");
const baseUrlInput = query<HTMLInputElement>("#baseUrl");
const modelInput = query<HTMLInputElement>("#model");
const apiKeyInput = query<HTMLInputElement>("#apiKey");
const ollamaEndpointTypeSelect = query<HTMLSelectElement>("#ollamaEndpointType");
const providerHelpElement = query<HTMLParagraphElement>("#providerHelp");
const customPromptInput = query<HTMLTextAreaElement>("#customPrompt");
const defaultLanguageSelect = query<HTMLSelectElement>("#defaultLanguage");
const defaultToneSelect = query<HTMLSelectElement>("#defaultTone");
const sensitiveDataProtectionCheckbox = query<HTMLInputElement>("#sensitiveDataProtectionEnabled");
const floatingButtonCheckbox = query<HTMLInputElement>("#floatingButtonEnabled");
const blockedDomainsInput = query<HTMLTextAreaElement>("#blockedDomains");
const allowedDomainsInput = query<HTMLTextAreaElement>("#allowedDomains");
const resetButton = query<HTMLButtonElement>("#reset");
const openShortcutsButton = query<HTMLButtonElement>("#openShortcuts");
const statusElement = query<HTMLParagraphElement>("#status");
const shortcutStatusElement = query<HTMLParagraphElement>("#shortcutStatus");

fillOptions(providerSelect, PROVIDER_OPTIONS);
fillOptions(ollamaEndpointTypeSelect, OLLAMA_ENDPOINT_OPTIONS);
fillOptions(defaultLanguageSelect, LANGUAGE_OPTIONS);
fillOptions(defaultToneSelect, TONE_OPTIONS);

void load();
void loadShortcutStatus();

providerSelect.addEventListener("change", () => {
  const provider = providerSelect.value as AiProviderType;
  applyProviderDefaults(provider);
  renderProviderHelp(provider);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void save();
});

resetButton.addEventListener("click", () => {
  void reset();
});

openShortcutsButton.addEventListener("click", () => {
  void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

async function load(): Promise<void> {
  const settings = await getSettings();

  providerSelect.value = settings.provider;
  baseUrlInput.value = settings.baseUrl;
  baseUrlInput.placeholder = PROVIDER_BASE_URL_HINTS[settings.provider];
  modelInput.value = settings.model;
  modelInput.placeholder = PROVIDER_MODEL_HINTS[settings.provider];
  renderProviderHelp(settings.provider);
  apiKeyInput.value = settings.apiKey;
  ollamaEndpointTypeSelect.value = settings.ollamaEndpointType;
  customPromptInput.value = settings.customPrompt;
  defaultLanguageSelect.value = settings.defaultLanguage;
  defaultToneSelect.value = settings.defaultTone;
  sensitiveDataProtectionCheckbox.checked = settings.sensitiveDataProtectionEnabled;
  floatingButtonCheckbox.checked = settings.floatingButtonEnabled;
  blockedDomainsInput.value = settings.blockedDomains.join("\n");
  allowedDomainsInput.value = settings.allowedDomains.join("\n");
}

async function save(): Promise<void> {
  await saveSettings({
    provider: providerSelect.value as AiProviderType,
    baseUrl: baseUrlInput.value,
    model: modelInput.value,
    apiKey: apiKeyInput.value,
    ollamaEndpointType: ollamaEndpointTypeSelect.value as OllamaEndpointType,
    customPrompt: customPromptInput.value,
    defaultLanguage: defaultLanguageSelect.value as LanguageOption,
    defaultTone: defaultToneSelect.value as ToneOption,
    sensitiveDataProtectionEnabled: sensitiveDataProtectionCheckbox.checked,
    floatingButtonEnabled: floatingButtonCheckbox.checked,
    blockedDomains: blockedDomainsInput.value.split(/\n/g),
    allowedDomains: allowedDomainsInput.value.split(/\n/g)
  });

  statusElement.textContent = "Configuracoes do Message Refiner salvas.";
}

async function reset(): Promise<void> {
  await resetSettings();
  await load();
  statusElement.textContent = "Padroes restaurados.";
}

async function loadShortcutStatus(): Promise<void> {
  const commands = await chrome.commands.getAll();
  const command = commands.find((item) => item.name === COMMAND_OPEN_PANEL);
  const shortcut = command?.shortcut?.trim();

  shortcutStatusElement.textContent = shortcut
    ? `Atalho atual: ${shortcut}.`
    : "Nenhum atalho registrado. Configure manualmente em chrome://extensions/shortcuts.";
}

function fillOptions<TValue extends string>(select: HTMLSelectElement, options: Array<{ value: TValue; label: string }>): void {
  select.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
}

function query<TElement extends HTMLElement>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Elemento nao encontrado: ${selector}`);
  }

  return element;
}

function applyProviderDefaults(provider: AiProviderType): void {
  baseUrlInput.value = PROVIDER_BASE_URL_HINTS[provider];
  baseUrlInput.placeholder = PROVIDER_BASE_URL_HINTS[provider];
  modelInput.value = PROVIDER_MODEL_HINTS[provider];
  modelInput.placeholder = PROVIDER_MODEL_HINTS[provider];
}

function renderProviderHelp(provider: AiProviderType): void {
  const link = PROVIDER_HELP_LINKS[provider];

  if (!link) {
    providerHelpElement.textContent = "Use um endpoint compativel com OpenAI Chat Completions.";
    return;
  }

  providerHelpElement.replaceChildren();
  const anchor = document.createElement("a");
  anchor.href = link.url;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  anchor.textContent = link.label;
  providerHelpElement.append(anchor);

  if (provider === "ollama") {
    providerHelpElement.append(" - local/manual, normalmente sem chave.");
  }
}
