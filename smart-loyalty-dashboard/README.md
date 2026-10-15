This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Apple Wallet

La tarjeta del cliente se puede guardar en Apple Wallet (iPhone). El botón aparece solo cuando todas las
variables `APPLE_WALLET_*` están puestas. Necesitas una cuenta de Apple Developer (US$99/año).

1. En [Certificates, IDs & Profiles](https://developer.apple.com/account/resources/identifiers/list/passTypeId)
   crea un **Pass Type ID** (ej. `pass.com.smartloyalty.card`). Ese texto va en `APPLE_WALLET_PASS_TYPE_ID`.
2. Genera la llave y la solicitud del certificado (en Windows, OpenSSL viene con Git Bash):
   ```bash
   openssl genrsa -out pass.key 2048
   openssl req -new -key pass.key -out pass.csr -subj "/emailAddress=tu@correo.com/CN=Smart Loyalty/C=CR"
   ```
3. En el Pass Type ID toca **Create Certificate**, sube `pass.csr` y descarga `pass.cer`. Conviértelo a PEM:
   ```bash
   openssl x509 -inform der -in pass.cer -out pass.pem
   ```
4. Descarga el certificado intermedio de Apple
   [WWDR G4](https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer) y conviértelo:
   ```bash
   openssl x509 -inform der -in AppleWWDRCAG4.cer -out wwdr.pem
   ```
5. Pon en Vercel (en base64, una sola línea cada uno):
   ```bash
   openssl base64 -A -in pass.pem   # APPLE_WALLET_CERT
   openssl base64 -A -in pass.key   # APPLE_WALLET_KEY
   openssl base64 -A -in wwdr.pem   # APPLE_WALLET_WWDR
   ```
   `APPLE_WALLET_TEAM_ID` es el Team ID de tu cuenta (Membership details). `NEXT_PUBLIC_APP_URL` debe ser
   la URL pública con `https://`: Apple solo actualiza los pases por HTTPS.

Cómo se actualiza: el iPhone se registra en `/api/wallet/apple/v1/...`; cuando cambian los puntos, el nombre,
el diseño o se envía una promo, el servidor avisa por APNs (con el mismo certificado) y el iPhone descarga el
pase nuevo. Las promos aparecen en el reverso de la tarjeta y se muestran como notificación.
