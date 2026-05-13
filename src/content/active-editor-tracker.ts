import { ContentEditableAdapter } from "./adapters/contenteditable-adapter";
import { GenericSelectionAdapter } from "./adapters/generic-selection-adapter";
import { InputAdapter, isSupportedInput } from "./adapters/input-adapter";
import { RichTextFallbackAdapter } from "./adapters/rich-text-fallback-adapter";
import { TextareaAdapter } from "./adapters/textarea-adapter";
import { isVisibleElement, type EditableSource, type TextAdapter } from "./adapters/base-text-adapter";

export interface ActiveEditorContext {
  adapter: TextAdapter;
  element: HTMLElement;
  source: EditableSource;
  rect: DOMRect;
  text: string;
  selectedText: string;
  canInsert: boolean;
  canReplace: boolean;
}

export interface ActiveEditorTrackerOptions {
  isTextPilotTarget(target: EventTarget | null): boolean;
}

type ActiveEditorListener = (context: ActiveEditorContext | null) => void;

const DEBOUNCE_MS = 80;
const SENSITIVE_FIELD_PATTERN = /(password|passwd|pwd|senha|secret|token|api[_-]?key|private[_-]?key)/i;
const RICH_TEXT_HINT_PATTERN = /(mce-content-body|tox-edit|ql-editor|ProseMirror|ck-editor|DraftEditor|public-DraftEditor)/i;

export class ActiveEditorTracker {
  private currentContext: ActiveEditorContext | null = null;
  private timer: number | undefined;
  private readonly scheduleUpdate = () => this.schedule();
  private readonly scheduleAfterBlur = () => this.schedule(120);
  private readonly handlePointerDown = (event: PointerEvent) => this.onPointerDown(event);

  constructor(
    private readonly onChange: ActiveEditorListener,
    private readonly options: ActiveEditorTrackerOptions
  ) {}

  start(): void {
    document.addEventListener("focusin", this.scheduleUpdate, true);
    document.addEventListener("focusout", this.scheduleAfterBlur, true);
    document.addEventListener("input", this.scheduleUpdate, true);
    document.addEventListener("keyup", this.scheduleUpdate, true);
    document.addEventListener("mouseup", this.scheduleUpdate, true);
    document.addEventListener("selectionchange", this.scheduleUpdate, true);
    document.addEventListener("pointerdown", this.handlePointerDown, true);
    window.addEventListener("scroll", this.scheduleUpdate, true);
    window.addEventListener("resize", this.scheduleUpdate, { passive: true });
    this.schedule();
  }

  getCurrentContext(): ActiveEditorContext | null {
    this.currentContext = this.detectCurrentContext();
    return this.currentContext;
  }

  hide(): void {
    window.clearTimeout(this.timer);
    this.currentContext = null;
    this.onChange(null);
  }

  getDebugInfo(): Record<string, unknown> {
    const context = this.currentContext ?? this.detectCurrentContext();

    return {
      href: window.location.href,
      isFrame: window.top !== window,
      activeElement: describeElement(document.activeElement),
      source: context?.source ?? null,
      hasText: Boolean(context?.text),
      selectedLength: context?.selectedText.length ?? 0,
      canInsert: context?.canInsert ?? false,
      canReplace: context?.canReplace ?? false,
      rect: context
        ? {
            top: Math.round(context.rect.top),
            left: Math.round(context.rect.left),
            width: Math.round(context.rect.width),
            height: Math.round(context.rect.height)
          }
        : null
    };
  }

  private schedule(delay = DEBOUNCE_MS): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      const next = this.detectCurrentContext();
      this.currentContext = next;
      this.onChange(next);
    }, delay);
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.options.isTextPilotTarget(event.target)) {
      return;
    }

    if (!(event.target instanceof Node) || !this.currentContext?.element.contains(event.target)) {
      this.schedule();
    }
  }

  private detectCurrentContext(): ActiveEditorContext | null {
    const activeElement = document.activeElement;

    if (this.options.isTextPilotTarget(activeElement)) {
      return null;
    }

    const adapter = this.createAdapter(activeElement);

    if (!adapter) {
      return null;
    }

    const element = adapterElement(adapter);
    const rect = adapter.getAnchorRect();

    if (!element || !isUsableRect(rect)) {
      return null;
    }

    const selectedText = adapter.getSelectedText().trim();

    return {
      adapter,
      element,
      source: adapter.source,
      rect,
      text: (selectedText || adapter.getText()).trim(),
      selectedText,
      canInsert: adapter.canAppend(),
      canReplace: adapter.canReplaceSelection()
    };
  }

  private createAdapter(activeElement: Element | null): TextAdapter | null {
    if (!(activeElement instanceof HTMLElement)) {
      return this.createRichTextFallbackAdapter();
    }

    if (isSensitiveField(activeElement)) {
      return null;
    }

    if (activeElement instanceof HTMLTextAreaElement && isVisibleElement(activeElement) && !activeElement.disabled) {
      return new TextareaAdapter(activeElement);
    }

    if (activeElement instanceof HTMLInputElement) {
      if (!isSupportedInput(activeElement) || !isVisibleElement(activeElement) || activeElement.disabled) {
        return null;
      }

      return new InputAdapter(activeElement);
    }

    const editable = findEditableAncestor(activeElement) ?? findEditableFromSelection();

    if (editable && isVisibleElement(editable) && !isSensitiveField(editable)) {
      return new ContentEditableAdapter(editable);
    }

    return this.createRichTextFallbackAdapter(activeElement);
  }

  private createRichTextFallbackAdapter(activeElement: HTMLElement | null = document.activeElement as HTMLElement | null): TextAdapter | null {
    const body = document.body;
    const candidate =
      richTextCandidateFrom(activeElement) ??
      richTextCandidateFrom(findEditableFromSelection()) ??
      (body && isDocumentRichTextBody(body) ? body : null);

    if (!candidate || isSensitiveField(candidate)) {
      return null;
    }

    return new RichTextFallbackAdapter(candidate);
  }
}

function adapterElement(adapter: TextAdapter): HTMLElement | null {
  return (adapter as unknown as { element?: HTMLElement }).element ?? null;
}

function findEditableFromSelection(): HTMLElement | null {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index);
    const editable =
      findEditableAncestor(range.commonAncestorContainer) ??
      findEditableAncestor(range.startContainer) ??
      findEditableAncestor(range.endContainer);

    if (editable) {
      return editable;
    }
  }

  return null;
}

function findEditableAncestor(node: Node | null): HTMLElement | null {
  let element = node instanceof Element ? node : node?.parentElement ?? null;

  while (element) {
    if (element instanceof HTMLElement && element.hasAttribute("contenteditable")) {
      const value = element.getAttribute("contenteditable")?.toLowerCase();

      if (value !== "false") {
        return element;
      }
    }

    element = element.parentElement;
  }

  return null;
}

function richTextCandidateFrom(element: Element | null): HTMLElement | null {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  if (isRichTextElement(element)) {
    return element;
  }

  const closest = element.closest<HTMLElement>(
    [
      "[role='textbox'][aria-multiline='true']",
      "[aria-label*='Area de texto rico']",
      "[aria-label*='Área de texto rico']",
      ".mce-content-body",
      ".ql-editor",
      ".ProseMirror",
      ".ck-editor__editable",
      ".public-DraftEditor-content"
    ].join(",")
  );

  return closest && isRichTextElement(closest) ? closest : null;
}

function isDocumentRichTextBody(body: HTMLElement): boolean {
  return document.designMode.toLowerCase() === "on" || isRichTextElement(body);
}

function isRichTextElement(element: HTMLElement): boolean {
  const descriptor = [
    element.id,
    element.className,
    element.getAttribute("role"),
    element.getAttribute("aria-label"),
    element.getAttribute("data-id")
  ]
    .filter(Boolean)
    .join(" ");

  return (
    element.isContentEditable ||
    element.getAttribute("role") === "textbox" ||
    RICH_TEXT_HINT_PATTERN.test(descriptor) ||
    descriptor.toLowerCase().includes("area de texto rico") ||
    descriptor.toLowerCase().includes("área de texto rico")
  );
}

function isSensitiveField(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();

    if (type === "password" || type === "hidden") {
      return true;
    }
  }

  const descriptor = [
    element.id,
    element.getAttribute("name"),
    element.getAttribute("autocomplete"),
    element.getAttribute("aria-label"),
    element.getAttribute("placeholder"),
    element.getAttribute("data-sensitive")
  ]
    .filter(Boolean)
    .join(" ");

  return SENSITIVE_FIELD_PATTERN.test(descriptor);
}

function isUsableRect(rect: DOMRect): boolean {
  return rect.width > 0 || rect.height > 0;
}

function describeElement(element: Element | null): string | null {
  if (!element) {
    return null;
  }

  const parts = [element.tagName.toLowerCase()];
  const id = element.getAttribute("id");
  const classes = element.getAttribute("class");
  const contentEditable = element.getAttribute("contenteditable");
  const role = element.getAttribute("role");
  const ariaLabel = element.getAttribute("aria-label");

  if (id) {
    parts.push(`#${id}`);
  }

  if (classes) {
    parts.push(`.${classes.trim().split(/\s+/).slice(0, 3).join(".")}`);
  }

  if (contentEditable !== null) {
    parts.push(`[contenteditable="${contentEditable}"]`);
  }

  if (role) {
    parts.push(`[role="${role}"]`);
  }

  if (ariaLabel) {
    parts.push(`[aria-label="${ariaLabel.slice(0, 80)}"]`);
  }

  return parts.join("");
}

export function selectionFallbackContext(): ActiveEditorContext | null {
  const adapter = new GenericSelectionAdapter();
  const selection = adapter.getSelection();

  if (!selection) {
    return null;
  }

  return {
    adapter,
    element: document.documentElement,
    source: adapter.source,
    rect: selection.rect,
    text: selection.text,
    selectedText: selection.text,
    canInsert: false,
    canReplace: false
  };
}
