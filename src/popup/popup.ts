import {
  COMMAND_OPEN_PANEL,
  PROVIDER_BASE_URL_HINTS,
  PROVIDER_HELP_LINKS,
  PROVIDER_MODEL_HINTS,
  PROVIDER_OPTIONS,
  MESSAGE_OPEN_REVIEW_PANEL
} from "../shared/constants";
import type { AiProviderType, OpenPanelResponse, RuntimeResponse } from "../shared/types";
import { getSettings, saveSettings } from "../storage/settings-store";

const providerSelect = query<HTMLSelectElement>("#provider");
const baseUrlInput = query<HTMLInputElement>("#baseUrl");
const modelInput = query<HTMLInputElement>("#model");
const apiKeyInput = query<HTMLInputElement>("#apiKey");
const useSelectionButton = query<HTMLButtonElement>("#useSelection");
const saveButton = query<HTMLButtonElement>("#save");
const openOptionsButton = query<HTMLButtonElement>("#openOptions");
const openShortcutsButton = query<HTMLButtonElement>("#openShortcuts");
const statusElement = query<HTMLParagraphElement>("#status");
const providerHelpElement = query<HTMLParagraphElement>("#providerHelp");
const shortcutStatusElement = query<HTMLParagraphElement>("#shortcutStatus");

providerSelect.innerHTML = PROVIDER_OPTIONS.map(
  (option) => `<option value="${option.value}">${option.label}</option>`
).join("");

void load();
void loadShortcutStatus();

providerSelect.addEventListener("change", () => {
  const provider = providerSelect.value as AiProviderType;
  applyProviderDefaults(provider);
  renderProviderHelp(provider);
});

saveButton.addEventListener("click", () => {
  void save();
});

useSelectionButton.addEventListener("click", () => {
  void openPanelForCurrentSelection();
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

openShortcutsButton.addEventListener("click", () => {
  void chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

async function load(): Promise<void> {
  const settings = await getSettings();
  providerSelect.value = settings.provider;
  baseUrlInput.value = settings.baseUrl;
  modelInput.value = settings.model;
  apiKeyInput.value = settings.apiKey;
  renderProviderHelp(settings.provider);
}

async function save(): Promise<void> {
  await saveSettings({
    provider: providerSelect.value as AiProviderType,
    baseUrl: baseUrlInput.value,
    model: modelInput.value,
    apiKey: apiKeyInput.value
  });

  statusElement.textContent = "Configuracoes do Message Refiner salvas.";
}

async function openPanelForCurrentSelection(): Promise<void> {
  chrome.runtime.sendMessage(
    {
      type: MESSAGE_OPEN_REVIEW_PANEL,
      payload: { selectedText: "" }
    },
    (response: RuntimeResponse<OpenPanelResponse> | undefined) => {
      const error = chrome.runtime.lastError;

      if (error) {
        statusElement.textContent = error.message || "Nao foi possivel acionar o Message Refiner.";
        return;
      }

      if (!response) {
        statusElement.textContent = "Nao foi possivel acionar o Message Refiner.";
        return;
      }

      statusElement.textContent = response.ok ? response.data.message : response.error;
    }
  );
}

async function loadShortcutStatus(): Promise<void> {
  const commands = await chrome.commands.getAll();
  const command = commands.find((item) => item.name === COMMAND_OPEN_PANEL);
  const shortcut = command?.shortcut?.trim();

  shortcutStatusElement.textContent = shortcut
    ? `Atalho atual: ${shortcut}.`
    : "Nenhum atalho registrado. Pode haver conflito; configure manualmente no Chrome.";
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
  modelInput.value = PROVIDER_MODEL_HINTS[provider];
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
