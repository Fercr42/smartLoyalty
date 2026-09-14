// URL pública del sitio. Los enlaces que ven los clientes (QR, promos, Wallet) siempre usan esta,
// aunque el dueño abra el panel desde una URL de deploy de Vercel (esas piden iniciar sesión).
export function publicOrigin(fallback: string) {
  return (process.env.NEXT_PUBLIC_APP_URL || fallback).replace(/\/+$/, "");
}
