import { PromptBuilder } from "./prompt-builder";
import { TextPilotError } from "../shared/errors";
import type { AiProvider } from "./ai-provider";
import type { ImproveTextRequest, TextPilotSettings } from "../shared/types";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class OpenRouterProvider implements AiProvider {
  private readonly promptBuilder = new PromptBuilder();

  async improveText(request: ImproveTextRequest, settings: TextPilotSettings): Promise<string> {
    if (!settings.apiKey) {
      throw new TextPilotError("Configure a chave de API do OpenRouter antes de enviar.", "MISSING_API_KEY");
    }

    const prompt = this.promptBuilder.build(request, settings);
    const endpoint = `${normalizeBaseUrl(settings.baseUrl)}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiKey}`,
        "HTTP-Referer": "https://textpilot.local",
        "X-Title": "TextPilot"
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ],
        temperature: 0.3
      })
    });

    return parseChatCompletionResponse(response);
  }
}

export async function parseChatCompletionResponse(response: Response): Promise<string> {
  if (!response.ok) {
    throw new TextPilotError(
      `A API retornou erro ${response.status}. Verifique provedor, URL, modelo e credenciais.`,
      "AI_HTTP_ERROR"
    );
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new TextPilotError("A API respondeu sem texto revisado.", "AI_EMPTY_RESPONSE");
  }

  return text;
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/g, "");
}
