export interface FloatingRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export class FloatingButton {
  private readonly element: HTMLButtonElement;

  constructor(onClick: () => void) {
    this.element = document.createElement("button");
    this.element.id = "textpilot-floating-button";
    this.element.type = "button";
    this.element.className = "tp-floating-button";
    this.element.textContent = "TP";
    this.element.title = "Melhorar texto com TextPilot";
    this.element.setAttribute("aria-label", "Melhorar texto selecionado com TextPilot");
    this.element.hidden = true;
    this.element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });

    document.documentElement.append(this.element);
  }

  show(rect: FloatingRect): void {
    this.element.classList.remove("tp-floating-button--dock");
    this.element.textContent = "TP";
    const size = 34;
    const gap = 8;
    const topBelow = rect.bottom + gap;
    const topAbove = rect.top - size - gap;
    const top = topBelow + size < window.innerHeight ? topBelow : Math.max(gap, topAbove);
    const left = Math.min(Math.max(gap, rect.right - size), window.innerWidth - size - gap);

    this.element.style.top = `${top}px`;
    this.element.style.left = `${left}px`;
    this.element.hidden = false;
  }

  showDefault(): void {
    this.element.classList.add("tp-floating-button--dock");
    this.element.textContent = "TP Melhorar texto";
    this.element.style.top = "";
    this.element.style.left = "";
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }
}
