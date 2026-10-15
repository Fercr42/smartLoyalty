// Errores que reporta el iPhone sobre el servicio web (útil para depurar en los logs de Vercel).
export async function POST(req: Request) {
  const { logs } = await req.json().catch(() => ({ logs: [] }));
  if (Array.isArray(logs)) logs.slice(0, 20).forEach((line) => console.warn("Apple Wallet (iPhone):", String(line).slice(0, 500)));
  return new Response(null, { status: 200 });
}
