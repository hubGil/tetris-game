# Tetris Study Project

Projeto de estudo de Tetris construído com TypeScript e Vite, com foco em arquitetura simples, regras clássicas de gameplay, testes automatizados e distribuição como PWA no GitHub Pages.

## Objetivo

Este repositório existe como um ambiente de prática para evoluir um jogo de navegador de forma incremental, trabalhando:

- modelagem de domínio de jogo
- refatoração de código JavaScript para TypeScript
- testes unitários e regressões
- PWA com suporte offline
- automação com GitHub Actions
- publicação com GitHub Pages

O objetivo não é só "ter um Tetris funcionando", mas usar o projeto como base para estudar engenharia de software em um contexto pequeno, visual e iterativo.

## Stack

- TypeScript
- Vite
- Vitest
- Sass
- ESLint
- Prettier
- GitHub Actions
- GitHub Pages

## O que o projeto já cobre

- arena de 12x20
- randomização `7-bag`
- `hold piece`
- `next piece`
- pontuação por linhas
- progressão de level
- `hard drop`
- efeitos sonoros via Web Audio API
- placar local com `localStorage`
- state machine no loop principal do jogo
- suporte touch
- PWA instalável
- funcionamento offline após a primeira carga

## Arquitetura

O projeto está organizado em módulos pequenos com responsabilidades bem definidas:

- [`src/game.ts`](src/game.ts): orquestra o loop principal, transições de estado e ciclo de lock/clear/respawn.
- [`src/player.ts`](src/player.ts): controla peça atual, movimento, rotação, hold, spawn e pontuação.
- [`src/arena.ts`](src/arena.ts): representa a grade, colisões, merge e remoção de linhas.
- [`src/renderer.ts`](src/renderer.ts): desenha arena, peça atual, ghost e efeitos visuais.
- [`src/controls.ts`](src/controls.ts) e [`src/touch-controls.ts`](src/touch-controls.ts): abstraem entrada por teclado e toque.
- [`src/storage.ts`](src/storage.ts): persistência local de recordes.
- [`src/audio.ts`](src/audio.ts): áudio procedural.
- [`src/pwa.ts`](src/pwa.ts): registro do service worker.
- [`vite.config.mjs`](vite.config.mjs): configuração do Vite, base para Pages e geração do service worker.

### Estado do jogo

O loop principal usa estados explícitos:

- `idle`
- `running`
- `paused`
- `flashing`
- `gameover`

Isso evita espalhar flags booleanas e torna as transições mais previsíveis.

## Gameplay

O randomizador usa `7-bag`, ou seja:

- cada ciclo contém exatamente uma ocorrência de cada peça
- a ordem é embaralhada a cada novo bag
- o comportamento é mais justo que aleatório puro

O clear de linhas usa um fluxo em duas etapas:

1. detectar as linhas completas após o lock
2. limpar as linhas após o flash

Esse fluxo já possui testes cobrindo linhas adjacentes e não adjacentes.

## Testes

Os testes ficam em `src/__tests__` e cobrem:

- colisão e limpeza de linhas
- bag randomizer
- movimento e pontuação do player
- state machine básica do game
- sanitização de persistência local

Scripts principais:

```bash
pnpm test:run
pnpm lint
pnpm typecheck
pnpm build
```

## PWA e deploy

O projeto inclui:

- `manifest.webmanifest`
- ícones em `public/icons`
- service worker gerado no build
- workflow de deploy para GitHub Pages

Após a primeira carga bem-sucedida, o app consegue abrir offline usando os assets em cache.

## Segurança e robustez

Por ser um app front-end sem backend, a superfície de ataque é pequena, mas ainda existem cuidados relevantes:

- o placar local agora sanitiza dados vindos de `localStorage`
- a renderização do ranking usa nós DOM em vez de `innerHTML`
- scores inválidos persistidos localmente são normalizados ou descartados
- o service worker só intercepta `GET` same-origin

### Limites atuais

- não existe backend, autenticação ou sincronização remota
- recordes são locais ao navegador/dispositivo
- não há CSP configurada
- o service worker é simples e não implementa estratégias mais finas de atualização

## Estrutura do estudo

Este projeto pode ser evoluído em ciclos, por exemplo:

1. consolidar gameplay clássico
2. endurecer testes de regressão
3. melhorar acessibilidade e UX
4. adicionar métricas, settings e persistência mais rica
5. experimentar refactors arquiteturais maiores

## Como rodar localmente

```bash
pnpm install
pnpm dev
```

Para validar a versão de produção:

```bash
pnpm build
pnpm preview
```

## Pipeline

Os workflows em `.github/workflows` fazem:

- CI com lint, typecheck, testes e build
- deploy automático para GitHub Pages

## Próximos estudos sugeridos

- adicionar testes para renderer e controles
- melhorar atualização do service worker
- adicionar tela de settings
- estudar acessibilidade de teclado e mobile
- isolar regras de scoring em módulo próprio
- criar testes de integração do ciclo completo de lock/clear

## Licença

Projeto mantido para fins de estudo.
