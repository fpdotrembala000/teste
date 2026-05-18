# Soundsmith — Playlists com IA no Spotify

App Next.js que cria playlists no Spotify a partir de prompts em linguagem natural,
usando a API da **Anthropic** para curadoria e a API do **Spotify** para
autenticação, busca de músicas, criação de playlists e estatísticas do usuário.

## Recursos

- Login OAuth 2.0 com Spotify (Authorization Code + refresh token)
- **Criar com IA**: prompt em linguagem natural → playlist completa
- **Por inspiração**: cole 1–3 links de playlists; o app analisa e a IA gera uma nova
- **Revisar**: edite nome/descrição, remova/reordene/substitua, gere mais músicas, ajuste tom (mais animada, mais calma…)
- **Modo Descoberta** (artistas/músicas menos óbvios) e **Modo Seguro** (sem faixas explícitas)
- **Exportar** prévia em TXT/JSON/CSV antes de criar no Spotify
- **Histórico** local (localStorage) das playlists geradas
- **Minhas Stats**: top músicas, top artistas, top gêneros, com filtros (curto/médio/longo prazo) e gráficos
- Visual moderno, escuro, responsivo (Tailwind + lucide + recharts)

---

## 1. Pré-requisitos

- Node.js 18.17+ (recomendado 20+)
- npm 9+ (ou pnpm/yarn equivalentes)
- Uma conta no Spotify
- Uma chave da Anthropic (Claude)

---

## 2. Configurar o app no Spotify Developer Dashboard

1. Acesse <https://developer.spotify.com/dashboard> e faça login.
2. Clique em **Create app**.
3. Preencha:
   - **App name**: qualquer (ex: `Soundsmith Local`)
   - **App description**: qualquer
   - **Website**: `http://127.0.0.1:3000`
   - **Redirect URIs**: adicione **exatamente**:
     ```
     http://127.0.0.1:3000/api/auth/spotify/callback
     ```
     > O Spotify exige `127.0.0.1` em vez de `localhost`.
   - **APIs/SDKs used**: marque **Web API**.
4. Salve. Copie o **Client ID** e o **Client Secret**.

---

## 3. Configurar a chave da Anthropic

1. Acesse <https://console.anthropic.com/>.
2. Vá em **API Keys** e crie uma nova chave.
3. Copie-a (ela só é exibida uma vez).

---

## 4. Instalar e configurar o projeto

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo .env.local a partir do exemplo
cp .env.example .env.local
```

Abra `.env.local` e preencha:

```env
ANTHROPIC_API_KEY=sua_chave_da_anthropic
SPOTIFY_CLIENT_ID=seu_client_id
SPOTIFY_CLIENT_SECRET=seu_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/auth/spotify/callback
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
```

---

## 5. Executar

```bash
npm run dev
```

Abra no navegador:

```
http://127.0.0.1:3000
```

> Use **127.0.0.1** (não `localhost`), senão o Spotify rejeita o callback.

---

## 6. Como usar

1. Clique em **Entrar com Spotify** e autorize as permissões.
2. Em **Criar com IA**, escreva um prompt como
   _“Faz uma playlist de hip hop com músicas dos anos 90 e 2000”_,
   ajuste quantidade/idioma/popularidade/energia e clique em **Gerar playlist com IA**.
3. Na tela **Revisar**, edite/remova/reordene músicas. Você pode:
   - Pedir para a IA gerar mais músicas
   - Pedir para substituir as músicas que você removeu
   - Ajustar o tom (mais animada, mais calma, mais antiga, mais atual…)
   - Exportar em TXT/JSON/CSV
4. Clique em **Criar playlist no Spotify**. O app procura cada música no Spotify, monta a playlist na sua conta e mostra um link.
5. Em **Por Inspiração**, cole 1 a 3 links de playlists do Spotify e gere uma nova baseada nelas.
6. Em **Minhas Stats**, veja seus top tracks, artists e genres com filtros de período.

---

## 7. Estrutura do projeto

```
src/
├── app/                       # Next.js App Router
│   ├── api/
│   │   ├── auth/spotify/
│   │   │   ├── login/route.ts        # inicia OAuth
│   │   │   ├── callback/route.ts     # troca code por tokens
│   │   │   ├── me/route.ts           # /me + status de auth
│   │   │   └── logout/route.ts       # limpa cookies
│   │   ├── playlist/
│   │   │   ├── generate/route.ts     # IA monta a playlist
│   │   │   ├── more/route.ts         # IA gera mais músicas
│   │   │   ├── inspire/route.ts      # análise + IA por inspiração
│   │   │   └── create/route.ts       # busca tracks + cria no Spotify
│   │   └── stats/top/route.ts        # top tracks/artists/genres
│   ├── login/page.tsx
│   ├── create/page.tsx
│   ├── review/page.tsx
│   ├── inspire/page.tsx
│   ├── stats/page.tsx
│   ├── history/page.tsx
│   ├── settings/page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx                  # redireciona para /login
├── components/
│   ├── AppShell.tsx              # layout, sidebar, auth guard
│   ├── SectionHeader.tsx
│   ├── Spinner.tsx
│   └── Toaster.tsx
├── lib/
│   ├── anthropic.ts              # geração de playlist via Claude
│   ├── spotify.ts                # OAuth, search, create, top items
│   ├── cookies.ts                # cookies HttpOnly de tokens
│   ├── validators.ts             # zod schemas
│   └── utils.ts                  # helpers (similarity, parse, etc)
├── store/
│   └── usePlaylistStore.ts       # zustand + persist
└── types/
    └── index.ts
```

---

## 8. Segurança

- O **Client Secret da Spotify** e a **chave da Anthropic** ficam apenas no servidor — nunca expostos ao navegador.
- Tokens do Spotify são armazenados em cookies **HttpOnly + SameSite=Lax**.
- O fluxo OAuth valida o parâmetro `state` para evitar CSRF.
- O **refresh token** é usado automaticamente quando o access token expira.

---

## 9. Limitações da API do Spotify

- Não há endpoint público que retorne **horas totais ouvidas** ou histórico completo estilo Wrapped. Por isso a aba **Minhas Stats** mostra apenas os endpoints `top/tracks` e `top/artists`.
- Apps em **Development Mode** no Spotify Dashboard só permitem login para até 25 usuários listados em "Users and Access". Você precisa adicionar seu próprio e-mail lá.
- O `audio-features` foi removido para usuários de apps novos a partir de novembro de 2024 — o app não depende dele.
- Buscar uma música pode retornar versões/ao-vivo/edits diferentes; o app faz fuzzy match para escolher a melhor correspondência.
- Faixas que existem na curadoria da IA mas não estão no catálogo brasileiro do Spotify (ou foram removidas) aparecem em "Não encontradas".

---

## 10. Solução de problemas comuns

| Problema | Causa provável | Solução |
|---|---|---|
| `INVALID_CLIENT: Invalid redirect URI` | URI no dashboard ≠ no `.env.local` | Use **exatamente** `http://127.0.0.1:3000/api/auth/spotify/callback` em ambos |
| Login redireciona com `error=invalid_state` | Cookies bloqueados | Use 127.0.0.1 e o mesmo navegador (sem modo anônimo) |
| `User not registered in the developer dashboard` | App em Development Mode | Adicione seu e-mail em **Users and Access** no Spotify Dashboard |
| `ANTHROPIC_API_KEY não configurada` | `.env.local` ausente ou servidor não foi reiniciado | Reinicie `npm run dev` após editar `.env.local` |
| `Sessão expirada, faça login novamente` | Refresh token revogado/ausente | Saia e entre novamente em **Entrar com Spotify** |
| Muitas músicas não encontradas | IA usou nomes traduzidos/aproximados | Clique em **Gerar outra versão** ou ajuste o prompt |
| Erro 403 ao ler playlist por inspiração | Playlist privada de outro usuário | Use playlists públicas |

---

## 11. Scripts

```bash
npm run dev     # inicia em http://127.0.0.1:3000
npm run build   # build de produção
npm run start   # roda o build em produção
npm run lint    # ESLint
```
