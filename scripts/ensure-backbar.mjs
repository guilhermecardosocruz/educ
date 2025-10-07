import fs from "fs";

const file = "app/(app)/dashboard/page.tsx";

// 1) Lê o arquivo
if (!fs.existsSync(file)) {
  console.error("❌ Arquivo não encontrado:", file);
  process.exit(1);
}
let s = fs.readFileSync(file, "utf8");

// 2) Garante import do BackBar
if (!s.includes('components/BackBar')) {
  s = `import BackBar from "@/components/BackBar";\n` + s;
}

// 3) Insere <BackBar /> antes do </main> se não existir
if (/<\/main>\s*$/.test(s) && !s.includes("<BackBar")) {
  s = s.replace(/<\/main>\s*$/m, `  <BackBar />\n</main>\n`);
}

fs.writeFileSync(file, s);
console.log("✅ Dashboard integrado ao BackBar com segurança.");
