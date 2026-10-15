// Funciones del teléfono cuando el sitio corre dentro de la app "Smart Loyalty Negocios" (Capacitor).
// En un navegador normal todo esto devuelve false/null y el sitio funciona como siempre.
// Los plugins se usan por window.Capacitor.Plugins: el sitio no necesita instalar paquetes de Capacitor.

type ScanResult = { barcodes?: { rawValue?: string }[] };
type Listener = { remove: () => Promise<void> };
type Plugins = {
  BarcodeScanner?: {
    isSupported?: () => Promise<{ supported: boolean }>;
    checkPermissions?: () => Promise<{ camera: string }>;
    requestPermissions?: () => Promise<{ camera: string }>;
    isGoogleBarcodeScannerModuleAvailable?: () => Promise<{ available: boolean }>;
    installGoogleBarcodeScannerModule?: () => Promise<void>;
    scan: (options?: { formats?: string[] }) => Promise<ScanResult>;
  };
  Haptics?: { impact: (options: { style: "LIGHT" | "MEDIUM" | "HEAVY" }) => Promise<void> };
  PushNotifications?: {
    requestPermissions: () => Promise<{ receive: string }>;
    register: () => Promise<void>;
    addListener: (event: string, cb: (data: { value?: string; error?: string }) => void) => Promise<Listener>;
  };
};
type CapacitorGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string; Plugins?: Plugins };

const cap = (): CapacitorGlobal | null =>
  typeof window !== "undefined" ? ((window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null) : null;

// ¿Estamos dentro de la app? (también por el user agent, que la app marca con "SmartLoyaltyApp")
export const isNativeApp = () =>
  Boolean(cap()?.isNativePlatform?.()) || (typeof navigator !== "undefined" && /SmartLoyaltyApp/.test(navigator.userAgent));

export const nativePlatform = (): "android" | "ios" | "web" => {
  const p = cap()?.getPlatform?.();
  return p === "android" || p === "ios" ? p : "web";
};

const plugins = (): Plugins => (isNativeApp() ? (cap()?.Plugins ?? {}) : {});

export const hasNativeScanner = () => Boolean(plugins().BarcodeScanner);

// Escanea un QR con el escáner nativo. null si se canceló o no hay escáner.
export async function nativeScan(): Promise<string | null> {
  const scanner = plugins().BarcodeScanner;
  if (!scanner) return null;
  if (nativePlatform() === "android" && scanner.isGoogleBarcodeScannerModuleAvailable) {
    // Android usa el escáner de Google (sin pedir permiso de cámara); la primera vez se descarga.
    const { available } = await scanner.isGoogleBarcodeScannerModuleAvailable();
    if (!available) await scanner.installGoogleBarcodeScannerModule?.();
  } else if (scanner.checkPermissions && scanner.requestPermissions) {
    const { camera } = await scanner.checkPermissions();
    if (camera !== "granted" && (await scanner.requestPermissions()).camera !== "granted") {
      throw new Error("camera-denied");
    }
  }
  try {
    const { barcodes } = await scanner.scan({ formats: ["QrCode"] });
    return barcodes?.[0]?.rawValue ?? null;
  } catch (e) {
    if (String(e).toLowerCase().includes("cancel")) return null;
    throw e;
  }
}

// Vibración corta al confirmar (sumar puntos, canjear).
export function haptic(style: "LIGHT" | "MEDIUM" | "HEAVY" = "MEDIUM") {
  const h = plugins().Haptics;
  if (h) h.impact({ style }).catch(() => {});
  else if (typeof navigator !== "undefined") navigator.vibrate?.(60);
}

// Avisos push al dueño: solo cuando la app ya tiene Firebase configurado (NEXT_PUBLIC_NATIVE_PUSH=1),
// porque en Android pedir el token sin google-services.json cierra la app.
export const nativePushReady = () =>
  isNativeApp() && Boolean(plugins().PushNotifications) && process.env.NEXT_PUBLIC_NATIVE_PUSH === "1" && nativePlatform() === "android";

export async function registerNativePush(onToken: (token: string) => void) {
  const push = plugins().PushNotifications;
  if (!push || !nativePushReady()) return false;
  const { receive } = await push.requestPermissions();
  if (receive !== "granted") return false;
  await push.addListener("registration", (t) => t.value && onToken(t.value));
  await push.register();
  return true;
}

// Código del negocio desde el QR del mostrador (https://smartloyalty.app/join/{id}) o escrito a mano.
export function companyIdFromQr(text: string): string | null {
  const value = text.trim();
  const fromUrl = value.match(/\/(?:join|scan)\/([A-Za-z0-9]{10,64})(?:[/?#]|$)/)?.[1];
  const id = fromUrl ?? (/^[A-Za-z0-9]{10,64}$/.test(value) ? value : "");
  return id || null;
}
