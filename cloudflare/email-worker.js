// Worker de Cloudflare: manda a Smart Loyalty los correos que llegan a soporte@smartloyalty.app
// para que aparezcan en el administrador, y los reenvía igual a tu Gmail.
//
// Variables que hay que crear en el Worker (Settings -> Variables):
//   ENDPOINT  = https://smartloyalty.app/api/support/inbound
//   SECRETO   = el mismo valor que INBOUND_EMAIL_SECRET en Vercel
//   REENVIAR  = tu-correo@gmail.com   (opcional; si está, también te llega como hoy)

export default {
  async email(message, env) {
    const texto = await leer(message);

    try {
      await fetch(env.ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-inbound-secret": env.SECRETO },
        body: JSON.stringify({
          from: message.from,
          name: (message.headers.get("from") || "").split("<")[0].replace(/"/g, "").trim(),
          subject: message.headers.get("subject") || "",
          text: texto.slice(0, 8000),
        }),
      });
    } catch (e) {
      console.error("No se pudo guardar el correo", e);
    }

    if (env.REENVIAR) await message.forward(env.REENVIAR);
  },
};

// El cuerpo del correo llega como flujo de bytes.
async function leer(message) {
  const bruto = new TextDecoder().decode(await new Response(message.raw).arrayBuffer());
  const corte = bruto.indexOf("\r\n\r\n");
  return corte > 0 ? bruto.slice(corte + 4) : bruto;
}
