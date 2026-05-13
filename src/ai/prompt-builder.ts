import { IMPROVEMENT_ACTIONS, LANGUAGE_OPTIONS, TONE_OPTIONS } from "../shared/constants";
import type { ImproveTextRequest, TextPilotSettings } from "../shared/types";

export interface BuiltPrompt {
  system: string;
  user: string;
  singlePrompt: string;
}

export class PromptBuilder {
  build(request: ImproveTextRequest, settings: TextPilotSettings): BuiltPrompt {
    const actionLabel = labelFor(IMPROVEMENT_ACTIONS, request.action);
    const languageLabel = labelFor(LANGUAGE_OPTIONS, request.language);
    const toneLabel = labelFor(TONE_OPTIONS, request.tone);
    const customInstruction = settings.customPrompt
      ? `\nInstrucao adicional configurada pelo usuario: ${settings.customPrompt}`
      : "";

    const system = [
      "Voce e um assistente de escrita corporativa.",
      "Reescreva textos mantendo o significado original.",
      "Nao invente fatos, nao adicione informacoes nao fornecidas e nao altere intencoes.",
      "Melhore clareza, gramatica, objetividade e adequacao ao ambiente corporativo.",
      "Retorne apenas o texto revisado, sem explicacoes, observacoes ou markdown.",
      customInstruction
    ]
      .filter(Boolean)
      .join("\n");

    const user = [
      `Idioma: ${languageLabel}.`,
      `Tom: ${toneLabel}.`,
      `Acao: ${actionLabel}.`,
      "",
      "Texto original:",
      request.text
    ].join("\n");

    return {
      system,
      user,
      singlePrompt: `${system}\n\n${user}`
    };
  }
}

function labelFor<TValue extends string>(options: Array<{ value: TValue; label: string }>, value: TValue): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
