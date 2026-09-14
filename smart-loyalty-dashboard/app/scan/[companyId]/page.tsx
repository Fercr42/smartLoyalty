import type { Metadata } from "next";
import StaffScanner from "../../components/staffScanner";

type Props = { params: Promise<{ companyId: string }> };

export const metadata: Metadata = {
  title: "Escáner de sellos",
  robots: { index: false, follow: false },
};

export default async function ScanPage({ params }: Props) {
  const { companyId } = await params;
  return <StaffScanner companyId={companyId} />;
}
