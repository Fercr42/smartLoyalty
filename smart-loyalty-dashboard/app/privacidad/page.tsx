import type { Metadata } from "next";
import LegalPage from "../components/legalPage";
import { getI18n } from "../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.legal.privacy.metaTitle, description: m.legal.privacy.metaDescription };
}

export default async function PrivacyPage() {
  const { m } = await getI18n();
  return <LegalPage doc={m.legal.privacy} legal={m.legal} />;
}
