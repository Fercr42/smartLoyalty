import type { Metadata } from "next";
import StaffScanner from "../../components/staffScanner";
import { getI18n } from "../../i18n/server";

type Props = { params: Promise<{ companyId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.scanner.metaTitle, robots: { index: false, follow: false } };
}

export default async function ScanPage({ params }: Props) {
  const { companyId } = await params;
  return <StaffScanner companyId={companyId} />;
}
