import type { SensitiveDataFinding, SensitiveDataScanResult, SensitiveDataSeverity } from "../shared/types";

type PatternRule = {
  type: string;
  label: string;
  severity: SensitiveDataSeverity;
  regex: RegExp;
};

const PATTERN_RULES: PatternRule[] = [
  {
    type: "private-key",
    label: "chave privada",
    severity: "block",
    regex: /-----BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+|DSA\s+)?PRIVATE KEY-----/gi
  },
  {
    type: "bearer-token",
    label: "Bearer Token",
    severity: "block",
    regex: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi
  },
  {
    type: "jwt",
    label: "token JWT",
    severity: "block",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g
  },
  {
    type: "api-key",
    label: "API key, token ou secret",
    severity: "block",
    regex:
      /\b(?:api[_-]?key|token|secret|client[_-]?secret|access[_-]?token|refresh[_-]?token)\b\s*[:=]\s*["']?[A-Za-z0-9_\-./+=]{12,}/gi
  },
  {
    type: "password",
    label: "senha aparente",
    severity: "block",
    regex: /\b(?:senha|password|passwd|pwd)\b\s*[:=]\s*["']?\S{4,}/gi
  },
  {
    type: "aws-access-key",
    label: "chave de acesso AWS",
    severity: "block",
    regex: /\bAKIA[0-9A-Z]{16}\b/g
  },
  {
    type: "bank-data",
    label: "dados bancarios",
    severity: "block",
    regex: /\b(?:ag[eê]ncia|agencia|conta(?:\s+corrente)?|banco|pix)\b.{0,40}\d{3,}/gi
  },
  {
    type: "email",
    label: "e-mail",
    severity: "warn",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
  },
  {
    type: "phone",
    label: "telefone",
    severity: "warn",
    regex: /\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}\b/g
  }
];

export class SensitiveDataGuard {
  scan(text: string): SensitiveDataScanResult {
    const findings: SensitiveDataFinding[] = [];

    for (const rule of PATTERN_RULES) {
      addRegexFindings(text, rule, findings);
    }

    addCpfFindings(text, findings);
    addCnpjFindings(text, findings);
    addCreditCardFindings(text, findings);

    const hasBlocks = findings.some((finding) => finding.severity === "block");
    const hasWarnings = findings.some((finding) => finding.severity === "warn");

    return {
      allowed: !hasBlocks,
      hasBlocks,
      hasWarnings,
      findings: dedupeFindings(findings)
    };
  }
}

function addRegexFindings(text: string, rule: PatternRule, findings: SensitiveDataFinding[]): void {
  for (const match of text.matchAll(rule.regex)) {
    if (match[0]) {
      findings.push({
        type: rule.type,
        label: rule.label,
        severity: rule.severity,
        sample: maskSample(match[0])
      });
    }
  }
}

function addCpfFindings(text: string, findings: SensitiveDataFinding[]): void {
  const regex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

  for (const match of text.matchAll(regex)) {
    const value = onlyDigits(match[0]);

    if (isValidCpf(value)) {
      findings.push({
        type: "cpf",
        label: "CPF",
        severity: "block",
        sample: maskDigits(value)
      });
    }
  }
}

function addCnpjFindings(text: string, findings: SensitiveDataFinding[]): void {
  const regex = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;

  for (const match of text.matchAll(regex)) {
    const value = onlyDigits(match[0]);

    if (isValidCnpj(value)) {
      findings.push({
        type: "cnpj",
        label: "CNPJ",
        severity: "block",
        sample: maskDigits(value)
      });
    }
  }
}

function addCreditCardFindings(text: string, findings: SensitiveDataFinding[]): void {
  const regex = /(?:\d[ -]*?){13,19}/g;

  for (const match of text.matchAll(regex)) {
    const value = onlyDigits(match[0]);

    if (value.length >= 13 && value.length <= 19 && passesLuhn(value)) {
      findings.push({
        type: "credit-card",
        label: "cartao de credito",
        severity: "block",
        sample: maskDigits(value)
      });
    }
  }
}

function dedupeFindings(findings: SensitiveDataFinding[]): SensitiveDataFinding[] {
  const seen = new Set<string>();
  const result: SensitiveDataFinding[] = [];

  for (const finding of findings) {
    const key = `${finding.type}:${finding.sample ?? finding.label}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(finding);
    }
  }

  return result;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function maskSample(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();

  if (compact.length <= 8) {
    return "***";
  }

  return `${compact.slice(0, 3)}...${compact.slice(-3)}`;
}

function maskDigits(value: string): string {
  if (value.length <= 4) {
    return "****";
  }

  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function isValidCpf(value: string): boolean {
  if (value.length !== 11 || /^(\d)\1+$/.test(value)) {
    return false;
  }

  const first = cpfDigit(value.slice(0, 9));
  const second = cpfDigit(value.slice(0, 9) + first);

  return value.endsWith(`${first}${second}`);
}

function cpfDigit(partial: string): number {
  let sum = 0;

  for (let index = 0; index < partial.length; index += 1) {
    sum += Number(partial[index]) * (partial.length + 1 - index);
  }

  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

function isValidCnpj(value: string): boolean {
  if (value.length !== 14 || /^(\d)\1+$/.test(value)) {
    return false;
  }

  const first = cnpjDigit(value.slice(0, 12));
  const second = cnpjDigit(value.slice(0, 12) + first);

  return value.endsWith(`${first}${second}`);
}

function cnpjDigit(partial: string): number {
  const weights =
    partial.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = partial.split("").reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
  const rest = sum % 11;

  return rest < 2 ? 0 : 11 - rest;
}

function passesLuhn(value: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);

    if (shouldDouble) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}
