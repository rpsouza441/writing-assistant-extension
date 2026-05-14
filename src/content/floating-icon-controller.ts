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
    this.element.innerHTML = iconSvg();
    this.element.title = "Refinar texto selecionado com Message Refiner";
    this.element.setAttribute("aria-label", "Refinar texto selecionado com Message Refiner");
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

  show(targetElement: HTMLElement, anchorRect: DOMRect): void {
    const position = findAvailableFloatingButtonPosition(targetElement, anchorRect, this.element, 34);

    this.element.style.top = `${position.top}px`;
    this.element.style.left = `${position.left}px`;
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }

  contains(target: EventTarget | null): boolean {
    return target instanceof Node && this.element.contains(target);
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

interface FloatingPosition {
  top: number;
  left: number;
}

interface FloatingCandidate extends FloatingPosition {
  type: "field" | "outside" | "global";
}

export function findAvailableFloatingButtonPosition(
  targetElement: HTMLElement,
  targetRect: DOMRect,
  ownElement: HTMLElement,
  buttonSize: number
): FloatingPosition {
  const viewportMargin = 8;
  const fieldMargin = 8;
  const candidates = buildPositionCandidates(targetRect, buttonSize, fieldMargin, viewportMargin);

  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate, buttonSize, viewportMargin);

    if (isSafePosition(normalized, targetElement, ownElement, buttonSize, viewportMargin)) {
      return normalized;
    }
  }

  return findSafeGlobalFallback(targetElement, ownElement, buttonSize, viewportMargin);
}

function buildPositionCandidates(
  rect: DOMRect,
  buttonSize: number,
  fieldMargin: number,
  viewportMargin: number
): FloatingCandidate[] {
  const insideBottom = rect.bottom - buttonSize - fieldMargin;
  const insideRight = rect.right - buttonSize - fieldMargin;

  return [
    { type: "field", top: insideBottom, left: insideRight },
    { type: "field", top: insideBottom, left: insideRight - 40 },
    { type: "field", top: insideBottom, left: insideRight - 80 },
    {
      type: "outside",
      top: rect.top + (rect.height - buttonSize) / 2,
      left: rect.right + fieldMargin
    },
    {
      type: "field",
      top: insideBottom,
      left: rect.left + fieldMargin
    },
    globalCandidate(buttonSize, viewportMargin)
  ];
}

function globalCandidate(buttonSize: number, viewportMargin: number): FloatingCandidate {
  return {
    type: "global",
    top: window.innerHeight - buttonSize - viewportMargin,
    left: window.innerWidth - buttonSize - viewportMargin
  };
}

function findSafeGlobalFallback(
  targetElement: HTMLElement,
  ownElement: HTMLElement,
  buttonSize: number,
  viewportMargin: number
): FloatingPosition {
  const baseTop = window.innerHeight - buttonSize - viewportMargin;
  const baseLeft = window.innerWidth - buttonSize - viewportMargin;
  const offsets = [
    { x: 0, y: 0 },
    { x: -40, y: 0 },
    { x: -80, y: 0 },
    { x: -120, y: 0 },
    { x: 0, y: -40 },
    { x: -40, y: -40 },
    { x: -80, y: -40 }
  ];

  for (const offset of offsets) {
    const candidate = normalizeCandidate(
      {
        type: "global",
        top: baseTop + offset.y,
        left: baseLeft + offset.x
      },
      buttonSize,
      viewportMargin
    );

    if (isSafePosition(candidate, targetElement, ownElement, buttonSize, viewportMargin)) {
      return candidate;
    }
  }

  return normalizeCandidate(
    {
      type: "global",
      top: baseTop,
      left: viewportMargin
    },
    buttonSize,
    viewportMargin
  );
}

function normalizeCandidate(candidate: FloatingCandidate, buttonSize: number, viewportMargin: number): FloatingCandidate {
  return {
    ...candidate,
    top: clamp(candidate.top, viewportMargin, window.innerHeight - buttonSize - viewportMargin),
    left: clamp(candidate.left, viewportMargin, window.innerWidth - buttonSize - viewportMargin)
  };
}

function isSafePosition(
  candidate: FloatingCandidate,
  targetElement: HTMLElement,
  ownElement: HTMLElement,
  buttonSize: number,
  viewportMargin: number
): boolean {
  const rect = toRect(candidate, buttonSize);

  if (!isInsideViewport(rect, viewportMargin)) {
    return false;
  }

  return !hasCollisionAt(rect, targetElement, ownElement);
}

function toRect(position: FloatingPosition, size: number): DOMRect {
  return new DOMRect(position.left, position.top, size, size);
}

function isInsideViewport(rect: DOMRect, margin: number): boolean {
  return (
    rect.left >= margin &&
    rect.top >= margin &&
    rect.right <= window.innerWidth - margin &&
    rect.bottom <= window.innerHeight - margin
  );
}

function hasCollisionAt(
  rect: DOMRect,
  targetElement: HTMLElement,
  ownElement: HTMLElement
): boolean {
  const points = samplePoints(rect);

  for (const point of points) {
    const elements = document.elementsFromPoint(point.x, point.y);
    const blocker = elements.find((element) =>
      isBlockingElement(element, targetElement, ownElement, rect)
    );

    if (blocker) {
      return true;
    }
  }

  return false;
}

function samplePoints(rect: DOMRect): Array<{ x: number; y: number }> {
  const inset = 4;
  return [
    { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    { x: rect.left + inset, y: rect.top + inset },
    { x: rect.right - inset, y: rect.top + inset },
    { x: rect.left + inset, y: rect.bottom - inset },
    { x: rect.right - inset, y: rect.bottom - inset }
  ];
}

function isBlockingElement(
  element: Element,
  targetElement: HTMLElement,
  ownElement: HTMLElement,
  candidateRect: DOMRect
): boolean {
  if (isOwnUi(element, ownElement)) {
    return false;
  }

  if (isDocumentSurface(element)) {
    return false;
  }

  if (element === targetElement || targetElement.contains(element)) {
    return false;
  }

  if (element.contains(targetElement)) {
    return false;
  }

  if (!intersects(candidateRect, element.getBoundingClientRect(), 2)) {
    return false;
  }

  return isLikelyFloatingWidget(element);
}

function isOwnUi(element: Element, ownElement: HTMLElement): boolean {
  return element === ownElement || ownElement.contains(element) || Boolean(element.closest("#textpilot-floating-icon, #textpilot-inline-panel"));
}

function isDocumentSurface(element: Element): boolean {
  return element === document.documentElement || element === document.body;
}

function intersects(a: DOMRect, b: DOMRect, margin: number): boolean {
  if (b.width === 0 && b.height === 0) {
    return false;
  }

  return !(
    a.right + margin < b.left ||
    a.left - margin > b.right ||
    a.bottom + margin < b.top ||
    a.top - margin > b.bottom
  );
}

function isLikelyFloatingWidget(element: Element): boolean {
  if (element instanceof HTMLButtonElement || element instanceof HTMLAnchorElement) {
    return true;
  }

  if (element instanceof SVGElement) {
    return true;
  }

  const role = element.getAttribute("role");

  if (role === "button" || role === "toolbar" || role === "menu") {
    return true;
  }

  const style = window.getComputedStyle(element);
  const isFloating = style.position === "fixed" || style.position === "absolute" || style.position === "sticky";

  if (isFloating) {
    return true;
  }

  const marker = [
    element.id,
    element.className,
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("data-lt-active"),
    element.getAttribute("data-grammarly-part")
  ]
    .map(String)
    .join(" ")
    .toLowerCase();

  return (
    marker.includes("languagetool") ||
    marker.includes("language-tool") ||
    marker.includes("lt-") ||
    marker.includes("grammarly") ||
    marker.includes("writing") ||
    marker.includes("assistant")
  );
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
