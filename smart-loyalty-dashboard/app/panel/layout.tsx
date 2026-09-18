import type { Metadata } from "next";
import { getI18n } from "../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.panel.metaTitle, robots: { index: false, follow: false } };
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
