import { PromptBuilder } from "./prompt-builder";
import { normalizeBaseUrl } from "./openrouter-provider";
import { TextPilotError } from "../shared/errors";
import type { AiProvider } from "./ai-provider";
import type { ImproveTextRequest, TextPilotSettings } from "../shared/types";

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface OllamaGenerateResponse {
  response?: string;
}

export class OllamaProvider implements AiProvider {
  private readonly promptBuilder = new PromptBuilder();

  async improveText(request: ImproveTextRequest, settings: TextPilotSettings): Promise<string> {
    const prompt = this.promptBuilder.build(request, settings);

    if (settings.ollamaEndpointType === "generate") {
      return this.callGenerate(prompt.singlePrompt, settings);
    }

    return this.callChat(prompt.system, prompt.user, settings);
  }

  private async callChat(system: string, user: string, settings: TextPilotSettings): Promise<string> {
    const response = await fetch(`${normalizeBaseUrl(settings.baseUrl)}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    if (!response.ok) {
      throw new TextPilotError(
        `Ollama retornou erro ${response.status}. Verifique se o servico local esta acessivel.`,
        "OLLAMA_HTTP_ERROR"
      );
    }

    const data = (await response.json()) as OllamaChatResponse;
    const text = data.message?.content?.trim();

    if (!text) {
      throw new TextPilotError("Ollama respondeu sem texto revisado.", "AI_EMPTY_RESPONSE");
    }

    return text;
  }

  private async callGenerate(prompt: string, settings: TextPilotSettings): Promise<string> {
    const response = await fetch(`${normalizeBaseUrl(settings.baseUrl)}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        prompt
      })
    });

    if (!response.ok) {
      throw new TextPilotError(
        `Ollama retornou erro ${response.status}. Verifique se o servico local esta acessivel.`,
        "OLLAMA_HTTP_ERROR"
      );
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    const text = data.response?.trim();

    if (!text) {
      throw new TextPilotError("Ollama respondeu sem texto revisado.", "AI_EMPTY_RESPONSE");
    }

    return text;
  }
}
