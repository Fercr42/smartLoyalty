import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminDb } from "../../firebase/admin";
import SurveyClient from "../../components/surveyClient";
import { DEFAULT_BG, DEFAULT_BRAND, safeColor } from "../../lib/colors";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ m?: string | string[] }>;
};

const MEMBER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadCompany(companyId: string) {
  if (!/^[A-Za-z0-9]{10,64}$/.test(companyId)) return null;
  const snap = await adminDb().collection("companies").doc(companyId).get();
  return snap.exists ? snap.data()! : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companyId } = await params;
  const company = await loadCompany(companyId);
  return {
    title: company ? `¿Cómo te fue? · ${company.name}` : "Encuesta",
    robots: { index: false, follow: false },
  };
}

export default async function SurveyPage({ params, searchParams }: Props) {
  const { companyId } = await params;
  const { m } = await searchParams;
  const company = await loadCompany(companyId);
  if (!company) notFound();

  return (
    <SurveyClient
      companyId={companyId}
      companyName={company.name ?? ""}
      logoUrl={company.logoUrl ?? ""}
      brand={safeColor(company.brandColor, DEFAULT_BRAND)}
      bg={safeColor(company.bgColor, DEFAULT_BG)}
      memberId={typeof m === "string" && MEMBER_ID.test(m) ? m : ""}
    />
  );
}
