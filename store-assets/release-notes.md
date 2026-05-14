# Release Notes

## 0.1.0 beta

This is a beta testing release of Message Refiner.

## Included

- Chrome Extension Manifest V3 package.
- Message refinement flow for selected or active-field text.
- Review before sending text to AI.
- Review before applying generated output.
- Floating polishing pen button.
- Context menu action for selected text.
- Popup and options page for provider configuration.
- Support for OpenRouter, Ollama/local, Google Gemini, and custom OpenAI-compatible endpoints.
- Local sensitive-data warning layer based on current extension settings.
- Friendly error handling for provider failures.

## Known limitations

- Behavior may vary across rich text editors and iframes.
- Some sites may require copy fallback instead of direct insertion.
- Ollama/local setups may require local network, CORS, firewall, or proxy adjustments.
- The sensitive-data warning is not a full DLP solution.

## Beta focus

This beta is focused on validating packaging, Chrome Web Store readiness, provider configuration, privacy copy, editor compatibility, and safe user-confirmed text refinement.

## Testing notice

This version is intended for controlled beta testing and should be published as Private or Unlisted before any public release.
