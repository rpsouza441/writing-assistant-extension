export type EditableSource = "textarea" | "input" | "contenteditable" | "rich-text-fallback" | "generic-selection";

export interface InsertionResult {
  ok: boolean;
  reason?: string;
}

export interface AdapterSelection {
  adapter: TextAdapter;
  text: string;
  rect: DOMRect;
  source: EditableSource;
  canInsert: boolean;
  canReplace: boolean;
}

export interface TextAdapter {
  readonly source: EditableSource;
  getSelection(): AdapterSelection | null;
  getText(): string;
  getSelectedText(): string;
  getAnchorRect(): DOMRect;
  canAppend(): boolean;
  canReplaceSelection(): boolean;
  appendText(text: string): InsertionResult;
  replaceSelection(text: string): InsertionResult;
  focus(): void;
}

export abstract class BaseTextAdapter<TElement extends HTMLElement> implements TextAdapter {
  abstract readonly source: EditableSource;

  constructor(protected readonly element: TElement) {}

  abstract getSelection(): AdapterSelection | null;

  getText(): string {
    return (this.element.innerText || this.element.textContent || "").trim();
  }

  getSelectedText(): string {
    return this.getSelection()?.text ?? "";
  }

  getAnchorRect(): DOMRect {
    return this.element.getBoundingClientRect();
  }

  canAppend(): boolean {
    return true;
  }

  canReplaceSelection(): boolean {
    return Boolean(this.getSelectedText());
  }

  abstract appendText(text: string): InsertionResult;

  abstract replaceSelection(text: string): InsertionResult;

  focus(): void {
    this.element.focus();
  }

  protected dispatchInputEvents(): void {
    this.element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText"
      })
    );
    this.element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  protected selectionFrom(text: string, rect: DOMRect, canInsert = true, canReplace = true): AdapterSelection {
    return {
      adapter: this,
      text,
      rect,
      source: this.source,
      canInsert,
      canReplace
    };
  }
}

export function appendSeparator(currentText: string, multiline: boolean): string {
  if (!currentText.trim()) {
    return "";
  }

  if (/\s$/.test(currentText)) {
    return "";
  }

  return multiline ? "\n\n" : " ";
}

export function isVisibleElement(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);

  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  return element.getClientRects().length > 0;
}
