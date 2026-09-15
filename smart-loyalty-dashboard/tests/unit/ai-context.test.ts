import { describe, expect, it } from "vitest";
import { type CampaignDraft, cleanDrafts, cleanSummary, localNow, visitPattern } from "../../app/lib/ai-context";

const draft = (over: Partial<CampaignDraft> = {}): CampaignDraft => ({
  name: "Martes flojo",
  type: "promo",
  title: "2x1 los martes",
  body: "Ven de 3 a 6 pm.",
  audience: "frequent",
  coupon: null,
  sendAt: null,
  why: "Los martes hay pocas visitas.",
  ...over,
});

describe("IA: limpieza de campañas", () => {
  it("recorta a 3 versiones y a los límites de la notificación", () => {
    const out = cleanDrafts([draft({ title: "x".repeat(100), body: "y".repeat(300) }), draft(), draft(), draft()], "2026-09-14T10:00");
    expect(out).toHaveLength(3);
    expect(out[0].title.length).toBe(65);
    expect(out[0].body.length).toBe(240);
  });

  it("descarta fechas pasadas o mal escritas y limita los días del cupón", () => {
    const now = "2026-09-14T10:00";
    const [past, bad, future] = cleanDrafts(
      [
        draft({ sendAt: "2026-09-14T09:00", coupon: { title: "Bebida gratis", days: 500 } }),
        draft({ sendAt: "mañana", coupon: { title: "  ", days: 3 } }),
        draft({ sendAt: "2026-09-15T13:00" }),
      ],
      now
    );
    expect(past.sendAt).toBeNull();
    expect(past.coupon).toEqual({ title: "Bebida gratis", days: 60 });
    expect(bad.sendAt).toBeNull();
    expect(bad.coupon).toBeNull();
    expect(future.sendAt).toBe("2026-09-15T13:00");
  });

  it("el resumen deja máximo 3 puntos por lista", () => {
    expect(cleanSummary({ summary: " Bien ", positives: ["a", "b", "c", "d"], problems: [""], actions: [] })).toEqual({
      summary: "Bien",
      positives: ["a", "b", "c"],
      problems: [],
      actions: [],
    });
  });
});

describe("IA: datos de visitas", () => {
  it("agrupa por día y hora en la zona del restaurante", () => {
    // 2026-09-15 00:30 UTC = lunes 14 a las 18:30 en Costa Rica (UTC-6).
    const ms = Date.UTC(2026, 8, 15, 0, 30);
    expect(visitPattern([ms, ms], "America/Costa_Rica")).toEqual({ total: 2, byWeekday: { lunes: 2 }, byHour: { "18h": 2 } });
    expect(localNow("America/Costa_Rica", new Date(ms))).toEqual({ local: "2026-09-14T18:30", label: "lunes 2026-09-14 18:30" });
  });
});
