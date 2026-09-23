// Texto legible de un correo crudo (MIME): elige la parte de texto y la decodifica.
// Se usa para los correos que llegan a soporte@ desde el Worker de Cloudflare.

type Part = { headers: string; body: string };

const split = (raw: string): Part => {
  const normal = raw.replace(/\r\n/g, "\n");
  const corte = normal.indexOf("\n\n");
  return corte < 0 ? { headers: normal, body: "" } : { headers: normal.slice(0, corte), body: normal.slice(corte + 2) };
};

const header = (headers: string, name: string) => {
  // Las cabeceras pueden seguir en la línea siguiente si empieza con espacio.
  const plegadas = headers.replace(/\n[ \t]+/g, " ");
  const match = plegadas.match(new RegExp(`^${name}:(.*)$`, "im"));
  return match ? match[1].trim() : "";
};

const fromBase64 = (body: string) => {
  try {
    return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
  } catch {
    return body;
  }
};

// =XX en hexadecimal (bytes que luego se leen como UTF-8); "=" al final de línea: la línea sigue.
const fromQuoted = (body: string) => {
  const bytes: number[] = [];
  const texto = body.replace(/=\n/g, "");
  for (let i = 0; i < texto.length; i++) {
    const hex = texto[i] === "=" ? texto.slice(i + 1, i + 3) : "";
    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(...Buffer.from(texto[i], "utf8"));
    }
  }
  return Buffer.from(bytes).toString("utf8");
};

const decode = (part: Part) => {
  const encoding = header(part.headers, "Content-Transfer-Encoding").toLowerCase();
  const body = encoding === "base64" ? fromBase64(part.body) : encoding === "quoted-printable" ? fromQuoted(part.body) : part.body;
  return header(part.headers, "Content-Type").toLowerCase().includes("text/html") ? stripHtml(body) : body;
};

const stripHtml = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

export function emailText(raw: string) {
  const mensaje = split(raw);
  const tipo = header(mensaje.headers, "Content-Type");
  const boundary = tipo.match(/boundary="?([^";]+)"?/i)?.[1];

  if (!boundary) return decode(mensaje).trim();

  // Correo con varias partes: preferir texto plano; si no hay, usar el HTML.
  const partes = mensaje.body.split(`--${boundary}`).slice(1, -1).map((p) => split(p.replace(/^\n/, "")));
  const plano = partes.find((p) => header(p.headers, "Content-Type").toLowerCase().includes("text/plain"));
  const html = partes.find((p) => header(p.headers, "Content-Type").toLowerCase().includes("text/html"));
  const anidado = partes.find((p) => header(p.headers, "Content-Type").toLowerCase().includes("multipart/"));

  if (plano) return decode(plano).trim();
  if (html) return decode(html).trim();
  if (anidado) return emailText(`${anidado.headers}\n\n${anidado.body}`);
  return decode(mensaje).trim();
}
