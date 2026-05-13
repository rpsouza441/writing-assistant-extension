export interface FloatingIconPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export class FloatingIconController {
  private readonly element: HTMLButtonElement;

  constructor(onClick: () => void) {
    this.element = document.createElement("button");
    this.element.id = "textpilot-floating-icon";
    this.element.type = "button";
    this.element.className = "tp-field-icon";
    this.element.textContent = "TP";
    this.element.title = "Abrir TextPilot";
    this.element.setAttribute("aria-label", "Abrir assistente de escrita TextPilot");
    this.element.hidden = true;
    this.element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    this.element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });

    document.documentElement.append(this.element);
  }

  show(rect: DOMRect): void {
    const size = 28;
    const gap = 6;
    const fallbackRight = window.innerWidth - size - 16;
    const fallbackBottom = window.innerHeight - size - 16;
    const top = Number.isFinite(rect.bottom) ? rect.bottom - size - gap : fallbackBottom;
    const left = Number.isFinite(rect.right) ? rect.right - size - gap : fallbackRight;

    this.element.style.top = `${clamp(top, 8, window.innerHeight - size - 8)}px`;
    this.element.style.left = `${clamp(left, 8, window.innerWidth - size - 8)}px`;
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }

  contains(target: EventTarget | null): boolean {
    return target instanceof Node && this.element.contains(target);
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
