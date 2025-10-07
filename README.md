# EDUC — README Operacional

Base Next.js 15 + React 19 + TypeScript + Tailwind + PWA (next-pwa) + Prisma.

---

## ✅ Requisitos

- **Node.js**: 20.x LTS ou 22.x (verifique com `node -v`)
- **pnpm**: 10.x (`corepack enable` e `corepack prepare pnpm@10.0.0 --activate`)
- **Banco local** (dev): SQLite via Prisma (sem dependências extras)
- **Banco prod**: configure `DATABASE_URL` (Neon/Postgres recomendado)

---

## 🚀 Setup local

```bash
# 1) Instalar deps
pnpm install

# 2) Variáveis de ambiente
cp -n .env.example .env   # edite .env conforme necessário

# 3) Prisma: gerar client e preparar DB
pnpm dlx prisma generate
pnpm dlx prisma migrate dev --name init

# 4) Rodar em desenvolvimento
pnpm dev

# 5) (Opcional) Abrir Prisma Studio
pnpm dlx prisma studio
O build de produção (e o Service Worker do PWA) é gerado com pnpm build.

📱 Instalar o PWA no navegador
Pré-requisito: o projeto deve estar em produção (build feito) e servido via HTTPS.

Chrome/Edge (Desktop): acesse o site → ícone de “Instalar app” na barra de endereço → Instalar.

Android (Chrome): acesse o site → menu ⋮ → Adicionar à tela inicial → Instalar.

iOS (Safari): acesse o site → botão Share → Adicionar à Tela de Início → Adicionar.

No modo instalado (display-mode: standalone) aplicam-se estilos específicos definidos em styles/globals.css.

🗂️ Estrutura de pastas
pgsql
Copiar código
.
├── app
│   ├── (auth)
│   │   └── login
│   │       └── page.tsx
│   ├── (app)
│   │   └── dashboard
│   │       └── page.tsx
│   └── layout.tsx
├── components/
├── lib/
│   └── db.ts
├── prisma/
│   ├── schema.prisma
│   └── dev.db               # (gitignored)
├── public/
│   ├── manifest.json
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── styles/
│   └── globals.css
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.js
├── package.json
├── tsconfig.json
└── .env / .env.example
🔧 Comandos principais
bash
Copiar código
# Desenvolvimento
pnpm dev

# TypeScript (sem emitir)
pnpm typecheck

# Build de produção (gera SW do PWA)
pnpm build

# Servir build
pnpm start

# Prisma
pnpm dlx prisma generate
pnpm dlx prisma migrate dev --name <nome>
pnpm dlx prisma migrate deploy
pnpm dlx prisma studio
🧩 Convenções de código
TypeScript estrito (checar com pnpm typecheck).

TailwindCSS para estilos utilitários; tema: primário branco, secundário #0A66FF.

App Router (Next 15), pastas paralelas (auth) e (app).

PWA: configurado com next-pwa em next.config.mjs e public/manifest.json.

Import paths preferir @/... quando configurado em tsconfig.json ("paths").

Sugestão: adotar Prettier/ESLint no projeto (não incluídos por padrão nesta base).

📝 Convenções de commits (Conventional Commits)
Formato: <type>(<scope>): <mensagem>

Types comuns:

feat: nova funcionalidade

fix: correção de bug

chore: manutenção (build, deps)

docs: documentação

refactor: refatoração sem mudança de comportamento

perf: performance

style: formatação (semântica inalterada)

test: testes

Exemplos:

feat(auth): tela de login

fix(db): corrigir URL de conexão em prod

chore(build): ajustar next-pwa em produção

🧪 Fluxo recomendado
Crie uma branch por tarefa: git switch -c feat/auth-login

Commits pequenos e descritivos (padrão acima).

Pull Request com descrição do que mudou e como testar.

CI/CD roda pnpm install, pnpm typecheck, pnpm build.

Merge via squash para manter histórico limpo (opcional).

❓ FAQ rápido
Service Worker não ativa em dev? É esperado: next-pwa desabilita SW em development. Faça pnpm build && pnpm start.

Ícones PWA: substitua os placeholders em public/icons/ por PNGs reais (192/512).

Banco em produção: atualize DATABASE_URL e rode prisma migrate deploy no ambiente prod.

---

## 🚨 ALERTAS (fora do Git)

> **Importante:** Estes passos são feitos **fora do repositório** (Neon, Vercel e provedor SMTP). Não commit suas credenciais/strings.

### 1) Banco de Dados — Neon (Postgres gerenciado)
1. Acesse **https://neon.tech** → *Create new project*.
2. Escolha **Region/Branch** padrão, crie o **Database**.
3. Em **Connection Details**, copie a **Connection string** para Postgres:
   - Formato: `postgresql://<user>:<password>@<host>/<db>?sslmode=require`
4. No projeto local, atualize `.env`:
   ```bash
   DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
Gere/migre o schema:

bash
Copiar código
pnpm dlx prisma generate
pnpm dlx prisma migrate deploy   # produção
# ou, em dev local:
pnpm dlx prisma migrate dev --name init
2) Deploy — Vercel
Acesse https://vercel.com → New Project → Import Git Repository.

Defina o Framework Preset: Next.js.

Configure Build & Output (padrão Next 15):

Build Command: pnpm build

Install Command: pnpm install

Output: .next

Em Settings → Environment Variables, crie:

DATABASE_URL = (string do Neon)

(opcional) NODE_OPTIONS = --max_old_space_size=4096 para builds pesados

(se houver auth/email) variáveis SMTP (abaixo)

Salvar e clique em Deploy.

Após o primeiro deploy, rode:

Em uma action/console CI/CD: pnpm dlx prisma migrate deploy (se necessário).

Verifique PWA:

Site em HTTPS e manifest.json acessível em /manifest.json.

3) E-mail — SMTP (provedor e credenciais)
Escolha um provedor (ex.: Resend, Mailgun, SendGrid, Amazon SES, Brevo).

Crie remetente/domínio (DKIM/SPF se aplicável).

Gere API Key ou credenciais SMTP.

Em .env e no Vercel (Environment Variables), defina:

Para SMTP tradicional:

ini
Copiar código
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_USER=usuario@dominio.com
SMTP_PASS=senha_ou_app_password
SMTP_SECURE=false            # true para 465
MAIL_FROM="EDUC <no-reply@dominio.com>"
Para API (ex.: Resend/Mailgun):

ini
Copiar código
EMAIL_PROVIDER=resend        # ou mailgun/sendgrid
EMAIL_API_KEY=xxxxxxxxxxxx
MAIL_FROM="EDUC <no-reply@dominio.com>"
Faça um teste de envio em ambiente seguro (não commitar chaves).

Dica: use variáveis distintas por ambiente (Development/Preview/Production no Vercel). Nunca exponha secrets no repositório.


---

## ⚙️ CI no Vercel (build com checagem de ENV)

Este repo inclui **CI de build** no Vercel configurada via `vercel.json`:

- **Install Command**: `pnpm install --frozen-lockfile`
- **Build Command**: `node scripts/check-env.mjs && pnpm build`
  - O script `scripts/check-env.mjs` verifica variáveis obrigatórias (ex.: `DATABASE_URL`) e **interrompe o build** se estiverem ausentes.

### Como ativar/monitorar

1. Vercel → *New Project* → importe o repositório.
2. **Settings → Environment Variables**:
   - `DATABASE_URL` = string do Neon (obrigatória).
   - (opcional) SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
3. **Build & Output**:
   - **Install Command**: `pnpm install --frozen-lockfile`
   - **Build Command**: `node scripts/check-env.mjs && pnpm build`
4. **Deploy** e acompanhe em **Activity/Deployments**:
   - Logs mostram a checagem de ENV no início.
   - Use *Redeploy* após corrigir variáveis.

> Mais detalhes: `docs/ci/VERCEL.md`.

---

## 🌱 Seed de desenvolvimento

Para popular o banco com dados de exemplo (usuário demo, 1 turma, 2 chamadas e 2 conteúdos):

```bash
# 1) Configure o .env com DATABASE_URL (Neon ou Postgres local)
cp -n .env.example .env  # edite .env

# 2) Aplique migrations (ou crie se for a primeira vez)
pnpm dlx prisma migrate dev --name init

# 3) Gere o client do Prisma
pnpm prisma:gen

# 4) Rode o seed
pnpm db:seed
O script prisma/seed.ts usa tsx e é executado via prisma db seed.

---

## 📦 Versionamento, Releases & Publicação

### Políticas de Versionamento (SemVer)
Adotamos **SemVer** `MAJOR.MINOR.PATCH`:
- **MAJOR**: mudanças incompatíveis (ex.: migrações destrutivas).
- **MINOR**: novas funcionalidades compatíveis.
- **PATCH**: correções e melhorias internas.

**Convenções de tags e releases**  
- Crie uma tag anotada:  
  \`\`\`bash
  git tag -a vX.Y.Z -m "EDUC vX.Y.Z: resumo da release"
  git push origin vX.Y.Z
  \`\`\`
- Abra uma **Release** no GitHub/GitLab com:
  - Notas (features, fixes, breaking changes)
  - Instruções de migração (se houver)
  - Checksum/artefatos (opcional)

**Branches sugeridas**
- `main`: estável/publicável.
- `develop`: integração contínua.
- `feat/*`, `fix/*`, `chore/*`: trabalho diário.
- `release/*`: hardening antes de tag.

> Dica: mantenha o \`CHANGELOG.md\` (gerado por Conventional Commits) atualizado a cada release.

---

### 🔁 Fluxo de Rollback Rápido
1. **Vercel – Reverter Deploy**
   - Abra o projeto na Vercel → **Deployments** → selecione um deployment saudável → **Rollback**.
   - Confirme e verifique status/health endpoints.

2. **Git – Reverter Tag/Commit**
   - Para voltar a um commit estável:
     \`\`\`bash
     git revert <sha>
     git push origin main
     \`\`\`
   - Para voltar a uma versão tagueada:
     \`\`\`bash
     git checkout vX.Y.Z
     # (opcional) criar hotfix branch a partir da tag
     git checkout -b hotfix/from-vX.Y.Z
     \`\`\`

3. **Banco (Prisma/Neon) – Migrações**
   - **Reversíveis**: executar \`prisma migrate resolve\` + \`prisma migrate deploy\` com estado de volta (ex.: marcar migração como \`rolled back\` e re-rodar).
   - **Irreversíveis/destrutivas**:
     - Restaurar **snapshot** no Neon (ponto no tempo).
     - Alternativa segura: manter migrações **forward-only** e aplicar *hotfix* compatível.
   - Verificação rápida:
     \`\`\`bash
     pnpm prisma:gen && pnpm prisma:deploy
     \`\`\`

4. **PWA/Cache**
   - Forçar atualização do SW: incremente \`runtimeCaching\`/versão no \`next-pwa\` (ou mude \`manifest\`) e re-deploy.
   - Orientar usuários: recarregar/fechar e abrir PWA (banners e "Atualização disponível").

> **Tempo de recuperação**: priorize rollback de deploy **antes** de mexer em schema. O banco é a fonte de verdade.

---

### 🚀 Checklist Antes de Publicar (Vercel & Lojas/PWA)

**Build & Variáveis**
- [ ] \`pnpm build\` concluído sem erros.
- [ ] \`.env\` com \`DATABASE_URL\` e \`JWT_SECRET\` definidos no Vercel (Project → Settings → Environment Variables).
- [ ] \`vercel.json\` atualizado (rotas, headers, preview protection se necessário).
- [ ] \`tools/doctor.sh\` executado e GREEN.

**PWA – Manifesto & Service Worker**
- [ ] \`public/manifest.json\` com:
  - [ ] \`name\` = \`EDUC\`, \`short_name\` = \`EDUC\`
  - [ ] \`theme_color\` = \`#0A66FF\`, \`background_color\` condizente (light/dark)
  - [ ] \`display\` = \`standalone\`
  - [ ] \`start_url\` = \`/\`
  - [ ] Ícones multi-resolução (192, 256, 384, 512)
- [ ] **Service Worker** habilitado com \`next-pwa\` (produção).
- [ ] **Offline-first básico** testado (páginas chave acessíveis offline).
- [ ] **Update flow**: confirmação de que um novo deploy atualiza o SW (versão/cache bust).

**Meta Tags & A2HS (Add to Home Screen)**
- [ ] \`<meta name="theme-color" content="#0A66FF">\` em \`app/layout.tsx\`.
- [ ] Ícones \`apple-touch-icon\` (p/ iOS).
- [ ] \`maskable\` icons em \`manifest.json\` para cortes adequados.
- [ ] Splash screens (iOS) — se aplicável via meta/apple-touch-startup-image.
- [ ] Testar **Install banners** (Chrome/Android) e **Add to Home Screen** (iOS Safari).

**Acessibilidade & UX**
- [ ] Focus visible e contraste AA revisados (light/dark).
- [ ] Áreas de toque ≥ 44px (botões-chave).
- [ ] Labels/aria nos formulários (login/registro/recuperação, classes, conteúdos).
- [ ] Testar navegação por teclado e leitores de tela em fluxos críticos.

**Desempenho & Observabilidade**
- [ ] Métricas básicas habilitadas (\`lib/metrics.ts\` placeholders).
- [ ] TTFB offline/latência de sync sem regressões.
- [ ] Logs de API na Vercel verificados (limites e cold starts).

**Segurança**
- [ ] Cookies \`httpOnly\` e SameSite/secure revisados.
- [ ] JWT HS256 com segredo forte.
- [ ] Headers recomendados (CSP, Referrer-Policy, X-Content-Type-Options) se necessário via \`next.config.mjs\`/middleware.

**Release & Tag**
- [ ] Atualizar \`CHANGELOG.md\`.
- [ ] Criar tag \`vX.Y.Z\` e publicar Release com notas e instruções.
- [ ] Registrar migrações aplicadas e plano de rollback.

**Pós-publicação**
- [ ] Validar instalação do PWA em Android e iOS.
- [ ] Verificar imagens/ícones em diferentes densidades (1x/2x/3x).
- [ ] Smoke tests: login → dashboard → classes → chamada → conteúdo → export JSON.

> **Dica**: automatize parte desse checklist em CI (build, typecheck, lint, smoke end-to-end opcional).

