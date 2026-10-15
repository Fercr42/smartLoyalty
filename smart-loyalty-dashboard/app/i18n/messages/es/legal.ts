// Política de privacidad y términos de uso. Textos legales: revísalos con un abogado antes de vender en otro país.

export const legal = {
  updated: "Última actualización: 20 de septiembre de 2026",
  company: "Smart Loyalty, operado por Fernando Rodríguez (Costa Rica)",
  contact: "Contacto: {email}",
  backHome: "Volver al inicio",
  privacyLink: "Privacidad",
  termsLink: "Términos",
  privacy: {
    metaTitle: "Política de privacidad · Smart Loyalty",
    metaDescription: "Qué datos guarda Smart Loyalty, para qué los usa y cómo pedir que los borren.",
    title: "Política de privacidad",
    intro:
      "Smart Loyalty es una herramienta que usan negocios (restaurantes, barberías, salones, cafés y otros) para su programa de clientes: tarjeta de puntos, cupones y notificaciones. Esta página explica qué datos guardamos, para qué y qué puedes pedirnos.",
    sections: [
      {
        h: "Quién responde por tus datos",
        p: [
          "{company} presta el servicio y responde por la plataforma.",
          "El negocio en el que escaneaste el código QR decide qué premios ofrece y qué mensajes te envía. Nosotros guardamos los datos por encargo de ese negocio.",
        ],
      },
      {
        h: "Datos de los clientes del negocio",
        p: [
          "Cuando escaneas el QR y aceptas las notificaciones guardamos: el identificador que el navegador de tu celular entrega para recibir notificaciones, un código de tarjeta, tus puntos, visitas, premios canjeados y cupones usados.",
          "Si decides proteger tu tarjeta, guardamos tu correo electrónico. Si lo autorizas, ese correo se comparte con el negocio.",
          "Si lo escribes, guardamos tu nombre. El negocio lo ve en su panel y en su escáner, y aparece en tu tarjeta de Google Wallet.",
          "Si lo escribes, guardamos el día y el mes de tu cumpleaños (no el año) para el regalo de cumpleaños.",
          "Si respondes la encuesta, guardamos tu calificación de 1 a 5 y tu comentario.",
          "No pedimos ni guardamos tu nombre completo, tu dirección, tu cédula ni datos de pago.",
        ],
      },
      {
        h: "Datos de los negocios",
        p: [
          "Del dueño guardamos: nombre del negocio, tipo de negocio, nombre de la persona, correo, WhatsApp, ciudad, logo, colores, premios, mensajes y estadísticas de uso.",
          "Los pagos los procesa PayPal. Nosotros no vemos ni guardamos números de tarjeta.",
        ],
      },
      {
        h: "Para qué usamos los datos",
        p: [
          "Para que funcione la tarjeta de puntos, los cupones y las notificaciones que el negocio envía.",
          "Para mostrarle al negocio estadísticas de visitas y resultados de sus campañas.",
          "Para cobrar la suscripción del negocio y darle soporte.",
          "Para calcular estadísticas agregadas y anónimas que nos ayudan a mejorar el producto.",
          "No vendemos datos personales ni los usamos para publicidad de terceros.",
        ],
      },
      {
        h: "Con quién los compartimos",
        p: [
          "Google (Firebase y Firebase Cloud Messaging): guarda los datos y entrega las notificaciones.",
          "Google Wallet: solo si guardas la tarjeta ahí; recibe el nombre del negocio, tu código de tarjeta y tus puntos.",
          "Google Gemini: cuando el dueño usa la inteligencia artificial, se envían los textos de sus promociones, las estadísticas del negocio y los comentarios de la encuesta (sin correos ni identificadores de clientes) para redactar propuestas y resúmenes.",
          "PayPal: para cobrar la suscripción del negocio.",
          "Vercel: entrega el sitio web.",
          "Esos servicios pueden procesar la información fuera de tu país, incluidos Estados Unidos.",
        ],
      },
      {
        h: "Cuánto tiempo los guardamos",
        p: [
          "Mientras el negocio use Smart Loyalty y tú tengas tu tarjeta.",
          "Si pides que borremos tu tarjeta, la eliminamos junto con tus puntos, cupones y opiniones.",
          "Si el negocio cierra su cuenta, borramos sus datos y los de sus clientes dentro de los 90 días siguientes.",
        ],
      },
      {
        h: "Tus derechos",
        p: [
          "Puedes pedir ver, corregir o borrar tus datos escribiendo a {email}, o pedírselo al negocio donde usas la tarjeta.",
          "Puedes dejar de recibir notificaciones cuando quieras: desactívalas en los ajustes del navegador o del celular para ese sitio.",
          "Puedes quitar la tarjeta de Google Wallet desde la misma aplicación.",
        ],
      },
      {
        h: "Menores de edad",
        p: ["El servicio no está dirigido a menores de 13 años. Si detectamos datos de un menor, los borramos."],
      },
      {
        h: "Cookies y almacenamiento del navegador",
        p: [
          "Usamos una cookie para recordar tu idioma y el almacenamiento del navegador para recordar tu tarjeta en ese celular.",
          "No usamos cookies de publicidad ni de seguimiento entre sitios.",
        ],
      },
      {
        h: "Seguridad",
        p: [
          "Los datos viajan cifrados (HTTPS) y se guardan en Google Firebase con reglas de acceso.",
          "El PIN de los empleados se guarda cifrado y sus sesiones vencen a las 12 horas.",
        ],
      },
      {
        h: "Cambios",
        p: ["Si cambiamos esta política, actualizamos la fecha de arriba y publicamos la nueva versión en esta página."],
      },
    ],
  },
  terms: {
    metaTitle: "Términos de uso · Smart Loyalty",
    metaDescription: "Condiciones del servicio Smart Loyalty: plan, pagos, cancelación y uso correcto.",
    title: "Términos de uso",
    intro: "Estas condiciones aplican al negocio que contrata Smart Loyalty y a las personas que usan la tarjeta de cliente.",
    sections: [
      {
        h: "El servicio",
        p: [
          "Smart Loyalty ofrece tarjeta de puntos digital, cupones, notificaciones al celular, encuesta de satisfacción, estadísticas y ayuda con inteligencia artificial.",
          "El servicio se presta tal como está. Trabajamos para que esté siempre disponible, pero no garantizamos que funcione sin interrupciones.",
        ],
      },
      {
        h: "Cuenta del negocio",
        p: [
          "Para registrarte necesitas una cuenta de Google y datos reales de tu negocio.",
          "Eres responsable de tu cuenta, del PIN que le das a tu equipo y de lo que se haga con ellos.",
        ],
      },
      {
        h: "Precio, prueba y pagos",
        p: [
          "La prueba gratis dura {days} días con todas las funciones y no pide tarjeta.",
          "Después cuesta {price} USD al mes. El cobro es automático con PayPal hasta que canceles.",
          "Si un cobro falla, mantenemos el acceso unos días mientras PayPal reintenta.",
        ],
      },
      {
        h: "Cancelación",
        p: [
          "Puedes cancelar cuando quieras desde la sección Plan de tu panel. Conservas el acceso hasta el final del mes ya pagado.",
          "No hacemos devoluciones por meses ya cobrados, salvo que la ley lo exija.",
          "Al cancelar, tus clientes conservan su tarjeta y sus puntos, pero se detienen los envíos y las automatizaciones.",
        ],
      },
      {
        h: "Uso correcto",
        p: [
          "Solo puedes enviar mensajes a clientes que aceptaron recibirlos y sobre tu propio negocio.",
          "No se permite enviar contenido engañoso, ofensivo, ilegal ni ajeno a tu negocio, ni revender el servicio sin permiso.",
          "Cumplir tus premios, cupones y promociones es responsabilidad tuya, no nuestra.",
          "Podemos suspender una cuenta que incumpla estas reglas o que genere quejas de sus clientes.",
        ],
      },
      {
        h: "Contenido e inteligencia artificial",
        p: [
          "Los textos, fotos y logos que subas siguen siendo tuyos; nos das permiso para mostrarlos dentro del servicio a tus clientes.",
          "La inteligencia artificial propone textos y resúmenes que pueden contener errores. Revísalos antes de enviarlos: tú respondes por lo que se envía.",
        ],
      },
      {
        h: "Tus datos",
        p: [
          "Los datos de tus clientes son tuyos. Puedes descargarlos en Excel desde el panel cuando quieras.",
          "El tratamiento de datos personales se explica en la política de privacidad.",
          "Podemos usar información agregada y anónima (por ejemplo, promedio de visitas o de clientes que regresan) para mejorar el producto y en material de venta, sin identificar a tu negocio ni a tus clientes, salvo que nos des permiso por escrito.",
        ],
      },
      {
        h: "Responsabilidad",
        p: [
          "No respondemos por pérdidas de ventas, ganancias o datos derivadas del uso del servicio.",
          "Nuestra responsabilidad máxima es el monto que pagaste en los últimos 3 meses.",
        ],
      },
      {
        h: "Cambios y cierre",
        p: [
          "Podemos cambiar funciones o precios avisando con al menos 30 días en el panel o por correo.",
          "Puedes dejar de usar el servicio cuando quieras.",
        ],
      },
      {
        h: "Ley aplicable",
        p: ["Estas condiciones se rigen por las leyes de Costa Rica."],
      },
    ],
  },
};
