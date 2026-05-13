import type { AdapterSelection, InsertionResult, TextAdapter } from "./base-text-adapter";

export class GenericSelectionAdapter implements TextAdapter {
  readonly source = "generic-selection" as const;

  getText(): string {
    return window.getSelection()?.toString().trim() ?? "";
  }

  getSelectedText(): string {
    return this.getText();
  }

  getAnchorRect(): DOMRect {
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0).getBoundingClientRect();
    }

    return new DOMRect(window.innerWidth - 48, window.innerHeight - 48, 1, 1);
  }

  canAppend(): boolean {
    return false;
  }

  canReplaceSelection(): boolean {
    return false;
  }

  getSelection(): AdapterSelection | null {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return null;
    }

    const text = selection.toString().trim();

    if (!text) {
      return null;
    }

    const range = selection.getRangeAt(0);

    return {
      adapter: this,
      text,
      rect: range.getBoundingClientRect(),
      source: this.source,
      canInsert: false,
      canReplace: false
    };
  }

  appendText(): InsertionResult {
    return { ok: false, reason: "Insercao automatica indisponivel para esta selecao." };
  }

  replaceSelection(): InsertionResult {
    return { ok: false, reason: "Substituicao automatica indisponivel para esta selecao." };
  }

  focus(): void {
    window.focus();
  }
}
