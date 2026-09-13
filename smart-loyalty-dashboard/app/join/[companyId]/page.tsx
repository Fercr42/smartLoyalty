import type { Metadata } from "next";
import JoinClient from "../../components/joinClient";

type Props = { params: Promise<{ companyId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companyId } = await params;
  return {
    title: "Recibe nuestras promociones",
    manifest: `/join/${companyId}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: "Promociones", statusBarStyle: "default" },
  };
}

export default async function JoinPage({ params }: Props) {
  const { companyId } = await params;
  return <JoinClient companyId={companyId} />;
}
