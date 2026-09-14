// Texto visible de un botón de enlace en la tarjeta: muestra el dato (número, correo, página)
// para que el cliente lo vea sin tener que tocarlo. Se usa en el navegador y en el servidor.

export function describeLink(label: string, url: string) {
  const detail = linkDetail(url);
  if (!label) return detail.text;
  return detail.value && !label.includes(detail.value) ? `${label}: ${detail.value}` : label;
}

function linkDetail(url: string): { text: string; value: string } {
  if (url.startsWith("tel:")) {
    const number = url.slice(4);
    return { text: `Llamar: ${number}`, value: number };
  }
  if (url.startsWith("mailto:")) {
    const email = url.slice(7).split("?")[0];
    return { text: `Correo: ${email}`, value: email };
  }
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");

    if (host === "wa.me" || host.endsWith("whatsapp.com")) {
      const digits = (path.slice(1) || u.searchParams.get("phone") || "").replace(/\D/g, "");
      const number = digits ? `+${digits}` : "";
      return { text: number ? `WhatsApp: ${number}` : "WhatsApp", value: number };
    }
    if (host.endsWith("instagram.com")) {
      const user = path.split("/")[1];
      return { text: user ? `Instagram: @${user}` : "Instagram", value: user ? `@${user}` : "" };
    }
    if (host.endsWith("facebook.com")) return { text: "Facebook", value: "" };
    if ((host.includes("google.") && path.startsWith("/maps")) || host === "maps.app.goo.gl") {
      return { text: "Ver ubicación", value: "" };
    }
    // Página web: sin texto se muestra la dirección; con texto, solo el texto.
    return { text: `${host}${path}`.slice(0, 60), value: "" };
  } catch {
    return { text: url.slice(0, 60), value: "" };
  }
}
