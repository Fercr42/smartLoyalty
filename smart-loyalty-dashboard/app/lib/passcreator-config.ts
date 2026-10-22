// ¿Está configurado Passcreator? (Apple Wallet sin certificado propio). Archivo aparte para no crear
// una dependencia circular entre apple-wallet.ts y passcreator.ts.
export const passcreatorReady = () =>
  Boolean(process.env.PASSCREATOR_API_KEY?.trim() && process.env.PASSCREATOR_TEMPLATE_ID?.trim());
