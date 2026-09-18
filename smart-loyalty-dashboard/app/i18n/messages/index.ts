import type { Locale } from "../config";
import { en } from "./en";
import { es, type Messages } from "./es";
import { th } from "./th";

export type { Messages };
export const messages: Record<Locale, Messages> = { es, en, th };
