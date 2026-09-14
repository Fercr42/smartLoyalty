import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registra tu restaurante · Smart Loyalty",
  description: "Crea tu cuenta y prueba Smart Loyalty gratis. Sin tarjeta de crédito.",
};

export default function RegistroLayout({ children }: { children: React.ReactNode }) {
  return children;
}
