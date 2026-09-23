import type { Metadata } from "next";
import SupportPage from "../components/supportPage";
import { getI18n } from "../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.support.metaTitle, description: m.support.metaDescription };
}

export default async function Soporte() {
  return <SupportPage />;
}
