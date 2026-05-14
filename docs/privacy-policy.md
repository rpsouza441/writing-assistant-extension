# Política de Privacidade — Message Refiner

Ultima atualizacao: 14 de maio de 2026

## O que e o Message Refiner

Message Refiner e uma extensao para Google Chrome que ajuda o usuario a refinar textos selecionados usando inteligencia artificial. A extensao foi criada para transformar textos em mensagens mais claras, profissionais e objetivas.

A versao atual esta em beta e deve ser usada com revisao cuidadosa antes de qualquer distribuicao ampla.

## Como o texto e processado

A extensao nao envia texto automaticamente enquanto o usuario digita. O envio de texto para refinamento ocorre somente apos uma acao explicita do usuario, como abrir o painel da extensao e confirmar o envio.

Antes do envio, o usuario pode revisar o texto que sera processado. Depois que a resposta da IA e gerada, o usuario tambem pode revisar o resultado antes de copiar, inserir ou substituir qualquer texto no campo original.

## Dados que podem ser processados

Dependendo do texto selecionado pelo proprio usuario, a extensao pode processar:

- conteudo do site em que a extensao esta sendo usada;
- comunicacoes pessoais ou profissionais;
- informacoes de identificacao pessoal, como nomes, e-mails, telefones ou dados similares, caso estejam no texto selecionado;
- informacoes de autenticacao configuradas localmente pelo usuario, como chave de API do provedor de IA.

O usuario e responsavel por revisar textos sensiveis antes de envia-los a provedores externos.

## Provedores de IA

Quando o usuario confirma o envio, o texto selecionado pode ser enviado ao provedor de IA configurado pelo proprio usuario. Os provedores possiveis incluem:

- OpenRouter;
- Ollama/local;
- endpoint customizado compativel com OpenAI.

No caso de Ollama/local, os dados podem permanecer no ambiente local, dependendo da configuracao do usuario.

No caso de provedores remotos, os dados enviados podem estar sujeitos aos termos e a politica de privacidade do provedor escolhido pelo usuario.

## Historico e armazenamento local

Message Refiner nao mantem historico dos textos refinados.

As configuracoes da extensao podem ser armazenadas localmente no navegador usando os mecanismos de armazenamento do Chrome. A chave de API, quando configurada pelo usuario, tambem fica armazenada localmente no navegador.

## Publicidade e venda de dados

Message Refiner nao vende dados.

Message Refiner nao usa dados para publicidade.

## Dados sensiveis

A extensao pode alertar ou bloquear o envio de possiveis dados sensiveis conforme a configuracao existente. Essa protecao e uma camada preventiva e nao substitui politicas internas, revisao humana ou solucoes corporativas de prevencao de vazamento de dados.

## Uso corporativo

O uso corporativo pode exigir uma politica interna propria da empresa, alem de controles adicionais como backend intermediario, autenticacao, auditoria, mascaramento de dados, rotacao de chaves e regras internas de seguranca.

## Contato

Para duvidas sobre esta politica, entre em contato com o responsavel pelo repositorio ou pela distribuicao da extensao.
