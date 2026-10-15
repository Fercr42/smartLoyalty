// Sirve una imagen guardada como data URL (logo, portada de Wallet, fondo de la tarjeta).
// Solo PNG, JPG, WebP o GIF: un SVG o HTML disfrazado de imagen podría ejecutar código en nuestro dominio.

const SAFE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function dataImageResponse(dataUrl: unknown, missing: string) {
  const match = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(typeof dataUrl === "string" ? dataUrl : "");
  if (!match) return new Response(missing, { status: 404 });
  if (!SAFE_TYPES.has(match[1].toLowerCase())) return new Response("Tipo de imagen no permitido", { status: 415 });
  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1].toLowerCase(),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "public, max-age=300, s-maxage=86400",
    },
  });
}
