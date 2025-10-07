# CI/CD no Vercel — EDUC

Este projeto usa **Vercel** para build/deploy. O arquivo `vercel.json` define:
- `installCommand`: `pnpm install --frozen-lockfile`
- `buildCommand`: `node scripts/check-env.mjs && pnpm build` (checa ENV obrigatórias antes do build)

## Passos para ativar
1. **Importar repositório** no Vercel → *New Project* → selecione seu repo.
2. Em **Project → Settings → Environment Variables**, crie:
   - `DATABASE_URL` (obrigatória — pegue no Neon)
   - (opcional) SMTP/Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
3. Em **General → Framework Preset**, verifique **Next.js**.
4. Em **Build & Development Settings**:
   - **Install Command** = `pnpm install --frozen-lockfile`
   - **Build Command** = `node scripts/check-env.mjs && pnpm build`
5. Clique **Deploy**.

## Monitorar builds e deploys
- **Activity**: histórico de deploys (status, logs, autor).
- **Deployments**: abra um deploy para ver logs detalhados de `install`/`build`.
- **Analytics** (se habilitado): métricas de performance.
- **Env**: use *Preview/Production* para separar valores por ambiente.
- **Re-Deploy**: clique em *Redeploy* quando ajustar envs/segredos.

## Dicas
- Falha de ENV: a checagem mostra quais chaves faltam logo no início do build.
- Atualize ENV e rode *Redeploy*. Não comite credenciais no Git.
