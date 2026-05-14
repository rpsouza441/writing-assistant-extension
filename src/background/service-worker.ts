import { createAiProvider } from "../ai/ai-provider";
import { getSettings } from "../storage/settings-store";
import {
  COMMAND_OPEN_PANEL,
  COMMAND_SHORTCUT_MISSING_STORAGE_KEY,
  COMMAND_SHORTCUT_STORAGE_KEY,
  MESSAGE_IMPROVE_TEXT,
  MESSAGE_OPEN_REVIEW_PANEL,
  MESSAGE_PING,
  MESSAGE_PONG
} from "../shared/constants";
import { toUserMessage } from "../shared/errors";
import type {
  ImproveTextResponse,
  OpenPanelResponse,
  RuntimeMessage,
  RuntimeResponse
} from "../shared/types";

const CONTEXT_MENU_ID = "textpilot-improve-selection";
const CONTENT_SCRIPT_FILE = "content/content-script.js";
const CONTENT_CSS_FILE = "styles/content.css";
const ACTIVATION_BLOCKED_MESSAGE =
  "Nao foi possivel ativar o Message Refiner nesta pagina. Algumas paginas internas do navegador ou paginas protegidas nao permitem injecao de extensoes.";
const SELECT_TEXT_MESSAGE = "Selecione um texto ou clique em um campo editavel antes de usar o Message Refiner.";

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
  void refreshCommandState();
});

chrome.runtime.onStartup.addListener(() => {
  void refreshCommandState();
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  if (message?.type === MESSAGE_IMPROVE_TEXT) {
    void handleImproveText(message)
      .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse<ImproveTextResponse>))
      .catch((error) => {
        const userMessage = toUserMessage(error);
        sendResponse({
          ok: false,
          error: userMessage.message,
          code: userMessage.code
        } satisfies RuntimeResponse<ImproveTextResponse>);
      });

    return true;
  }

  if (message?.type === MESSAGE_OPEN_REVIEW_PANEL) {
    void openPanelFromRuntimeMessage(message, sender)
      .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse<OpenPanelResponse>))
      .catch((error) => {
        const userMessage = toUserMessage(error);
        sendResponse({
          ok: false,
          error: userMessage.message,
          code: userMessage.code
        } satisfies RuntimeResponse<OpenPanelResponse>);
      });

    return true;
  }

  return false;
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) {
    return;
  }

  void openPanelInTab(tab.id, info.selectionText, typeof info.frameId === "number" ? info.frameId : 0).then((result) => {
    if (!result.opened) {
      void showActionWarning(tab.id, result.message);
    }
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== COMMAND_OPEN_PANEL) {
    return;
  }

  void openPanelInActiveTab().then((result) => {
    if (result && !result.opened) {
      void showActionWarning(undefined, result.message);
    }
  });
});

async function handleImproveText(message: RuntimeMessage): Promise<ImproveTextResponse> {
  if (message.type !== MESSAGE_IMPROVE_TEXT) {
    throw new Error("Mensagem invalida.");
  }

  const settings = await getSettings();
  const provider = createAiProvider(settings);
  const text = await provider.improveText(message.payload, settings);

  return {
    text,
    provider: settings.provider,
    model: settings.model
  };
}

async function openPanelFromRuntimeMessage(
  message: RuntimeMessage,
  sender: chrome.runtime.MessageSender
): Promise<OpenPanelResponse> {
  const tabId = sender.tab?.id ?? (await getActiveTabId());

  if (!tabId || message.type !== MESSAGE_OPEN_REVIEW_PANEL) {
    return {
      opened: false,
      message: "Nao foi possivel encontrar a aba atual."
    };
  }

  return openPanelInTab(tabId, message.payload?.selectedText);
}

async function openPanelInActiveTab(): Promise<OpenPanelResponse | null> {
  const tabId = await getActiveTabId();

  if (!tabId) {
    return {
      opened: false,
      message: "Nao foi possivel encontrar a aba atual."
    };
  }

  return openPanelInTab(tabId);
}

async function openPanelInTab(tabId: number, selectedText?: string, frameId = 0): Promise<OpenPanelResponse> {
  const activation = await ensureContentScriptInjected(tabId);

  if (!activation.ok) {
    return {
      opened: false,
      message: activation.message
    };
  }

  const targetFrameId = Number.isInteger(frameId) && frameId >= 0 ? frameId : 0;

  try {
    const response = (await chrome.tabs.sendMessage(
      tabId,
      {
        type: MESSAGE_OPEN_REVIEW_PANEL,
        payload: {
          selectedText: selectedText?.trim() || ""
        }
      },
      { frameId: targetFrameId }
    )) as { ok?: boolean; message?: string } | undefined;

    if (response?.ok) {
      return {
        opened: true,
        message: "Painel aberto na pagina."
      };
    }

    return {
      opened: false,
      message: response?.message || SELECT_TEXT_MESSAGE
    };
  } catch (error) {
    if (targetFrameId !== 0) {
      return openPanelInTab(tabId, selectedText, 0);
    }

    return {
      opened: false,
      message: activationMessageFromError(error)
    };
  }
}

async function ensureContentScriptInjected(tabId: number): Promise<{ ok: true } | { ok: false; message: string }> {
  const tab = await chrome.tabs.get(tabId);

  if (!isInjectableUrl(tab.url ?? "")) {
    return {
      ok: false,
      message: ACTIVATION_BLOCKED_MESSAGE
    };
  }

  const firstPing = await pingContentScript(tabId);

  if (firstPing.ok) {
    return { ok: true };
  }

  if (!firstPing.receivingEndMissing) {
    return {
      ok: false,
      message: activationMessageFromError(firstPing.error)
    };
  }

  try {
    await injectContentScript(tabId);
  } catch (error) {
    return {
      ok: false,
      message: activationMessageFromError(error)
    };
  }

  const secondPing = await pingContentScript(tabId);

  if (secondPing.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    message: ACTIVATION_BLOCKED_MESSAGE
  };
}

async function injectContentScript(tabId: number): Promise<void> {
  try {
    await chrome.scripting.insertCSS({
      target: { tabId, allFrames: true },
      files: [CONTENT_CSS_FILE]
    });
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: [CONTENT_SCRIPT_FILE]
    });
    return;
  } catch {
    await chrome.scripting.insertCSS({
      target: { tabId, frameIds: [0] },
      files: [CONTENT_CSS_FILE]
    });
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      files: [CONTENT_SCRIPT_FILE]
    });
  }
}

async function pingContentScript(
  tabId: number
): Promise<{ ok: true } | { ok: false; receivingEndMissing: boolean; error: unknown }> {
  try {
    const response = (await chrome.tabs.sendMessage(
      tabId,
      { type: MESSAGE_PING },
      { frameId: 0 }
    )) as { type?: string; ready?: boolean } | undefined;

    if (response?.type === MESSAGE_PONG && response.ready === true) {
      return { ok: true };
    }

    return {
      ok: false,
      receivingEndMissing: false,
      error: new Error("Resposta invalida do content script.")
    };
  } catch (error) {
    return {
      ok: false,
      receivingEndMissing: isReceivingEndMissingError(error),
      error
    };
  }
}

function createContextMenu(): void {
  chrome.contextMenus.remove(CONTEXT_MENU_ID, () => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "Message Refiner: refine selected text",
      contexts: ["selection"]
    });
  });
}

async function refreshCommandState(): Promise<void> {
  const commands = await chrome.commands.getAll();
  const command = commands.find((item) => item.name === COMMAND_OPEN_PANEL);
  const shortcut = command?.shortcut?.trim() ?? "";

  await chrome.storage.local.set({
    [COMMAND_SHORTCUT_STORAGE_KEY]: shortcut,
    [COMMAND_SHORTCUT_MISSING_STORAGE_KEY]: !shortcut
  });
}

async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

function isInjectableUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  const lowerUrl = url.toLowerCase();

  if (
    lowerUrl.startsWith("chrome://") ||
    lowerUrl.startsWith("chrome-extension://") ||
    lowerUrl.startsWith("chrome-untrusted://") ||
    lowerUrl.startsWith("devtools://") ||
    lowerUrl.startsWith("edge://") ||
    lowerUrl.startsWith("brave://") ||
    lowerUrl.startsWith("opera://") ||
    lowerUrl.startsWith("view-source:")
  ) {
    return false;
  }

  try {
    const parsed = new URL(lowerUrl);

    if (
      parsed.hostname === "chrome.google.com" &&
      parsed.pathname.startsWith("/webstore")
    ) {
      return false;
    }

    if (parsed.hostname === "chromewebstore.google.com") {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

function activationMessageFromError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (!message || isProtectedPageError(message) || isReceivingEndMissingError(error)) {
    return ACTIVATION_BLOCKED_MESSAGE;
  }

  return `${ACTIVATION_BLOCKED_MESSAGE} Detalhe tecnico: ${message}`;
}

function isReceivingEndMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("Receiving end does not exist") ||
    message.includes("Could not establish connection")
  );
}

function isProtectedPageError(message: string): boolean {
  return (
    message.includes("Cannot access contents of url") ||
    message.includes("The extensions gallery cannot be scripted") ||
    message.includes("This page cannot be scripted") ||
    message.includes("Cannot access a chrome:// URL")
  );
}

async function showActionWarning(tabId: number | undefined, message: string): Promise<void> {
  await chrome.storage.local.set({ textpilotLastActivationMessage: message });

  if (tabId) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#b45309" });
    await chrome.action.setBadgeText({ tabId, text: "!" });
    await chrome.action.setTitle({ tabId, title: message });

    setTimeout(() => {
      void chrome.action.setBadgeText({ tabId, text: "" });
    }, 8000);
  }
}
