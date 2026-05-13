import { appendSeparator, BaseTextAdapter, type AdapterSelection, type InsertionResult } from "./base-text-adapter";

export class TextareaAdapter extends BaseTextAdapter<HTMLTextAreaElement> {
  readonly source = "textarea" as const;
  private selectionStart = 0;
  private selectionEnd = 0;

  getText(): string {
    return this.element.value.trim();
  }

  canAppend(): boolean {
    return !this.element.disabled && !this.element.readOnly;
  }

  canReplaceSelection(): boolean {
    if (!this.canAppend()) {
      return false;
    }

    const start = this.element.selectionStart ?? 0;
    const end = this.element.selectionEnd ?? 0;
    return end > start;
  }

  getSelection(): AdapterSelection | null {
    if (this.element.disabled || this.element.readOnly) {
      return null;
    }

    const start = this.element.selectionStart ?? 0;
    const end = this.element.selectionEnd ?? 0;

    if (end <= start) {
      return null;
    }

    this.selectionStart = start;
    this.selectionEnd = end;

    const text = this.element.value.slice(start, end).trim();

    if (!text) {
      return null;
    }

    return this.selectionFrom(text, this.element.getBoundingClientRect());
  }

  appendText(text: string): InsertionResult {
    this.focus();

    const nextText = `${this.element.value}${appendSeparator(this.element.value, true)}${text}`;
    this.element.value = nextText;
    this.element.setSelectionRange(nextText.length, nextText.length);
    this.dispatchInputEvents();

    return { ok: true };
  }

  replaceSelection(text: string): InsertionResult {
    this.focus();
    this.element.setRangeText(text, this.selectionStart, this.selectionEnd, "end");
    this.dispatchInputEvents();

    return { ok: true };
  }
}
