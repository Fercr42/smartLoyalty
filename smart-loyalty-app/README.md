# Smart Loyalty Negocios (app para dueños y empleados)

App de Android e iOS hecha con [Capacitor](https://capacitorjs.com). Abre `https://smartloyalty.app/app`,
donde cada persona elige si es **dueño** (va al panel) o **empleado** (escanea el QR del negocio y va al escáner).
Como carga el sitio, casi todos los cambios se publican con el sitio, sin subir otra versión a las tiendas.

Lo que hace la app además del sitio:

- **Escáner nativo** de QR (Google en Android, cámara en iPhone) y vibración al sumar puntos.
- **Avisos al dueño** cuando un cliente deja una opinión (Android ya; iPhone cuando haya cuenta de Apple).
- Dentro de la app **no se muestran precios ni pagos** (Apple y Google exigen su propio cobro para suscripciones);
  el plan se paga en smartloyalty.app desde el navegador. Tampoco hay registro ni botón de Google: el dueño entra
  con correo y contraseña (si se registró con Google, crea una con "Olvidé mi contraseña").

## Probar en Android (sin tienda)

1. GitHub → **Actions** → "App Android (dueños y empleados)" → la última ejecución → **Artifacts** →
   `smart-loyalty-negocios-prueba-apk`.
2. Pasa el `app-debug.apk` al celular Android, ábrelo y permite "instalar apps de fuentes desconocidas".

## Publicar en Google Play

1. Crea la cuenta en [play.google.com/console](https://play.google.com/console) (US$25 una vez).
2. Crea la llave de firma (una sola vez, guárdala en un lugar seguro; sin ella no se pueden subir actualizaciones):
   ```bash
   keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 upload.jks   # en Windows (Git Bash) también funciona
   ```
3. En GitHub → Settings → Secrets and variables → Actions, crea `ANDROID_KEYSTORE_BASE64` (el texto del paso
   anterior), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`) y `ANDROID_KEY_PASSWORD`.
4. Ejecuta el workflow otra vez (Actions → Run workflow): sale `smart-loyalty-negocios-google-play-aab`.
5. En Play Console crea la app, sube el `.aab` a **Prueba cerrada** con al menos **12 probadores durante 14 días**
   (requisito de cuentas personales nuevas) y después pásala a **Producción**.

Datos para la ficha: categoría *Empresa*; política de privacidad `https://smartloyalty.app/privacidad`;
en "Seguridad de los datos" declara correo (cuenta del dueño) y no hay compras dentro de la app.

## Avisos push (Android)

1. [Firebase Console](https://console.firebase.google.com) → tu proyecto → Agregar app → Android →
   paquete `app.smartloyalty.negocios` → descarga `google-services.json`.
2. Pega su contenido en el secreto `GOOGLE_SERVICES_JSON` de GitHub y vuelve a compilar.
3. En Vercel pon `NEXT_PUBLIC_NATIVE_PUSH=1` y redespliega. (Sin el archivo de Firebase la app se cerraría
   al pedir avisos, por eso esta variable va al final.)

## Publicar en App Store

Requiere la cuenta de Apple Developer (US$99/año) y compilar en una Mac (o un servicio en la nube como
Codemagic o Ionic Appflow). El proyecto de iOS ya está en `ios/`:

```bash
npm ci && npx cap sync ios && npx cap open ios   # en una Mac con Xcode
```

En Xcode elige tu equipo (Signing & Capabilities), agrega la capacidad **Push Notifications**, sube con
Product → Archive y envíalo a revisión desde App Store Connect. Para la revisión de Apple, crea una cuenta de
prueba (correo y contraseña) y ponla en "App Review Information".

## Cambiar ícono o pantalla de carga

Reemplaza las imágenes de `assets/` (ícono de 1024×1024) y ejecuta `npm run assets`.
