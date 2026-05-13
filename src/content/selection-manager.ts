import { ContentEditableAdapter } from "./adapters/contenteditable-adapter";
import { GenericSelectionAdapter } from "./adapters/generic-selection-adapter";
import { InputAdapter } from "./adapters/input-adapter";
import { isVisibleElement, type AdapterSelection } from "./adapters/base-text-adapter";
import { TextareaAdapter } from "./adapters/textarea-adapter";

const TEXTPILOT_SELECTOR = "#textpilot-floating-button, #textpilot-floating-icon, #textpilot-inline-panel";

export class SelectionManager {
  getSelectionContext(): AdapterSelection | null {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement && isInsideTextPilotUi(activeElement)) {
      return null;
    }

    if (activeElement instanceof HTMLTextAreaElement && isVisibleElement(activeElement)) {
      return new TextareaAdapter(activeElement).getSelection();
    }

    if (activeElement instanceof HTMLInputElement && isVisibleElement(activeElement)) {
      return new InputAdapter(activeElement).getSelection();
    }

    const editable = getEditableFromSelection() ?? getEditableFromActiveElement(activeElement);

    if (editable) {
      const selection = new ContentEditableAdapter(editable).getSelection();

      if (selection) {
        return selection;
      }
    }

    return new GenericSelectionAdapter().getSelection();
  }

  getDebugInfo(): SelectionDebugInfo {
    const selection = window.getSelection();
    const editable = getEditableFromSelection() ?? getEditableFromActiveElement(document.activeElement);
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();

    return {
      href: window.location.href,
      isFrame: window.top !== window,
      selectedLength: selection?.toString().length ?? 0,
      rangeCount: selection?.rangeCount ?? 0,
      isCollapsed: selection?.isCollapsed ?? true,
      activeElement: describeElement(document.activeElement),
      anchorElement: describeNode(selection?.anchorNode ?? null),
      focusElement: describeNode(selection?.focusNode ?? null),
      editableElement: describeElement(editable),
      editableIsVisible: editable ? isVisibleElement(editable) : false,
      rect: rect
        ? {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        : null
    };
  }
}

export function isInsideTextPilotUi(element: Element | null): boolean {
  return Boolean(element?.closest(TEXTPILOT_SELECTOR));
}

function getEditableFromSelection(): HTMLElement | null {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed || !selection.anchorNode) {
    return null;
  }

  const candidates: Node[] = [];

  if (selection.anchorNode) {
    candidates.push(selection.anchorNode);
  }

  if (selection.focusNode && selection.focusNode !== selection.anchorNode) {
    candidates.push(selection.focusNode);
  }

  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index);
    candidates.push(range.commonAncestorContainer, range.startContainer, range.endContainer);
  }

  for (const candidate of candidates) {
    const editable = findEditableAncestor(candidate);

    if (editable) {
      return editable;
    }
  }

  return null;
}

function getEditableFromActiveElement(activeElement: Element | null): HTMLElement | null {
  if (!activeElement) {
    return null;
  }

  return findEditableAncestor(activeElement);
}

function findEditableAncestor(node: Node): HTMLElement | null {
  let element = node instanceof Element ? node : node.parentElement;

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

interface SelectionDebugInfo {
  href: string;
  isFrame: boolean;
  selectedLength: number;
  rangeCount: number;
  isCollapsed: boolean;
  activeElement: string | null;
  anchorElement: string | null;
  focusElement: string | null;
  editableElement: string | null;
  editableIsVisible: boolean;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
}

function describeNode(node: Node | null): string | null {
  if (!node) {
    return null;
  }

  const element = node instanceof Element ? node : node.parentElement;
  return describeElement(element);
}

function describeElement(element: Element | null): string | null {
  if (!(element instanceof Element)) {
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
