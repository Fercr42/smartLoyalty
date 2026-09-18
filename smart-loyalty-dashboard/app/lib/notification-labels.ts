import type { Messages } from "../i18n/messages";

// Nombre del grupo o del envío automático de una campaña, en el idioma del panel.
export function campaignAudience(labels: Messages["labels"], kind?: string, audience?: string) {
  const automatic = labels.automatic as Record<string, string>;
  const audiences = labels.audiences as Record<string, string>;
  return (kind && automatic[kind]) || audiences[audience ?? "all"] || audiences.all;
}
