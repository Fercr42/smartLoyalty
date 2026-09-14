// Recompensas por sellos. Se usa en el navegador y en el servidor.

export type Reward = { id: string; title: string; stamps: number };

export const MAX_REWARDS = 5;

export function cleanRewards(raw: unknown): Reward[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r, i) => ({
      id: typeof r?.id === "string" && r.id ? r.id.slice(0, 40) : `r${i}`,
      title: typeof r?.title === "string" ? r.title.trim().slice(0, 40) : "",
      stamps: Math.round(Number(r?.stamps)),
    }))
    .filter((r) => r.title && Number.isFinite(r.stamps) && r.stamps >= 1 && r.stamps <= 100)
    .slice(0, MAX_REWARDS)
    .sort((a, b) => a.stamps - b.stamps);
}

export function nextRewardText(rewards: Reward[], stamps: number) {
  const ready = rewards.filter((r) => r.stamps <= stamps);
  if (ready.length) return `Premio disponible: ${ready[ready.length - 1].title}`;
  const next = rewards.find((r) => r.stamps > stamps);
  return next ? `${next.title} · faltan ${next.stamps - stamps}` : "";
}
