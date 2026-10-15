import type { Metadata } from "next";
import JoinClient from "../../components/joinClient";
import { getI18n } from "../../i18n/server";

type Props = { params: Promise<{ companyId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ companyId }, { m }] = await Promise.all([params, getI18n()]);
  return {
    title: m.join.metaTitle,
    manifest: `/join/${companyId}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: m.join.appName, statusBarStyle: "default" },
  };
}

export default async function JoinPage({ params }: Props) {
  const { companyId } = await params;
  return <JoinClient companyId={companyId} walletEnabled={Boolean(process.env.GOOGLE_WALLET_ISSUER_ID)} />;
}
