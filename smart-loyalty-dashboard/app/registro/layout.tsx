import type { Metadata } from "next";
import { getI18n } from "../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.signup.metaTitle, description: m.signup.metaDescription };
}

export default function RegistroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
