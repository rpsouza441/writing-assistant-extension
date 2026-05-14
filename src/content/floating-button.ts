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
    this.element.innerHTML = iconSvg();
    this.element.title = "Refinar texto selecionado com Message Refiner";
    this.element.setAttribute("aria-label", "Refinar texto selecionado com Message Refiner");
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
    this.element.innerHTML = iconSvg();
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
    this.element.innerHTML = iconSvg();
    this.element.style.top = "";
    this.element.style.left = "";
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }
}

function iconSvg(): string {
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M4.5 17.9 16.9 5.5l2.6 2.6L7.1 20.5H4.5v-2.6Z"></path>
      <path d="m15.6 6.8 2.6 2.6"></path>
      <path d="M5.5 6.2h6"></path>
      <path d="M5.5 9.4h4"></path>
      <path d="M18.4 13.2l.5 1.2 1.1.5-1.1.5-.5 1.2-.5-1.2-1.1-.5 1.1-.5.5-1.2Z"></path>
    </svg>
  `;
}
