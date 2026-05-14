# Test Instructions - Message Refiner

## Install locally

1. Run `npm install` if dependencies are not installed.
2. Run `npm run build`.
3. Open `chrome://extensions`.
4. Enable Developer mode.
5. Click `Load unpacked`.
6. Select the generated `dist/` folder.

## Open the popup

1. Pin Message Refiner in Chrome.
2. Click the extension icon.
3. Confirm the popup opens and shows provider settings.

## Configure OpenRouter

1. Select `OpenRouter`.
2. Use a base URL such as `https://openrouter.ai/api/v1`.
3. Enter an API key.
4. Enter a supported model.
5. Save settings.

## Configure Ollama/local

1. Start Ollama locally.
2. Select `Ollama/local`.
3. Use a base URL such as `http://localhost:11434`.
4. Enter a local model name.
5. Choose the appropriate local endpoint mode.
6. Save settings.

## Select text and open Message Refiner

1. Open a page with a text field.
2. Type or select text.
3. Use the floating polishing pen button, context menu, popup, or keyboard shortcut.
4. Confirm the panel opens with the selected text.

## Context menu

1. Select text in a webpage.
2. Right-click the selection.
3. Choose `Message Refiner: refine selected text`.
4. Confirm the panel opens for review.

## Floating button

1. Focus an editable field.
2. Confirm the polishing pen icon appears near the field.
3. Confirm it uses the polishing pen icon and does not overlap common writing assistant widgets when space is available.
4. Click the icon and confirm the panel opens.

## Test generation

1. Review the text that will be sent.
2. Confirm the AI request.
3. Confirm the result appears in the panel.
4. Confirm provider errors are shown as friendly extension messages.

## Test copy and insertion

1. Click copy and confirm the refined text is copied.
2. Test append or replace behavior in a supported text field.
3. On unsupported fields, confirm the copy fallback remains available.

## Sensitive-data protection

1. Enter text containing obvious sensitive data according to the extension settings.
2. Confirm the warning or blocking behavior appears before sending.
3. Confirm text is not sent automatically.

## Automatic sending check

Type into a field without opening or confirming Message Refiner. Confirm no AI request is triggered while typing.
