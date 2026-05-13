import { appendSeparator, BaseTextAdapter, type AdapterSelection, type InsertionResult } from "./base-text-adapter";

export class ContentEditableAdapter extends BaseTextAdapter<HTMLElement> {
  readonly source = "contenteditable" as const;
  private selectedRange: Range | null = null;

  getText(): string {
    return (this.element.innerText || this.element.textContent || "").trim();
  }

  canAppend(): boolean {
    return this.element.isContentEditable && this.element.getAttribute("contenteditable")?.toLowerCase() !== "false";
  }

  canReplaceSelection(): boolean {
    return Boolean(this.getSelectedText());
  }

  getSelection(): AdapterSelection | null {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);

    if (!this.containsRange(range)) {
      return null;
    }

    const text = selection.toString().trim();

    if (!text) {
      return null;
    }

    this.selectedRange = range.cloneRange();
    const rect = safeRangeRect(range, this.element);

    return this.selectionFrom(text, rect);
  }

  appendText(text: string): InsertionResult {
    this.focus();

    const separator = appendSeparator(this.element.textContent ?? "", true);
    const range = document.createRange();
    range.selectNodeContents(this.element);
    range.collapse(false);

    return insertTextAtRange(range, `${separator}${text}`, this.element);
  }

  replaceSelection(text: string): InsertionResult {
    if (!this.selectedRange) {
      return { ok: false, reason: "A selecao original nao esta mais disponivel." };
    }

    this.focus();
    return insertTextAtRange(this.selectedRange, text, this.element);
  }

  private containsRange(range: Range): boolean {
    return containsNode(this.element, range.startContainer) && containsNode(this.element, range.endContainer);
  }
}

function insertTextAtRange(range: Range, text: string, element: HTMLElement): InsertionResult {
  const selection = window.getSelection();

  if (!selection) {
    return { ok: false, reason: "Nao foi possivel acessar a selecao atual." };
  }

  selection.removeAllRanges();
  selection.addRange(range);

  const insertedByCommand = document.execCommand("insertText", false, text);

  if (!insertedByCommand) {
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  element.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: text
    })
  );
  element.dispatchEvent(new Event("change", { bubbles: true }));

  return { ok: true };
}

function containsNode(parent: HTMLElement, node: Node): boolean {
  return parent === node || parent.contains(node);
}

function safeRangeRect(range: Range, fallbackElement: HTMLElement): DOMRect {
  const rect = range.getBoundingClientRect();

  if (rect.width > 0 || rect.height > 0) {
    return rect;
  }

  return fallbackElement.getBoundingClientRect();
}
