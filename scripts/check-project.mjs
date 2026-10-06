import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const required = [
  "package.json", "package-lock.json", "netlify.toml", "next.config.ts", "tsconfig.json", "next-env.d.ts", "middleware.ts",
  "app/layout.tsx", "app/page.tsx", "app/globals.css", "app/api/health/route.ts", "db/schema.ts", "db/index.ts", "drizzle.config.ts",
  "lib/api.ts", "lib/auth.ts", "lib/db.ts", "lib/client.ts", "lib/pure.ts", "lib/flow.ts", "lib/places.ts", "lib/profit.ts",
  "lib/billing.ts", "lib/settings.ts", "lib/setup.ts", "lib/routing.ts", "lib/notify.ts", "lib/whatsapp.ts", "lib/daily.ts",
  "netlify/functions/daily-maintenance.mts", "public/sw.js", "public/offline.html", "public/manifest.webmanifest",
  "public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/apple-touch-icon.png",
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length) {
  for (const path of missing) console.error(`FALTA: ${path}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
for (const icon of manifest.icons) {
  if (!existsSync(join("public", icon.src))) throw new Error("Ícone do manifesto ausente.");
}

const directory = "netlify/database/migrations";
const migrations = readdirSync(directory).filter((name) => name.endsWith(".sql") || existsSync(join(directory, name, "migration.sql"))).sort();
if (migrations.length < 3 || !migrations[0].includes("enable_extensions") || !migrations.some((name) => name.includes("create_agro_frete")) || !migrations.at(-1).includes("seed_reference_data")) throw new Error("As migrações de instalação estão incompletas ou fora de ordem.");

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
for (const section of ["dependencies", "devDependencies"]) {
  for (const [name, version] of Object.entries(packageJson[section])) {
    if (lock.packages[""][section][name] !== version) throw new Error(`Dependência fora de sincronia: ${name}`);
  }
}
console.log(`Estrutura verificada: ${required.length} arquivos essenciais e ${migrations.length} migrações.`);
