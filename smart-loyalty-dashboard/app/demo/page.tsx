import type { Metadata } from "next";
import DemoPage from "../components/demoPage";
import { getI18n } from "../i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.demo.metaTitle, description: m.demo.metaDescription };
}

export default function Demo() {
  return <DemoPage />;
}
