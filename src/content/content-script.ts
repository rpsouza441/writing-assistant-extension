import { ActiveEditorTracker, selectionFallbackContext, type ActiveEditorContext } from "./active-editor-tracker";
import { GenericSelectionAdapter } from "./adapters/generic-selection-adapter";
import type { InsertionResult } from "./adapters/base-text-adapter";
import { FloatingIconController } from "./floating-icon-controller";
import { InlinePanel, type ImproveUiPayload } from "./inline-panel";
import { SensitiveDataGuard } from "../privacy/sensitive-data-guard";
import type {
  ImproveTextResponse,
  LanguageOption,
  RuntimeResponse,
  TextPilotSettings,
  ToneOption
} from "../shared/types";

declare global {
  interface Window {
    __textpilotContentBootstrapped?: boolean;
    __textpilotDebugSelection?: () => unknown | Promise<unknown>;
  }
}

const MESSAGE_IMPROVE_TEXT = "TEXTPILOT_IMPROVE_TEXT";
const MESSAGE_OPEN_REVIEW_PANEL = "TEXTPILOT_OPEN_REVIEW_PANEL";
const MESSAGE_PING = "TEXTPILOT_PING";
const MESSAGE_PONG = "TEXTPILOT_PONG";
const FRAME_OPEN_PANEL_MESSAGE = "TEXTPILOT_FRAME_OPEN_PANEL";
const FRAME_OPEN_ACK_MESSAGE = "TEXTPILOT_FRAME_OPEN_ACK";
const FRAME_COMMAND_MESSAGE = "TEXTPILOT_FRAME_COMMAND";
const FRAME_COMMAND_RESULT_MESSAGE = "TEXTPILOT_FRAME_COMMAND_RESULT";
const DEBUG_REQUEST_MESSAGE = "TEXTPILOT_DEBUG_SELECTION_REQUEST";
const DEBUG_RESPONSE_MESSAGE = "TEXTPILOT_DEBUG_SELECTION_RESPONSE";
const TEXTPILOT_UI_SELECTOR = "#textpilot-floating-button, #textpilot-floating-icon, #textpilot-inline-panel";

type FrameOpenPayload = {
  frameId: string;
  text: string;
  source: ActiveEditorContext["source"];
  canInsert: boolean;
  canReplace: boolean;
};

type FrameCommandPayload = {
  frameId: string;
  commandId: string;
  command: "append" | "replace";
  text: string;
};

type FrameCommandResultPayload = {
  commandId: string;
  result: InsertionResult;
};

type LocalPanelSession = {
  kind: "local";
  context: ActiveEditorContext;
  text: string;
};

type FramePanelSession = {
  kind: "frame";
  frameId: string;
  frameWindow: Window;
  text: string;
  canInsert: boolean;
  canReplace: boolean;
};

type PanelSession = LocalPanelSession | FramePanelSession;

const CONTENT_DEFAULT_SETTINGS: TextPilotSettings = {
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

const isTopFrame = window.top === window;
const frameId = crypto.randomUUID();
const sensitiveDataGuard = new SensitiveDataGuard();
const pendingFrameCommands = new Map<
  string,
  {
    resolve: (result: InsertionResult) => void;
    reject: (error: Error) => void;
    timer: number;
  }
>();

let settings: TextPilotSettings = CONTENT_DEFAULT_SETTINGS;
let activeContext: ActiveEditorContext | null = null;
let currentSession: PanelSession | null = null;
let frameEditorContext: ActiveEditorContext | null = null;
let topAckTimer: number | undefined;
let tracker!: ActiveEditorTracker;
let floatingIcon!: FloatingIconController;
let inlinePanel!: InlinePanel;

if (!window.__textpilotContentBootstrapped) {
  window.__textpilotContentBootstrapped = true;
  bootstrap();
}

function bootstrap(): void {
  floatingIcon = new FloatingIconController(() => {
    void openPanelFromIcon();
  });

  inlinePanel = new InlinePanel({
    onImprove: (payload) => {
      void improveSelectedText(payload);
    },
    onAppend: () => {
      void appendResult();
    },
    onReplace: () => {
      void replaceSelection();
    },
    onCopy: () => {
      void copyResult();
    },
    onClose: () => {
      inlinePanel.close();
      showIconForCurrentEditor();
    }
  });

  tracker = new ActiveEditorTracker(handleEditorChange, {
    isTextPilotTarget: isInsideTextPilotUi
  });

  bindRuntimeCommands();
  bindFrameBridge();
  bindStorageChanges();
  installDebugHelper();
  tracker.start();
  void loadSettings();
}

async function loadSettings(): Promise<void> {
  settings = normalizeContentSettings(await chromeStorageGet(CONTENT_DEFAULT_SETTINGS));
  showIconForCurrentEditor();
}

function bindStorageChanges(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    const changedSettings = Object.fromEntries(
      Object.entries(changes).map(([key, change]) => [key, change.newValue])
    ) as Partial<TextPilotSettings>;

    settings = normalizeContentSettings({ ...settings, ...changedSettings });

    if (!isEnabledForThisPage()) {
      floatingIcon.hide();
      inlinePanel.close();
      return;
    }

    showIconForCurrentEditor();
  });
}

function bindRuntimeCommands(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === MESSAGE_PING) {
      sendResponse({ type: MESSAGE_PONG, ready: true });
      return false;
    }

    if (message?.type !== MESSAGE_OPEN_REVIEW_PANEL) {
      return false;
    }

    const opened = openPanelFromCommand(String(message.payload?.selectedText ?? ""));
    sendResponse({
      ok: opened,
      message: opened ? "Painel aberto na pagina." : "Selecione um texto ou clique em um campo editavel antes de usar o assistente."
    });
    return false;
  });
}

function bindFrameBridge(): void {
  window.addEventListener("message", (event) => {
    const data = event.data as
      | {
          type?: string;
          payload?: unknown;
          requestId?: string;
        }
      | undefined;

    if (!data?.type) {
      return;
    }

    if (data.type === FRAME_OPEN_PANEL_MESSAGE && isTopFrame && event.source) {
      handleFrameOpenPanel(event.source as Window, data.payload as FrameOpenPayload);
      return;
    }

    if (data.type === FRAME_OPEN_ACK_MESSAGE && !isTopFrame) {
      handleFrameOpenAck(data.payload as { frameId?: string });
      return;
    }

    if (data.type === FRAME_COMMAND_MESSAGE && !isTopFrame) {
      handleFrameCommand(event.source as Window | null, data.payload as FrameCommandPayload);
      return;
    }

    if (data.type === FRAME_COMMAND_RESULT_MESSAGE && isTopFrame) {
      handleFrameCommandResult(data.payload as FrameCommandResultPayload);
      return;
    }

    if (data.type === DEBUG_REQUEST_MESSAGE && event.source === window) {
      window.postMessage(
        {
          type: DEBUG_RESPONSE_MESSAGE,
          requestId: data.requestId,
          payload: tracker.getDebugInfo()
        },
        "*"
      );
    }
  });
}

function installDebugHelper(): void {
  window.__textpilotDebugSelection = () => tracker.getDebugInfo();

  const script = document.createElement("script");
  script.textContent = `
    (() => {
      if (window.__textpilotDebugSelection) {
        return;
      }

      window.__textpilotDebugSelection = () => {
        const requestId = String(Date.now()) + Math.random().toString(16).slice(2);

        return new Promise((resolve) => {
          const timer = window.setTimeout(() => {
            window.removeEventListener("message", onMessage);
            resolve({ error: "TextPilot nao respondeu neste contexto." });
          }, 1500);

          function onMessage(event) {
            if (event.source !== window || event.data?.type !== "${DEBUG_RESPONSE_MESSAGE}" || event.data?.requestId !== requestId) {
              return;
            }

            window.clearTimeout(timer);
            window.removeEventListener("message", onMessage);
            resolve(event.data.payload);
          }

          window.addEventListener("message", onMessage);
          window.postMessage({ type: "${DEBUG_REQUEST_MESSAGE}", requestId }, "*");
        });
      };
    })();
  `;

  try {
    (document.documentElement || document.head || document.body).append(script);
    script.remove();
  } catch {
    // O helper direto do content script continua disponivel no mundo isolado.
  }
}

function handleEditorChange(context: ActiveEditorContext | null): void {
  activeContext = context;
  showIconForCurrentEditor();
}

function showIconForCurrentEditor(): void {
  if (!floatingIcon || !activeContext || inlinePanel?.isOpen()) {
    floatingIcon?.hide();
    return;
  }

  if (!settings.floatingButtonEnabled || !isEnabledForThisPage()) {
    floatingIcon.hide();
    return;
  }

  floatingIcon.show(activeContext.rect);
}

async function openPanelFromIcon(): Promise<void> {
  const context = activeContext ?? tracker.getCurrentContext();

  if (!context) {
    return;
  }

  const text = panelTextFromContext(context);

  if (!isTopFrame && requestTopPanel(context, text)) {
    floatingIcon.hide();
    return;
  }

  showLocalPanel(context, text);
}

function openPanelFromCommand(selectedText: string): boolean {
  const trimmedText = selectedText.trim();
  const liveContext = tracker.getCurrentContext() ?? selectionFallbackContext();
  const context =
    trimmedText && !matchesContextText(liveContext, trimmedText)
      ? createGenericContext(trimmedText)
      : liveContext;

  if (!context || !context.text.trim()) {
    return false;
  }

  if (!isTopFrame && requestTopPanel(context, context.text)) {
    floatingIcon.hide();
    return true;
  }

  showLocalPanel(context, context.text);
  return true;
}

function showLocalPanel(context: ActiveEditorContext, text: string): void {
  activeContext = context;
  currentSession = {
    kind: "local",
    context,
    text
  };

  floatingIcon.hide();
  inlinePanel.show({
    originalText: text,
    canInsert: context.canInsert,
    canReplace: context.canReplace,
    defaultLanguage: settings.defaultLanguage,
    defaultTone: settings.defaultTone
  });

  if (!text.trim()) {
    inlinePanel.showStatus("Digite ou selecione um texto antes de enviar para a IA.");
  }
}

function requestTopPanel(context: ActiveEditorContext, text: string): boolean {
  const topWindow = window.top;

  if (!topWindow || topWindow === window) {
    return false;
  }

  frameEditorContext = context;
  window.clearTimeout(topAckTimer);

  topWindow.postMessage(
    {
      type: FRAME_OPEN_PANEL_MESSAGE,
      payload: {
        frameId,
        text,
        source: context.source,
        canInsert: context.canInsert,
        canReplace: context.canReplace
      } satisfies FrameOpenPayload
    },
    "*"
  );

  topAckTimer = window.setTimeout(() => {
    showLocalPanel(context, text);
  }, 650);

  return true;
}

function handleFrameOpenPanel(frameWindow: Window, payload: FrameOpenPayload): void {
  if (!payload?.frameId || !settings.floatingButtonEnabled || !isEnabledForThisPage()) {
    return;
  }

  frameWindow.postMessage(
    {
      type: FRAME_OPEN_ACK_MESSAGE,
      payload: {
        frameId: payload.frameId
      }
    },
    "*"
  );

  currentSession = {
    kind: "frame",
    frameId: payload.frameId,
    frameWindow,
    text: payload.text,
    canInsert: payload.canInsert,
    canReplace: payload.canReplace
  };

  floatingIcon.hide();
  inlinePanel.show({
    originalText: payload.text,
    canInsert: payload.canInsert,
    canReplace: payload.canReplace,
    defaultLanguage: settings.defaultLanguage,
    defaultTone: settings.defaultTone
  });

  if (!payload.text.trim()) {
    inlinePanel.showStatus("Digite ou selecione um texto antes de enviar para a IA.");
  }
}

function handleFrameOpenAck(payload: { frameId?: string }): void {
  if (payload?.frameId !== frameId) {
    return;
  }

  window.clearTimeout(topAckTimer);
}

function handleFrameCommand(sourceWindow: Window | null, payload: FrameCommandPayload): void {
  if (!sourceWindow || payload?.frameId !== frameId || !frameEditorContext) {
    return;
  }

  const result =
    payload.command === "replace"
      ? frameEditorContext.adapter.replaceSelection(payload.text)
      : frameEditorContext.adapter.appendText(payload.text);

  sourceWindow.postMessage(
    {
      type: FRAME_COMMAND_RESULT_MESSAGE,
      payload: {
        commandId: payload.commandId,
        result
      } satisfies FrameCommandResultPayload
    },
    "*"
  );
}

function handleFrameCommandResult(payload: FrameCommandResultPayload): void {
  const pending = pendingFrameCommands.get(payload?.commandId);

  if (!pending) {
    return;
  }

  window.clearTimeout(pending.timer);
  pendingFrameCommands.delete(payload.commandId);
  pending.resolve(payload.result);
}

async function improveSelectedText(payload: ImproveUiPayload): Promise<void> {
  const text = currentSession?.text.trim() ?? "";

  if (!text) {
    inlinePanel.setError("Digite ou selecione um texto antes de enviar para a IA.");
    return;
  }

  if (settings.sensitiveDataProtectionEnabled) {
    const scan = sensitiveDataGuard.scan(text);

    if (scan.hasBlocks) {
      inlinePanel.blockForSensitiveData(scan.findings);
      return;
    }

    if (scan.hasWarnings && !payload.forceSendWithWarnings) {
      inlinePanel.requireWarningConfirmation(scan.findings);
      return;
    }
  }

  inlinePanel.setLoading(true);

  try {
    const response = await sendImproveMessage({
      text,
      action: payload.action,
      language: payload.language,
      tone: payload.tone
    });

    inlinePanel.setResult(response.text);
  } catch (error) {
    inlinePanel.setError(error instanceof Error ? error.message : "Nao foi possivel chamar a IA.");
  }
}

async function appendResult(): Promise<void> {
  const result = inlinePanel.getResultText();

  if (!currentSession || !result) {
    inlinePanel.showStatus("Nao ha texto revisado para inserir.");
    return;
  }

  if (currentSession.kind === "frame") {
    await runFrameInsertion(currentSession, "append", result);
    return;
  }

  if (!currentSession.context.canInsert) {
    await copyResultWithFallback("Insercao automatica indisponivel. Texto copiado para a area de transferencia.");
    return;
  }

  const insertion = currentSession.context.adapter.appendText(result);

  if (!insertion.ok) {
    await copyResultWithFallback(insertion.reason ?? "Insercao indisponivel. Texto copiado para a area de transferencia.");
    return;
  }

  inlinePanel.showStatus("Texto adicionado ao final do campo.");
}

async function replaceSelection(): Promise<void> {
  const result = inlinePanel.getResultText();

  if (!currentSession || !result) {
    inlinePanel.showStatus("Nao ha texto revisado para substituir.");
    return;
  }

  if (currentSession.kind === "frame") {
    await runFrameInsertion(currentSession, "replace", result);
    return;
  }

  if (!currentSession.context.canReplace) {
    await copyResultWithFallback("Substituicao automatica indisponivel. Texto copiado para a area de transferencia.");
    return;
  }

  const insertion = currentSession.context.adapter.replaceSelection(result);

  if (!insertion.ok) {
    await copyResultWithFallback(insertion.reason ?? "Substituicao indisponivel. Texto copiado para a area de transferencia.");
    return;
  }

  inlinePanel.showStatus("Selecao substituida.");
}

async function copyResult(): Promise<void> {
  const result = inlinePanel.getResultText();

  if (!result) {
    inlinePanel.showStatus("Nao ha texto revisado para copiar.");
    return;
  }

  const copied = await copyText(result);
  inlinePanel.showStatus(copied ? "Texto copiado para a area de transferencia." : "Nao foi possivel copiar automaticamente.");
}

async function runFrameInsertion(selection: FramePanelSession, command: "append" | "replace", text: string): Promise<void> {
  if (command === "replace" && !selection.canReplace) {
    await copyResultWithFallback("Substituicao automatica indisponivel. Texto copiado para a area de transferencia.");
    return;
  }

  if (command === "append" && !selection.canInsert) {
    await copyResultWithFallback("Insercao automatica indisponivel. Texto copiado para a area de transferencia.");
    return;
  }

  inlinePanel.showStatus(command === "replace" ? "Substituindo no editor..." : "Inserindo no editor...");

  try {
    const result = await sendFrameCommand(selection, command, text);

    if (!result.ok) {
      await copyResultWithFallback(result.reason ?? "Insercao indisponivel. Texto copiado para a area de transferencia.");
      return;
    }

    inlinePanel.showStatus(command === "replace" ? "Selecao substituida." : "Texto adicionado ao final do campo.");
  } catch (error) {
    await copyResultWithFallback(
      error instanceof Error
        ? `${error.message} Texto copiado para a area de transferencia.`
        : "Nao foi possivel inserir no editor. Texto copiado para a area de transferencia."
    );
  }
}

function sendFrameCommand(selection: FramePanelSession, command: "append" | "replace", text: string): Promise<InsertionResult> {
  const commandId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pendingFrameCommands.delete(commandId);
      reject(new Error("O editor nao respondeu ao comando de insercao."));
    }, 4000);

    pendingFrameCommands.set(commandId, { resolve, reject, timer });
    selection.frameWindow.postMessage(
      {
        type: FRAME_COMMAND_MESSAGE,
        payload: {
          frameId: selection.frameId,
          commandId,
          command,
          text
        } satisfies FrameCommandPayload
      },
      "*"
    );
  });
}

async function copyResultWithFallback(message: string): Promise<void> {
  const result = inlinePanel.getResultText();

  if (!result) {
    inlinePanel.showStatus("Nao ha texto revisado para copiar.");
    return;
  }

  const copied = await copyText(result);
  inlinePanel.showStatus(copied ? message : "Nao foi possivel inserir nem copiar automaticamente.");
}

function sendImproveMessage(payload: {
  text: string;
  action: ImproveUiPayload["action"];
  language: LanguageOption;
  tone: ToneOption;
}): Promise<ImproveTextResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: MESSAGE_IMPROVE_TEXT,
        payload
      },
      (response: RuntimeResponse<ImproveTextResponse> | undefined) => {
        const runtimeError = chrome.runtime.lastError;

        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        if (!response) {
          reject(new Error("O service worker nao respondeu."));
          return;
        }

        if (!response.ok) {
          reject(new Error(response.error));
          return;
        }

        resolve(response.data);
      }
    );
  });
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    helper.setAttribute("readonly", "true");
    document.documentElement.append(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    return copied;
  }
}

function panelTextFromContext(context: ActiveEditorContext): string {
  return (context.selectedText || context.text || context.adapter.getText()).trim();
}

function matchesContextText(context: ActiveEditorContext | null, text: string): boolean {
  if (!context) {
    return false;
  }

  return context.selectedText.trim() === text || context.text.trim() === text;
}

function createGenericContext(text: string): ActiveEditorContext {
  const adapter = new GenericSelectionAdapter();

  return {
    adapter,
    element: document.documentElement,
    source: adapter.source,
    rect: new DOMRect(window.innerWidth - 64, window.innerHeight - 64, 34, 34),
    text,
    selectedText: text,
    canInsert: false,
    canReplace: false
  };
}

function isInsideTextPilotUi(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(TEXTPILOT_UI_SELECTOR));
}

function isEnabledForThisPage(): boolean {
  const host = getCurrentHost();

  if (!host) {
    return true;
  }

  if (matchesAnyDomain(settings.blockedDomains, host)) {
    return false;
  }

  if (settings.allowedDomains.length > 0) {
    return matchesAnyDomain(settings.allowedDomains, host);
  }

  return true;
}

function getCurrentHost(): string {
  const directHost = window.location.hostname.toLowerCase();

  if (directHost) {
    return directHost;
  }

  const referrerHost = hostFromUrl(document.referrer);

  if (referrerHost) {
    return referrerHost;
  }

  for (const candidateWindow of [window.parent, window.top]) {
    try {
      const host = candidateWindow?.location.hostname.toLowerCase();

      if (host) {
        return host;
      }
    } catch {
      // Frames cross-origin nao permitem ler location; nesse caso mantemos o comportamento conservador.
    }
  }

  return "";
}

function hostFromUrl(value: string): string {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function matchesAnyDomain(patterns: string[], host: string): boolean {
  return patterns.some((pattern) => matchesDomain(pattern, host));
}

function matchesDomain(pattern: string, host: string): boolean {
  const normalized = normalizeDomainPattern(pattern);

  if (!normalized) {
    return false;
  }

  if (normalized.startsWith("*.")) {
    const suffix = normalized.slice(2);
    return host === suffix || host.endsWith(`.${suffix}`);
  }

  return host === normalized || host.endsWith(`.${normalized}`);
}

function normalizeDomainPattern(pattern: string): string {
  const trimmed = pattern.trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }
}

function normalizeContentSettings(raw: Partial<TextPilotSettings>): TextPilotSettings {
  return {
    ...CONTENT_DEFAULT_SETTINGS,
    ...raw,
    defaultLanguage: isLanguage(raw.defaultLanguage) ? raw.defaultLanguage : CONTENT_DEFAULT_SETTINGS.defaultLanguage,
    defaultTone: isTone(raw.defaultTone) ? raw.defaultTone : CONTENT_DEFAULT_SETTINGS.defaultTone,
    sensitiveDataProtectionEnabled: raw.sensitiveDataProtectionEnabled !== false,
    floatingButtonEnabled: raw.floatingButtonEnabled !== false,
    blockedDomains: normalizeList(raw.blockedDomains),
    allowedDomains: normalizeList(raw.allowedDomains)
  };
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim().toLowerCase()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,;]/g)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function isLanguage(value: unknown): value is LanguageOption {
  return value === "auto" || value === "pt-BR" || value === "en-US";
}

function isTone(value: unknown): value is ToneOption {
  return (
    value === "profissional" ||
    value === "direto" ||
    value === "cordial" ||
    value === "tecnico" ||
    value === "comercial" ||
    value === "suporte" ||
    value === "formal" ||
    value === "neutro"
  );
}

function chromeStorageGet(defaults: TextPilotSettings): Promise<Partial<TextPilotSettings>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(defaults, (items) => {
      resolve(items as Partial<TextPilotSettings>);
    });
  });
}
