import type { Metadata } from "next";
import AppLauncher from "../components/appLauncher";
import { getI18n } from "../i18n/server";

// Pantalla de inicio de la app "Smart Loyalty Negocios" (también abre en el navegador).
export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.appHome.metaTitle, robots: { index: false, follow: false } };
}

export default function AppHome() {
  return <AppLauncher />;
}
