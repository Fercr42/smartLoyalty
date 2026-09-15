import fs from "node:fs";
import path from "node:path";

// En local lee .env.local (Next.js no lo carga en modo prueba); en GitHub Actions las variables vienen de los secretos.
const file = path.join(process.cwd(), ".env.local");
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]] && match[2] !== "") process.env[match[1]] = match[2];
  }
}
