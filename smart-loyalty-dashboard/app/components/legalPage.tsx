import Link from "next/link";
import BrandLogo from "./brandLogo";
import { fmt } from "../i18n/config";
import { LanguageSwitcher } from "../i18n/client";
import type { Messages } from "../i18n/messages";
import { CONTACT_EMAIL } from "../lib/legal";
import { PLAN_PRICE_USD, TRIAL_DAYS } from "../lib/plan";

// Página de texto legal (privacidad y términos), en el idioma de quien la abre.
export default function LegalPage({
  doc,
  legal,
}: {
  doc: Messages["legal"]["privacy"] | Messages["legal"]["terms"];
  legal: Messages["legal"];
}) {
  const vars = { email: CONTACT_EMAIL, company: legal.company, days: TRIAL_DAYS, price: PLAN_PRICE_USD };

  return (
    <main className="min-h-screen bg-white text-[#111418]">
      <header className="border-b border-[#e6ece9]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" aria-label="Smart Loyalty">
            <BrandLogo size={28} />
          </Link>
          <LanguageSwitcher className="border-[#cfd8d4]" />
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-balance">{doc.title}</h1>
          <p className="text-sm text-[#6b7580]">{legal.updated}</p>
          <p className="text-[#4b5560]">{doc.intro}</p>
        </div>

        {doc.sections.map((section) => (
          <section key={section.h} className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">{section.h}</h2>
            {section.p.map((paragraph, i) => (
              <p key={i} className="text-[#4b5560]">
                {fmt(paragraph, vars)}
              </p>
            ))}
          </section>
        ))}

        <footer className="border-t border-[#e6ece9] pt-6 flex flex-col gap-1 text-sm text-[#6b7580]">
          <p>{legal.company}</p>
          <p>{fmt(legal.contact, vars)}</p>
          <div className="flex flex-wrap gap-4 mt-2">
            <Link href="/" className="text-[#0e7c66] font-semibold">
              {legal.backHome}
            </Link>
            <Link href="/privacidad" className="hover:text-[#111418]">
              {legal.privacyLink}
            </Link>
            <Link href="/terminos" className="hover:text-[#111418]">
              {legal.termsLink}
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
