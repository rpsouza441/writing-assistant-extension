import { CustomOpenAiProvider } from "./custom-openai-provider";
import { GeminiProvider } from "./gemini-provider";
import { OllamaProvider } from "./ollama-provider";
import { OpenRouterProvider } from "./openrouter-provider";
import type { ImproveTextRequest, TextPilotSettings } from "../shared/types";

export interface AiProvider {
  improveText(request: ImproveTextRequest, settings: TextPilotSettings): Promise<string>;
}

export function createAiProvider(settings: TextPilotSettings): AiProvider {
  if (settings.provider === "ollama") {
    return new OllamaProvider();
  }

  if (settings.provider === "gemini") {
    return new GeminiProvider();
  }

  if (settings.provider === "custom-openai") {
    return new CustomOpenAiProvider();
  }

  return new OpenRouterProvider();
}
