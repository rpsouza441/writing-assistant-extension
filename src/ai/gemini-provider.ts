import { normalizeBaseUrl } from "./openrouter-provider";
import { PromptBuilder } from "./prompt-builder";
import { TextPilotError } from "../shared/errors";
import type { AiProvider } from "./ai-provider";
import type { ImproveTextRequest, TextPilotSettings } from "../shared/types";

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class GeminiProvider implements AiProvider {
  private readonly promptBuilder = new PromptBuilder();

  async improveText(request: ImproveTextRequest, settings: TextPilotSettings): Promise<string> {
    if (!settings.apiKey) {
      throw new TextPilotError("Configure a chave de API do Google Gemini antes de enviar.", "MISSING_API_KEY");
    }

    const prompt = this.promptBuilder.build(request, settings);
    const model = normalizeGeminiModel(settings.model);
    const response = await fetch(`${normalizeBaseUrl(settings.baseUrl)}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: prompt.system }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt.user }]
          }
        ],
        generationConfig: {
          temperature: 0.3
        }
      })
    });

    return parseGeminiResponse(response);
  }
}

async function parseGeminiResponse(response: Response): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as GeminiGenerateContentResponse;

  if (!response.ok) {
    const detail = data.error?.message ? ` ${data.error.message}` : "";
    throw new TextPilotError(
      `Gemini retornou erro ${response.status}.${detail}`.trim(),
      "GEMINI_HTTP_ERROR"
    );
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("")
    .trim();

  if (!text) {
    throw new TextPilotError("Gemini respondeu sem texto revisado.", "AI_EMPTY_RESPONSE");
  }

  return text;
}

function normalizeGeminiModel(model: string): string {
  return model.trim().replace(/^models\//, "");
}
