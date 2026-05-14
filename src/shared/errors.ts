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
    return {
      message: friendlyTextPilotMessage(error),
      code: error.code
    };
  }

  if (error instanceof Error) {
    return {
      message: friendlyUnexpectedMessage(error),
      code: "UNEXPECTED_ERROR"
    };
  }

  return {
    message: "Nao foi possivel concluir a solicitacao.",
    code: "UNEXPECTED_ERROR"
  };
}

function friendlyTextPilotMessage(error: TextPilotError): string {
  if (error.code === "MISSING_API_KEY") {
    return error.message;
  }

  if (error.code === "AI_EMPTY_RESPONSE") {
    return "A IA nao retornou um texto revisado. Tente novamente em alguns instantes ou ajuste o modelo nas configuracoes.";
  }

  if (isHttpProviderError(error.code)) {
    return friendlyHttpProviderMessage(error.message);
  }

  return "Nao foi possivel concluir a revisao agora. Tente novamente em alguns instantes.";
}

function friendlyUnexpectedMessage(error: Error): string {
  if (isConnectionFailure(error.message)) {
    return "Nao foi possivel conectar ao provedor de IA. Verifique sua conexao, URL base e configuracoes do provedor.";
  }

  return "Nao foi possivel concluir a solicitacao. Tente novamente em alguns instantes.";
}

function isHttpProviderError(code: string): boolean {
  return code === "AI_HTTP_ERROR" || code === "GEMINI_HTTP_ERROR" || code === "OLLAMA_HTTP_ERROR";
}

function friendlyHttpProviderMessage(message: string): string {
  const status = extractHttpStatus(message);

  if (status === 401 || status === 403) {
    return "Nao foi possivel autenticar no provedor de IA. Verifique a chave de API e as permissoes do modelo.";
  }

  if (status === 404) {
    return "O modelo ou endpoint configurado nao foi encontrado. Verifique o modelo e a URL base nas configuracoes.";
  }

  if (status === 408 || status === 504) {
    return "O provedor de IA demorou demais para responder. Tente novamente em alguns instantes.";
  }

  if (status === 429) {
    return "O limite de uso do provedor de IA foi atingido. Aguarde alguns minutos ou selecione outro modelo.";
  }

  if (status === 500 || status === 502 || status === 503) {
    return "O provedor de IA esta temporariamente indisponivel ou com alta demanda. Tente novamente em alguns minutos ou selecione outro modelo.";
  }

  if (status && status >= 400 && status < 500) {
    return "O provedor de IA recusou a solicitacao. Verifique modelo, URL base e credenciais nas configuracoes.";
  }

  if (status && status >= 500) {
    return "O provedor de IA encontrou uma instabilidade temporaria. Tente novamente em alguns instantes.";
  }

  if (isConnectionFailure(message)) {
    return "Nao foi possivel conectar ao provedor de IA. Verifique sua conexao, URL base e configuracoes do provedor.";
  }

  return "Nao foi possivel concluir a revisao com o provedor de IA. Tente novamente em alguns instantes.";
}

function extractHttpStatus(message: string): number | null {
  const match = message.match(/\b(?:erro|error)\s+(\d{3})\b/i) ?? message.match(/\b(\d{3})\b/);
  const status = match?.[1] ? Number(match[1]) : NaN;
  return Number.isInteger(status) ? status : null;
}

function isConnectionFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network error") ||
    normalized.includes("load failed") ||
    normalized.includes("fetch failed")
  );
}
