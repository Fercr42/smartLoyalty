import type { Metadata } from "next";
import LegalPage from "../components/legalPage";
import { getI18n } from "../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.legal.terms.metaTitle, description: m.legal.terms.metaDescription };
}

export default async function TermsPage() {
  const { m } = await getI18n();
  return <LegalPage doc={m.legal.terms} legal={m.legal} />;
}
