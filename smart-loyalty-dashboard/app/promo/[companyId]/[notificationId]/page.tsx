import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../firebase/admin";
import { DEFAULT_BG, DEFAULT_BRAND, safeColor, textOn } from "../../../lib/colors";
import { formatDay } from "../../../lib/format";
import { DATE_LOCALE, fmt } from "../../../i18n/config";
import { getI18n } from "../../../i18n/server";

export const runtime = "nodejs";

type Props = { params: Promise<{ companyId: string; notificationId: string }> };

async function load(companyId: string, notificationId: string) {
  const companyRef = adminDb().collection("companies").doc(companyId);
  const notificationRef = companyRef.collection("notifications").doc(notificationId);
  const [company, notification] = await Promise.all([companyRef.get(), notificationRef.get()]);
  if (!company.exists || !notification.exists) return null;
  const couponId = notification.data()?.couponId;
  const coupon = couponId ? (await companyRef.collection("coupons").doc(couponId).get()).data() : undefined;
  const couponExpired = Boolean(coupon && (!coupon.active || (coupon.expiresAt?.toMillis?.() ?? 0) <= Date.now()));
  return { company: company.data()!, notification: notification.data()!, notificationRef, coupon, couponExpired };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companyId, notificationId } = await params;
  const [data, { m }] = await Promise.all([load(companyId, notificationId), getI18n()]);
  if (!data) return { title: m.promo.metaFallback };
  return {
    title: `${data.notification.title} · ${data.company.name}`,
    description: data.notification.body,
  };
}

export default async function PromoPage({
  params,
  searchParams,
}: Props & { searchParams: Promise<{ src?: string | string[] }> }) {
  const { companyId, notificationId } = await params;
  const { src } = await searchParams;
  const [data, { m, locale }] = await Promise.all([load(companyId, notificationId), getI18n()]);
  if (!data) notFound();
  const t = m.promo;

  const { company, notification, coupon, couponExpired } = data;
  const brand = safeColor(company.brandColor, DEFAULT_BRAND);
  const bg = safeColor(company.bgColor, DEFAULT_BG);

  // Visitas a la promo (para las estadísticas del dueño).
  const source = src === "wallet" ? "walletViews" : src === "push" ? "pushViews" : null;
  await data.notificationRef
    .update({ views: FieldValue.increment(1), ...(source ? { [source]: FieldValue.increment(1) } : {}) })
    .catch(() => {});

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

          {coupon && (
            <div className="rounded-xl border-2 border-dashed p-4 text-center" style={{ borderColor: brand }}>
              <p className="text-xs uppercase tracking-wide text-gray-500">{t.coupon}</p>
              <p className="text-xl font-bold text-gray-900">{coupon.title}</p>
              {couponExpired ? (
                <p className="text-sm text-red-600 mt-1">{t.couponGone}</p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mt-1">
                    {fmt(t.couponValid, { date: formatDay(coupon.expiresDate ?? "", DATE_LOCALE[locale]) })}
                  </p>
                  <a
                    href={`/join/${companyId}`}
                    className="inline-block mt-3 px-4 py-2 rounded-lg font-semibold hover:opacity-90"
                    style={{ background: brand, color: textOn(brand) }}
                  >
                    {t.viewCard}
                  </a>
                </>
              )}
            </div>
          )}

          {notification.ctaUrl ? (
            <a
              href={notification.ctaUrl}
              className="block text-center py-3 rounded-xl font-semibold hover:opacity-90"
              style={{ background: brand, color: textOn(brand) }}
            >
              {notification.ctaLabel || t.more}
            </a>
          ) : null}
        </div>
      </article>
    </main>
  );
}
