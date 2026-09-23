import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site";

// Qué puede recorrer Google: solo las páginas públicas; el panel y las páginas de cada cliente no.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/panel", "/admin", "/api/", "/scan", "/join/", "/promo/", "/encuesta/", "/r/", "/card-image/", "/wallet-hero/", "/wallet-asset/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
