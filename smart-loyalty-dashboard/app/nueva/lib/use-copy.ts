"use client";
import { useI18n } from "../../i18n/client";
import { NV_COPY } from "../copy";

// Textos de la portada en el idioma actual (para los componentes del navegador).
export const useNvCopy = () => NV_COPY[useI18n().locale];
