/**
 * Verifica variáveis obrigatórias antes do build.
 * Falha o processo com mensagem clara se houver algo faltando.
 */
const REQUIRED = [
  'DATABASE_URL' // Banco (Neon/Postgres ou SQLite file)
  // Adicione mais se necessário: 'SMTP_HOST','SMTP_USER','SMTP_PASS','MAIL_FROM'
];

const missing = REQUIRED.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
if (missing.length) {
  console.error('❌ Variáveis de ambiente obrigatórias ausentes:\n - ' + missing.join('\n - '));
  console.error('\nCorrija em:\n - .env (local) e/ou\n - Vercel → Project → Settings → Environment Variables');
  process.exit(1);
}

console.log('✅ Check ENV OK:', REQUIRED.join(', '));
