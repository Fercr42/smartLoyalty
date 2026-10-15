import type { Metadata } from "next";
import NuevaLanding from "./nueva/landing";
import { getI18n } from "./i18n/server";

// Portada: la landing 3D (app/nueva/landing.tsx) en el idioma del visitante.
export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.landing.metaTitle, description: m.landing.metaDescription };
}

export default async function Landing() {
  const { locale } = await getI18n();
  return <NuevaLanding locale={locale} />;
}
