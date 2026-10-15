// Íconos del menú del panel (trazo de 1.8, se pintan con el color del texto).
const paths: Record<string, string> = {
  inicio: "M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5.5h4V20",
  clientes: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.6a3 3 0 0 1 0 5.8",
  mensajes: "M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1ZM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12",
  resultados: "M4 20h16M7 16v-4M12 16V8M17 16v-7",
  automatizaciones: "M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z",
  tarjeta: "M3.5 7.5A2.5 2.5 0 0 1 6 5h12a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9ZM3.5 10h17M7 15h3",
  recompensas: "M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20M12 7.5c-1.5-3.5-5.5-3.5-5.5-1S9.5 7.5 12 7.5Zm0 0c1.5-3.5 5.5-3.5 5.5-1S14.5 7.5 12 7.5Z",
  negocio: "M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M10 20v-5h4v5",
  plan: "M6 3.5h12v17l-3-2-3 2-3-2-3 2v-17ZM9 8.5h6M9 12h6",
};

export default function PanelIcon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`h-[18px] w-[18px] shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name] ?? paths.inicio} />
    </svg>
  );
}
