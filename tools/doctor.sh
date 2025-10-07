#!/usr/bin/env bash
set -euo pipefail

# -----------------------------
# EDUC Doctor — diagnóstico local
# -----------------------------

# Cores
if [ -t 1 ]; then
  RED="$(printf '\033[31m')"; GREEN="$(printf '\033[32m')"; YELLOW="$(printf '\033[33m')"; BLUE="$(printf '\033[34m')"; BOLD="$(printf '\033[1m')"; RESET="$(printf '\033[0m')"
else
  RED=""; GREEN=""; YELLOW=""; BLUE=""; BOLD=""; RESET=""
fi

ok()   { echo -e "${GREEN}✔${RESET} $*"; }
warn() { echo -e "${YELLOW}▲${RESET} $*"; }
err()  { echo -e "${RED}✖${RESET} $*"; }
info() { echo -e "${BLUE}i${RESET} $*"; }

FAIL=0

# ---------- Node ----------
info "Checando Node.js…"
if command -v node >/dev/null 2>&1; then
  NODEV="$(node -v | sed 's/^v//')"
  ok "Node encontrado: v${NODEV}"
  # Requerido: >= 18.18 (Next 15/React 19 estável)
  req_major=18; req_minor=18
  major="$(echo "$NODEV" | cut -d. -f1)"
  minor="$(echo "$NODEV" | cut -d. -f2)"
  if [ "$major" -lt "$req_major" ] || { [ "$major" -eq "$req_major" ] && [ "$minor" -lt "$req_minor" ]; }; then
    err "Node muito antigo (>= 18.18 recomendado)."
    echo "   Sugestão: use nvm ou volta para instalar uma versão recente: 20.x LTS."
    FAIL=1
  fi
else
  err "Node.js não encontrado."
  echo "   Sugestão: instale Node 20 LTS e habilite corepack (corepack enable)."
  FAIL=1
fi

# ---------- pnpm ----------
info "Checando pnpm…"
if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm encontrado: $(pnpm -v)"
else
  warn "pnpm não encontrado no PATH."
  echo "   Sugestão: habilite via Corepack:"
  echo "     corepack enable && corepack prepare pnpm@latest --activate"
  FAIL=1
fi

# ---------- .env ----------
info "Checando .env…"
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  warn "Arquivo .env não encontrado na raiz."
  echo "   Sugestão: copie do .env.example e preencha as variáveis:"
  echo "     cp .env.example .env"
  FAIL=1
else
  ok ".env encontrado."
fi

# Carrega variáveis do .env (sem exportar segredos no shell global)
declare -A ENV_VARS
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r k v; do
    # ignora comentários/linhas vazias
    [[ "$k" =~ ^#.*$ || -z "$k" ]] && continue
    # remove aspas externas
    v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
    ENV_VARS["$k"]="$v"
  done < "$ENV_FILE"
fi

required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
)

# Vars opcionais comuns
optional_vars=(
  "NEXT_PUBLIC_APP_URL"
  "NEXT_PUBLIC_PWA_NAME"
)

# Verifica obrigatórias
for key in "${required_vars[@]}"; do
  val="${ENV_VARS[$key]:-${!key:-}}"
  if [ -z "${val:-}" ]; then
    err "Variável obrigatória ausente: ${key}"
    case "$key" in
      DATABASE_URL)
        echo "   Sugestão: no Neon, crie um DB e copie a connection string (Postgres) para DATABASE_URL."
        ;;
      JWT_SECRET)
        echo "   Sugestão: gere um segredo seguro: openssl rand -base64 32"
        ;;
    esac
    FAIL=1
  else
    ok "Variável ${key} definida."
  fi
done

# Sugestão para opcionais
for key in "${optional_vars[@]}"; do
  val="${ENV_VARS[$key]:-${!key:-}}"
  if [ -z "${val:-}" ]; then
    warn "Variável opcional ausente: ${key}"
  else
    ok "Variável opcional ${key} definida."
  fi
done

# ---------- Conectividade Neon (Postgres) ----------
info "Testando conexão ao banco (Neon) usando Prisma…"
DBURL="${ENV_VARS[DATABASE_URL]:-${DATABASE_URL:-}}"
if [ -z "${DBURL:-}" ]; then
  err "Não foi possível testar DB: DATABASE_URL não está definida."
  FAIL=1
else
  if command -v pnpm >/dev/null 2>&1; then
    # Executa um SELECT 1 via Prisma CLI sem afetar schema
    if echo "SELECT 1;" | pnpm exec prisma db execute --stdin --url "$DBURL" >/dev/null 2>&1; then
      ok "Conexão ao banco OK."
    else
      err "Falha ao conectar ao banco com Prisma."
      echo "   Verifique: firewall, IP allowlist no Neon, usuário/senha/host/ssl na DATABASE_URL."
      echo "   Dica: tente localmente: psql \"$DBURL\" -c 'select 1;' (se psql estiver instalado)."
      FAIL=1
    fi
  else
    warn "pnpm indisponível para testar Prisma. Pulando teste de DB."
  fi
fi

# ---------- Dependências do projeto ----------
info "Checando node_modules…"
if [ -d "node_modules" ]; then
  ok "Dependências presentes."
else
  warn "node_modules ausente."
  echo "   Sugestão: instale as dependências:"
  echo "     pnpm install"
fi

# ---------- Build seco ----------
if command -v pnpm >/dev/null 2>&1; then
  info "Rodando verificação rápida (typecheck)…"
  if pnpm -s typecheck >/dev/null 2>&1; then
    ok "Typecheck OK."
  else
    err "Typecheck falhou. Veja erros acima com: pnpm typecheck"
    FAIL=1
  fi
else
  warn "pnpm indisponível para typecheck."
fi

# ---------- Resumo ----------
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo -e "${BOLD}${GREEN}EDUC Doctor: tudo certo!${RESET}"
  echo "Você pode seguir com:"
  echo "  pnpm dev    # executar localmente"
else
  echo -e "${BOLD}${RED}EDUC Doctor encontrou problemas.${RESET}"
  echo "Corrija os itens acima e rode novamente:"
  echo "  ./tools/doctor.sh"
fi
exit "$FAIL"
