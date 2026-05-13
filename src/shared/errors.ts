export class TextPilotError extends Error {
  constructor(
    message: string,
    public readonly code = "TEXTPILOT_ERROR"
  ) {
    super(message);
    this.name = "TextPilotError";
  }
}

export function toUserMessage(error: unknown): { message: string; code?: string } {
  if (error instanceof TextPilotError) {
    return { message: error.message, code: error.code };
  }

  if (error instanceof Error) {
    return {
      message: error.message || "Nao foi possivel concluir a solicitacao.",
      code: "UNEXPECTED_ERROR"
    };
  }

  return {
    message: "Nao foi possivel concluir a solicitacao.",
    code: "UNEXPECTED_ERROR"
  };
}
