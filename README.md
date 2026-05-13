# TextPilot

TextPilot e uma extensao Chrome Manifest V3 para uso pessoal ou interno que ajuda a reescrever textos selecionados em campos de escrita. O foco e transformar textos informais em mensagens mais claras, profissionais, objetivas e adequadas ao ambiente corporativo.

## 1. Objetivo do projeto

- Melhorar trechos selecionados pelo usuario em qualquer site.
- Evitar comportamento de keylogger: a extensao nao captura tudo que o usuario digita.
- Enviar texto para IA somente apos acao explicita do usuario.
- Manter chave de API fora do content script e da pagina visitada.
- Permitir evoluir para publicacao futura na Chrome Web Store.

## 2. Instalar dependencias

```bash
npm install
```

## 3. Gerar build

```bash
npm run build
```

O build final sera gerado em `dist/`.

## 4. Carregar no Chrome em modo desenvolvedor

1. Abra `chrome://extensions`.
2. Ative `Developer mode`.
3. Clique em `Load unpacked`.
4. Selecione a pasta `dist/`.

## 5. Configurar OpenRouter

1. Abra o popup da extensao ou a pagina de opcoes.
2. Selecione `OpenRouter`.
3. Use uma URL base como `https://openrouter.ai/api/v1`.
4. Informe a chave de API.
5. Informe o modelo desejado, por exemplo `openai/gpt-4o-mini` ou outro modelo disponivel na sua conta.
6. Crie ou consulte suas chaves em `https://openrouter.ai/workspaces/default/keys`.

A chamada usa endpoint estilo OpenAI Chat Completions: `/chat/completions`.

## 6. Configurar Google Gemini

1. Abra o popup da extensao ou a pagina de opcoes.
2. Selecione `Google Gemini`.
3. Use a URL base `https://generativelanguage.googleapis.com/v1beta`.
4. Informe a chave criada no Google AI Studio.
5. Informe o modelo desejado, por exemplo `gemini-2.5-flash`.
6. Crie ou consulte suas chaves em `https://aistudio.google.com/app/api-keys`.

A chamada usa o endpoint REST `generateContent`: `/models/{model}:generateContent`.

## 7. Configurar Ollama/local

1. Rode o Ollama localmente.
2. Selecione `Ollama/local`.
3. Use uma URL base como `http://localhost:11434`.
4. Informe o modelo local, por exemplo `llama3.1`.
5. Escolha `/api/chat` ou `/api/generate`.
6. Consulte a documentacao da API em `https://docs.ollama.com/api`.

Dependendo da configuracao local, chamadas a Ollama podem exigir ajuste de CORS, host, firewall ou um proxy local. Para uso corporativo, o caminho mais previsivel e um backend intermediario.

## 8. Como usar

1. Escreva um texto em `textarea`, `input text`, `input search`, `contenteditable` ou editor rico detectavel.
2. Clique no campo. A extensao mostra um icone pequeno `TP` no canto inferior direito do campo ativo.
3. Se quiser melhorar apenas um trecho, selecione o texto antes de clicar no icone.
4. Revise o texto que sera enviado.
5. Escolha acao, idioma e tom.
6. Clique em `Enviar para IA`.
7. Revise o resultado.
8. Use `Aceitar e adicionar ao final`, `Substituir selecao`, `Copiar` ou `Descartar`.

O comportamento padrao e adicionar o texto revisado ao final do campo original. Substituir a selecao exige clique explicito.

## 9. Modos de UX

TextPilot usa uma estrategia em camadas para evitar depender de um unico tipo de campo:

1. `Icone no campo ativo`: usado em `textarea`, `input`, `contenteditable` e editores ricos detectaveis; o icone aparece no canto inferior direito do campo focado.
2. `Iframes`: cada frame renderiza seu proprio icone dentro do proprio documento. Ao clicar, o painel tenta abrir no frame principal para evitar ficar preso em editores pequenos.
3. `Extension Popup`: o botao `Usar selecao atual` no popup abre o painel na pagina atual quando ha selecao ou campo editavel em foco.
4. `Menu de contexto`: selecione um texto, clique com o botao direito e use `TextPilot: melhorar texto selecionado`.
5. `Atalho de teclado`: por padrao, `Ctrl+Shift+F` no Windows/Linux e `Command+Shift+F` no macOS abrem o painel com a selecao atual quando o Chrome registra o atalho. Se houver conflito, configure em `chrome://extensions/shortcuts`.

Quando a extensao nao consegue inserir automaticamente com seguranca, ela copia o resultado para a area de transferencia e informa o usuario.

## 10. Limitacoes conhecidas

- Editores ricos de Gmail, Outlook Web, Jira, GLPI, WhatsApp Web e Teams Web podem variar por versao, DOM interno e iframe.
- O adaptador `contenteditable` cobre o padrao DOM Selection, mas alguns editores podem exigir adaptadores especificos.
- O fallback seguro permite copiar o resultado quando nao for possivel inserir automaticamente.
- A extensao nao mantem historico dos textos enviados.
- A deteccao de dados sensiveis e uma camada local preventiva, nao uma solucao DLP completa.

## 11. Riscos de privacidade

- O texto selecionado e enviado ao provedor de IA configurado pelo usuario.
- Chaves em `chrome.storage.local` ficam no navegador local; isso e melhor do que expor chave ao site, mas nao substitui um backend seguro.
- Para uso corporativo real ou publicacao ampla, use backend intermediario com autenticacao, auditoria, rate limit, mascaramento e rotacao de credenciais.
- Nao envie dados pessoais, segredos, tokens ou informacoes confidenciais sem politica clara.

## 12. Por que nao captura digitacao automaticamente

O content script observa eventos locais de foco, selecao, input, teclado, scroll e resize apenas para identificar o campo editavel ativo e posicionar o icone. Ele nao envia nada durante a digitacao, nao registra texto no console e nao salva historico. A chamada para IA so acontece apos acao explicita: icone, popup, menu de contexto ou atalho.

## 13. Uso interno vs Chrome Web Store

Para uso pessoal ou interno, carregar `dist/` em modo desenvolvedor pode ser suficiente. Para Chrome Web Store, revise:

- Politica de permissoes e justificativa de `<all_urls>`.
- Politica de privacidade.
- Icones e materiais de loja.
- Consentimento claro antes de enviar texto a terceiros.
- Possivel troca de chave local por backend intermediario.

## 14. Proximos passos recomendados

- Criar adaptadores especificos para editores usados internamente.
- Adicionar testes unitarios para `SensitiveDataGuard`, `PromptBuilder` e adaptadores.
- Adicionar backend proxy para provedores de IA.
- Implementar mascaramento opcional antes do envio.
- Criar icones finais e revisar a experiencia de onboarding.

## Permissoes

- `storage`: salva configuracoes locais da extensao.
- `clipboardWrite`: permite copiar o texto revisado.
- `contextMenus`: adiciona o fallback pelo botao direito em textos selecionados.
- `activeTab`: permite que popup e atalho solicitem abertura do painel na aba ativa.
- `scripting`: permite ativar o content script dinamicamente quando a pagina estava aberta antes da extensao carregar.
- `host_permissions: <all_urls>` e `content_scripts.matches: <all_urls>`: necessarios para operar em campos de escrita de sites variados e para permitir endpoints configuraveis. O codigo aplica allowlist/blocklist por configuracao para reduzir o escopo operacional no uso diario.
- `content_scripts.all_frames: true`: necessario para editores ricos que rodam dentro de iframes, caso comum em ferramentas corporativas.

## Diagnostico de editores ricos

Em paginas como GLPI, o campo visivel pode ser um editor rico em `div[contenteditable="true"]`, nao um `textarea`. Para confirmar no DevTools, clique dentro do editor, selecione um texto e rode:

```js
const selection = window.getSelection();
const node = selection?.anchorNode;
const element = node instanceof Element ? node : node?.parentElement;
const editor = element?.closest('[contenteditable]:not([contenteditable="false"])');

console.log({
  selectedText: selection?.toString(),
  activeElement: document.activeElement,
  editor,
  editorText: editor?.innerText,
  editorHtml: editor?.innerHTML
});
```

Se `document.activeElement` for um `iframe`, abra o frame no DevTools ou use `all_frames: true`, pois a selecao real esta no documento interno do editor.

A extensao tambem expõe um helper de diagnostico seguro, sem retornar o texto selecionado. Depois de selecionar um trecho, rode:

```js
await window.__textpilotDebugSelection?.()
```

Ele informa se a selecao esta em frame, o tamanho do texto selecionado, o elemento ativo, o `contenteditable` detectado e o retangulo usado para posicionar o botao.

## Arquitetura

```text
src/
  background/        service worker e coordenacao de IA
  content/           ActiveEditorTracker, icone no campo, UI injetada e adaptadores
  ai/                provedores OpenRouter, Gemini, Ollama e OpenAI custom
  privacy/           SensitiveDataGuard local
  storage/           acesso a chrome.storage.local
  shared/            tipos, constantes e erros
  popup/             configuracao rapida
  options/           configuracao completa
  styles/            CSS do content script
```
