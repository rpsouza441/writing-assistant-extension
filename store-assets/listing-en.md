# Chrome Web Store Listing - English

## Extension name

Message Refiner

## Short description

Refine selected text into clear, professional messages using AI.

## Full description

Message Refiner helps you turn selected text into clearer, more professional messages directly from the writing field you are using. It is designed for compact workflows in support desks, email, ticketing systems, team chat, and corporate web tools.

The extension does not send text automatically while you type. You select or focus text, open Message Refiner, review what will be sent, and explicitly confirm before any AI provider receives the content.

## Main features

- Refine selected text into clearer professional messages.
- Review the text before sending it to AI.
- Review the AI result before applying it.
- Copy the refined result or insert it back into the active field when supported.
- Floating polishing pen button for quick access near editable fields.
- Context menu action for selected text.
- Configurable AI providers.
- Local sensitive-data warning layer based on the existing extension settings.

## Supported AI providers

- OpenRouter.
- Ollama/local.
- Custom OpenAI-compatible endpoint.
- Google Gemini, when configured in the extension.

## How it works

1. Select text or focus an editable field.
2. Open Message Refiner from the floating button, popup, context menu, or keyboard shortcut.
3. Review the text that will be sent.
4. Confirm the AI request.
5. Review the refined result.
6. Copy, append, replace, or discard the result.

## Privacy summary

Message Refiner processes selected text only after user action. Text may be sent to the AI provider configured by the user. The extension does not keep a history of submitted texts and does not send text automatically while the user types. Provider settings and API keys, when configured, are stored locally using browser storage.

## Beta warning

For controlled beta distribution, publish the extension as Private or Unlisted first. Behavior can vary across rich text editors, iframes, and corporate web tools. Review privacy, permissions, screenshots, and internal policies before wider deployment.

## Limitations

- Rich text editors may behave differently across Gmail, Outlook Web, Jira, GLPI, WhatsApp Web, Teams Web, and similar tools.
- Some pages may block automatic insertion, in which case copy fallback can be used.
- Ollama/local access can require local CORS, firewall, or proxy configuration.
- The sensitive-data warning is preventive and does not replace a corporate DLP solution.
