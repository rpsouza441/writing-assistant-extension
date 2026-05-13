import { PromptBuilder } from "./prompt-builder";
import { normalizeBaseUrl, parseChatCompletionResponse } from "./openrouter-provider";
import type { AiProvider } from "./ai-provider";
import type { ImproveTextRequest, TextPilotSettings } from "../shared/types";

export class CustomOpenAiProvider implements AiProvider {
  private readonly promptBuilder = new PromptBuilder();

  async improveText(request: ImproveTextRequest, settings: TextPilotSettings): Promise<string> {
    const prompt = this.promptBuilder.build(request, settings);
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (settings.apiKey) {
      headers.Authorization = `Bearer ${settings.apiKey}`;
    }

    const response = await fetch(`${normalizeBaseUrl(settings.baseUrl)}/chat/completions`, {
      method: "POST",
      headers,
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
