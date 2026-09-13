import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminDb } from "../../../firebase/admin";
import { DEFAULT_BG, DEFAULT_BRAND, safeColor, textOn } from "../../../lib/colors";

export const runtime = "nodejs";

type Props = { params: Promise<{ companyId: string; notificationId: string }> };

async function load(companyId: string, notificationId: string) {
  const companyRef = adminDb().collection("companies").doc(companyId);
  const [company, notification] = await Promise.all([
    companyRef.get(),
    companyRef.collection("notifications").doc(notificationId).get(),
  ]);
  if (!company.exists || !notification.exists) return null;
  return { company: company.data()!, notification: notification.data()! };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companyId, notificationId } = await params;
  const data = await load(companyId, notificationId);
  if (!data) return { title: "Promoción" };
  return {
    title: `${data.notification.title} · ${data.company.name}`,
    description: data.notification.body,
  };
}

export default async function PromoPage({ params }: Props) {
  const { companyId, notificationId } = await params;
  const data = await load(companyId, notificationId);
  if (!data) notFound();

  const { company, notification } = data;
  const brand = safeColor(company.brandColor, DEFAULT_BRAND);
  const bg = safeColor(company.bgColor, DEFAULT_BG);

  return (
    <main className="min-h-screen px-4 py-8 flex justify-center items-start" style={{ background: bg }}>
      <article className="bg-white rounded-2xl shadow-sm border overflow-hidden max-w-md w-full">
        {notification.hasImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/promo/${companyId}/${notificationId}/image`}
            alt=""
            className="w-full h-auto max-h-[28rem] object-cover"
          />
        )}
        <div className="p-6 flex flex-col gap-4">
          <header className="flex items-center gap-3">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover border" />
            ) : null}
            <p className="font-semibold text-gray-900">{company.name}</p>
          </header>
          <h1 className="text-2xl font-bold text-gray-900 text-balance">{notification.title}</h1>
          <p className="text-gray-700 whitespace-pre-line">{notification.body}</p>
          {notification.ctaUrl ? (
            <a
              href={notification.ctaUrl}
              className="block text-center py-3 rounded-xl font-semibold hover:opacity-90"
              style={{ background: brand, color: textOn(brand) }}
            >
              {notification.ctaLabel || "Ver más"}
            </a>
          ) : null}
        </div>
      </article>
    </main>
  );
}
