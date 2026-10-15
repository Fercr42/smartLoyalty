import type { NextConfig } from "next";

// Cabeceras de seguridad para todo el sitio.
// - nosniff: el navegador no adivina tipos (un archivo nunca se ejecuta como algo que no es).
// - frame-ancestors / X-Frame-Options: nadie puede meter el panel en un iframe para engañar clics.
// - Referrer-Policy: los enlaces a otros sitios (Google, Instagram) no reciben la URL completa,
//   que puede llevar el código de la tarjeta del cliente (?m=).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
