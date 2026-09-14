// Nombres de grupos y envíos automáticos para mostrar en el panel.

export const AUDIENCE_LABELS: Record<string, string> = {
  all: "Todos",
  frequent: "Frecuentes",
  inactive: "Inactivos",
  near_reward: "Cerca de un premio",
  members: "Clientes elegidos",
};

export const AUTOMATIC_LABELS: Record<string, string> = {
  review: "Pedido de reseña (automático)",
  near_reward: "Te falta 1 sello (automático)",
  birthday: "Cumpleaños (automático)",
  winback: "Te extrañamos (automático)",
};

export const campaignAudience = (kind?: string, audience?: string) =>
  (kind && AUTOMATIC_LABELS[kind]) || AUDIENCE_LABELS[audience ?? "all"] || "Todos";
