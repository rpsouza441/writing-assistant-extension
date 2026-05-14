import type {
  ImprovementAction,
  LanguageOption,
  SensitiveDataFinding,
  ToneOption
} from "../shared/types";

const ACTIONS: Array<{ value: ImprovementAction; label: string }> = [
  { value: "clarity", label: "Melhorar clareza" },
  { value: "professional", label: "Tornar mais profissional" },
  { value: "objective", label: "Tornar mais objetivo" },
  { value: "grammar", label: "Corrigir gramatica" },
  { value: "friendly", label: "Tornar mais cordial" },
  { value: "summarize", label: "Resumir" },
  { value: "expand", label: "Expandir com mais contexto" },
  { value: "corporate-reply", label: "Resposta corporativa" },
  { value: "technical-support", label: "Mensagem de suporte tecnico" },
  { value: "professional-email", label: "E-mail profissional" }
];

const LANGUAGES: Array<{ value: LanguageOption; label: string }> = [
  { value: "auto", label: "Auto-detectar" },
  { value: "pt-BR", label: "Portugues" },
  { value: "en-US", label: "Ingles" }
];

const TONES: Array<{ value: ToneOption; label: string }> = [
  { value: "profissional", label: "Profissional" },
  { value: "direto", label: "Direto" },
  { value: "cordial", label: "Cordial" },
  { value: "tecnico", label: "Tecnico" },
  { value: "comercial", label: "Comercial" },
  { value: "suporte", label: "Suporte ao cliente" },
  { value: "formal", label: "Formal" },
  { value: "neutro", label: "Neutro" }
];

export interface ImproveUiPayload {
  action: ImprovementAction;
  language: LanguageOption;
  tone: ToneOption;
  forceSendWithWarnings: boolean;
}

export interface InlinePanelCallbacks {
  onImprove(payload: ImproveUiPayload): void;
  onAppend(): void;
  onReplace(): void;
  onCopy(): void;
  onClose(): void;
}

export interface InlinePanelShowOptions {
  originalText: string;
  canInsert: boolean;
  canReplace: boolean;
  defaultLanguage: LanguageOption;
  defaultTone: ToneOption;
}

export class InlinePanel {
  private readonly root: HTMLDivElement;
  private readonly originalTextArea: HTMLTextAreaElement;
  private readonly resultTextArea: HTMLTextAreaElement;
  private readonly actionSelect: HTMLSelectElement;
  private readonly languageSelect: HTMLSelectElement;
  private readonly toneSelect: HTMLSelectElement;
  private readonly improveButton: HTMLButtonElement;
  private readonly appendButton: HTMLButtonElement;
  private readonly replaceButton: HTMLButtonElement;
  private readonly copyButton: HTMLButtonElement;
  private readonly statusElement: HTMLDivElement;
  private readonly guardElement: HTMLDivElement;
  private canInsert = false;
  private canReplace = false;
  private hasResult = false;
  private warningConfirmationRequired = false;

  constructor(private readonly callbacks: InlinePanelCallbacks) {
    this.root = document.createElement("div");
    this.root.id = "textpilot-inline-panel";
    this.root.className = "tp-panel";
    this.root.hidden = true;
    this.root.innerHTML = this.template();
    document.documentElement.append(this.root);

    this.originalTextArea = this.query<HTMLTextAreaElement>("[data-role='original']");
    this.resultTextArea = this.query<HTMLTextAreaElement>("[data-role='result']");
    this.actionSelect = this.query<HTMLSelectElement>("[data-role='action']");
    this.languageSelect = this.query<HTMLSelectElement>("[data-role='language']");
    this.toneSelect = this.query<HTMLSelectElement>("[data-role='tone']");
    this.improveButton = this.query<HTMLButtonElement>("[data-role='improve']");
    this.appendButton = this.query<HTMLButtonElement>("[data-role='append']");
    this.replaceButton = this.query<HTMLButtonElement>("[data-role='replace']");
    this.copyButton = this.query<HTMLButtonElement>("[data-role='copy']");
    this.statusElement = this.query<HTMLDivElement>("[data-role='status']");
    this.guardElement = this.query<HTMLDivElement>("[data-role='guard']");

    this.bind();
  }

  show(options: InlinePanelShowOptions): void {
    this.canInsert = options.canInsert;
    this.canReplace = options.canReplace;
    this.hasResult = false;
    this.warningConfirmationRequired = false;
    this.originalTextArea.value = options.originalText;
    this.resultTextArea.value = "";
    this.languageSelect.value = options.defaultLanguage;
    this.toneSelect.value = options.defaultTone;
    this.statusElement.textContent = "";
    this.guardElement.replaceChildren();
    this.root.hidden = false;
    this.setLoading(false);
    this.updateActionButtons();
  }

  close(): void {
    this.root.hidden = true;
    this.warningConfirmationRequired = false;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  setLoading(isLoading: boolean): void {
    this.improveButton.disabled = isLoading;
    this.improveButton.textContent = isLoading
      ? "Refinando..."
      : this.warningConfirmationRequired
        ? "Enviar mesmo assim"
        : "Enviar para IA";
    this.statusElement.textContent = isLoading ? "Aguardando resposta da IA..." : this.statusElement.textContent;
  }

  setResult(text: string): void {
    this.hasResult = true;
    this.warningConfirmationRequired = false;
    this.resultTextArea.value = text;
    this.statusElement.textContent = "Texto revisado pronto para revisar.";
    this.guardElement.replaceChildren();
    this.setLoading(false);
    this.updateActionButtons();
  }

  setError(message: string): void {
    this.statusElement.textContent = message;
    this.setLoading(false);
    this.updateActionButtons();
  }

  requireWarningConfirmation(findings: SensitiveDataFinding[]): void {
    this.warningConfirmationRequired = true;
    this.renderFindings(findings, "Sensitive information detected. Revise os alertas antes de enviar.");
    this.setLoading(false);
  }

  blockForSensitiveData(findings: SensitiveDataFinding[]): void {
    this.warningConfirmationRequired = false;
    this.renderFindings(findings, "Sensitive information detected. Envio bloqueado por possivel dado sensivel.");
    this.setError("Remova os dados sensiveis ou desative a protecao nas opcoes se for apropriado.");
  }

  showStatus(message: string): void {
    this.statusElement.textContent = message;
  }

  getResultText(): string {
    return this.resultTextArea.value.trim();
  }

  private bind(): void {
    this.query<HTMLButtonElement>("[data-role='close']").addEventListener("click", () => this.callbacks.onClose());
    this.query<HTMLButtonElement>("[data-role='discard']").addEventListener("click", () => this.callbacks.onClose());

    this.improveButton.addEventListener("click", () => {
      this.callbacks.onImprove({
        action: this.actionSelect.value as ImprovementAction,
        language: this.languageSelect.value as LanguageOption,
        tone: this.toneSelect.value as ToneOption,
        forceSendWithWarnings: this.warningConfirmationRequired
      });
    });

    this.appendButton.addEventListener("click", () => this.callbacks.onAppend());
    this.replaceButton.addEventListener("click", () => this.callbacks.onReplace());
    this.copyButton.addEventListener("click", () => this.callbacks.onCopy());

    for (const select of [this.actionSelect, this.languageSelect, this.toneSelect]) {
      select.addEventListener("change", () => {
        this.warningConfirmationRequired = false;
        this.guardElement.replaceChildren();
        this.setLoading(false);
      });
    }
  }

  private updateActionButtons(): void {
    this.appendButton.disabled = !this.hasResult;
    this.appendButton.textContent = this.canInsert ? "Aceitar e adicionar ao final" : "Copiar resultado";
    this.replaceButton.disabled = !this.hasResult || !this.canReplace;
    this.copyButton.disabled = !this.hasResult;
  }

  private renderFindings(findings: SensitiveDataFinding[], heading: string): void {
    this.guardElement.replaceChildren();

    const title = document.createElement("p");
    title.className = "tp-guard-title";
    title.textContent = heading;
    this.guardElement.append(title);

    const list = document.createElement("ul");
    list.className = "tp-guard-list";

    for (const finding of findings) {
      const item = document.createElement("li");
      item.textContent = `${finding.severity === "block" ? "Bloqueio" : "Alerta"}: ${finding.label}${
        finding.sample ? ` (${finding.sample})` : ""
      }`;
      list.append(item);
    }

    this.guardElement.append(list);
  }

  private query<TElement extends HTMLElement>(selector: string): TElement {
    const element = this.root.querySelector<TElement>(selector);

    if (!element) {
      throw new Error(`Elemento da UI Message Refiner nao encontrado: ${selector}`);
    }

    return element;
  }

  private template(): string {
    return `
      <div class="tp-panel-header">
        <div>
          <strong>Message Refiner</strong>
          <span>Refinar o texto selecionado</span>
        </div>
        <button type="button" class="tp-icon-button" data-role="close" aria-label="Fechar">x</button>
      </div>

      <label class="tp-field">
        <span>Texto que sera enviado</span>
        <textarea data-role="original" readonly rows="4"></textarea>
      </label>

      <div class="tp-grid">
        <label class="tp-field">
          <span>Acao</span>
          <select data-role="action">${optionsHtml(ACTIONS)}</select>
        </label>
        <label class="tp-field">
          <span>Idioma</span>
          <select data-role="language">${optionsHtml(LANGUAGES)}</select>
        </label>
        <label class="tp-field">
          <span>Tom</span>
          <select data-role="tone">${optionsHtml(TONES)}</select>
        </label>
      </div>

      <div class="tp-panel-actions">
        <button type="button" class="tp-primary" data-role="improve">Enviar para IA</button>
      </div>

      <div class="tp-guard" data-role="guard"></div>
      <div class="tp-status" data-role="status" aria-live="polite"></div>

      <label class="tp-field">
        <span>Texto melhorado</span>
        <textarea data-role="result" readonly rows="5" placeholder="O resultado aparecera aqui."></textarea>
      </label>

      <div class="tp-panel-footer">
        <button type="button" class="tp-primary" data-role="append">Aceitar e adicionar ao final</button>
        <button type="button" data-role="replace">Substituir selecao</button>
        <button type="button" data-role="copy">Copiar</button>
        <button type="button" data-role="discard">Descartar</button>
      </div>
    `;
  }
}

function optionsHtml<TValue extends string>(options: Array<{ value: TValue; label: string }>): string {
  return options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
}
