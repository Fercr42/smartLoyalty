// Tipos de negocio (nicho). Los nombres visibles están en los diccionarios: m.niches.types.
export const BUSINESS_TYPES = ["restaurant", "cafe", "bar", "barbershop", "beauty", "spa", "gym", "carwash", "vet", "retail", "other"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const isBusinessType = (v: unknown): v is BusinessType =>
  typeof v === "string" && (BUSINESS_TYPES as readonly string[]).includes(v);

export const cleanBusinessType = (v: unknown): BusinessType => (isBusinessType(v) ? v : "other");
