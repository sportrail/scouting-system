# S³ v13 Parte 1 — Supabase Auth (dark launch)

Este ZIP contém 8 ficheiros que adicionam login por magic link à app S³, **sem tocar na app principal**. Os formandos continuam a ver exactamente o que viam antes — só quem souber a URL `/login?preview=1` consegue aceder enquanto o dark launch estiver activo.

## Conteúdo do ZIP

```
v13-part1/
├── package.json                        (SUBSTITUI o existente)
├── middleware.js                       (NOVO, na raiz do repo)
├── .env.local.example                  (NOVO, na raiz do repo)
├── lib/
│   └── supabase/
│       ├── client.js                   (NOVO)
│       └── server.js                   (NOVO)
└── app/
    ├── login/
    │   ├── page.js                     (NOVO)
    │   └── success/
    │       └── page.js                 (NOVO)
    └── auth/
        └── callback/
            └── route.js                (NOVO)
```

**8 ficheiros no total.** A estrutura de pastas é idêntica à do repo — basta fazer upload para a raiz e o GitHub preserva as pastas.

---

## Como fazer o upload no GitHub (passo-a-passo)

### Opção A — Upload do ZIP completo (mais rápido, recomendado)

1. **Descompacta o ZIP** no teu computador (clica-duplo ou botão direito → Extrair).
2. Abre o terminal / file explorer na pasta `v13-part1` que saiu do ZIP.
3. Vai a `github.com/sportrail/sportrail-scouting` no browser.
4. Clica em **Add file → Upload files**.
5. **Arrasta a pasta `v13-part1` inteira** para a caixa de upload. O GitHub web **preserva a estrutura de pastas automaticamente** — vais ver `lib/supabase/client.js`, `app/login/page.js`, etc.
6. ⚠️ **IMPORTANTE**: antes de fazer commit, **remove a pasta `v13-part1/` do path** renomeando cada ficheiro no GitHub para tirar o prefixo `v13-part1/`. Alternativa mais limpa: arrasta **os ficheiros de dentro** da pasta (não a pasta em si), para que fiquem directamente na raiz.
7. Mensagem de commit:
   ```
   v13 part 1: Supabase auth with magic link (dark launch)
   ```
8. **Commit directly to the main branch** (ou cria uma branch se preferires ter PR com review).

### Opção B — Upload ficheiro a ficheiro (se o drag-and-drop te der problemas)

Para cada ficheiro, no GitHub web:

1. Navega até à pasta certa (ex. `lib/supabase/`). Se a pasta não existir:
   - Clica em **Add file → Create new file**
   - No nome do ficheiro escreve o caminho completo: `lib/supabase/client.js` — o GitHub cria as pastas automaticamente
   - Cola o conteúdo
   - Commit
2. Para o `package.json` que já existe, navega até ele, clica no lápis ✏️, cola o novo conteúdo, commit.

---

## ⚠️ Antes de testar — 3 coisas para configurar no Vercel

Depois do commit, o Vercel vai fazer build automático. **Mas o login só funciona se tiveres estas 3 variáveis de ambiente configuradas.**

Vai a `vercel.com` → projecto `sportrail-scouting` → **Settings** → **Environment Variables** → **Add New**:

| Nome | Valor | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://amjzgfwndngdilvebaxz.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (a tua anon key do Supabase) | Production, Preview, Development |
| `NEXT_PUBLIC_ENABLE_AUTH` | `false` | Production, Preview, Development |

Depois vai a **Deployments** → clica na mais recente → **⋯** → **Redeploy** (com "Use existing Build Cache" ligado para ser rápido).

---

## Testar o login

Depois do redeploy (~1 minuto), vai a:

```
https://sportrail-scouting.vercel.app/login?preview=1
```

O `?preview=1` é o truque para bypassar o dark launch — só tu sabes dele. Sem o `?preview=1`, qualquer formando que tropece no URL `/login` vê uma mensagem "em breve".

**Fluxo de teste:**

1. Mete **código de curso** qualquer (ex. `TESTE`)
2. Mete o **teu email real**
3. Clica **Receber link de acesso**
4. Deves ver "📧 Email enviado"
5. Vai ao inbox (pode estar em **Spam** na primeira vez — vem do domínio `supabase.io`)
6. Clica no botão **Log In** do email
7. Redireciona para `/login/success`
8. Deves ver "✅ Sessão iniciada" + o teu email + o código `TESTE`

Se chegares aqui — **a Parte 1 está a funcionar**. 🎉

---

## Se alguma coisa falhar

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Build do Vercel falha | Faltam as env vars | Verifica que as 3 `NEXT_PUBLIC_*` estão configuradas |
| `/login` aparece em branco ou com erro | `NEXT_PUBLIC_SUPABASE_URL` não está setado | Redeploy depois de adicionar |
| "Invalid redirect URL" no email | Redirect URL não configurada no Supabase | Vai ao Supabase → Auth → URL Configuration → adiciona `https://sportrail-scouting.vercel.app/auth/callback` |
| Email não chega | Está no spam, ou rate limit do plano Free (4/hora) | Espera 15min ou verifica spam |
| "Email rate limit exceeded" | Plano free do Supabase limita a 4/hora globalmente | Espera 1h — passa automaticamente |

Qualquer erro no browser, abre **F12 → Console** e copia a mensagem para me mostrares na próxima sessão.

---

## O que NÃO vai mudar na app principal

- Os utilizadores que visitam `/` continuam a ver a app exactamente como antes
- Os relatórios continuam em `localStorage` (não migram para a cloud nesta Parte 1)
- Nenhum botão novo aparece na sidebar ou no header da app
- A feature flag `NEXT_PUBLIC_ENABLE_AUTH=false` esconde tudo

Só quem souber a URL `/login?preview=1` consegue chegar ao formulário. É por design — estamos em dark launch.

---

## Próximos sprints

- **v13 Parte 2**: tabela `courses` + CRUD admin + validação do código
- **v13 Parte 3**: migração `localStorage → Supabase` no primeiro login
- **v13 Parte 4**: sync bidirecional com offline queue
- **v13 Parte 5**: dashboard `/admin` para formadores verem a turma
