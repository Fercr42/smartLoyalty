// Textos del lado del dueño: acceso, registro, panel, plan, negocio y QR.

export const auth = {
  title: "Entra a tu panel",
  loginError: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
};

export const signup = {
  metaTitle: "Registra tu negocio · Smart Loyalty",
  metaDescription: "Crea tu cuenta y prueba Smart Loyalty gratis. Sin tarjeta de crédito.",
  eyebrow: "{days} días gratis · sin tarjeta",
  title: "Registra tu negocio",
  lead: "En 10 minutos tienes tu QR listo para ponerlo a la vista de tus clientes.",
  account: "Cuenta:",
  name: "Nombre del negocio",
  namePlaceholder: "Barbería Leo",
  type: "Tipo de negocio",
  owner: "Tu nombre",
  phone: "WhatsApp",
  city: "Ciudad y país",
  cityPlaceholder: "San José, Costa Rica",
  creating: "Creando tu cuenta...",
  start: "Empezar prueba de {days} días",
  failed: "No se pudo completar el registro",
  haveAccount: "¿Ya tienes cuenta?",
  login: "Entrar",
};

export const panel = {
  metaTitle: "Panel · Smart Loyalty",
  tabs: {
    inicio: { label: "Inicio", description: "Cómo le va a tu negocio en los últimos 30 días." },
    mensajes: { label: "Mensajes", description: "Envía o programa promociones, horarios y eventos." },
    resultados: { label: "Resultados", description: "Qué pasó después de cada mensaje: aperturas, cupones y clientes que volvieron." },
    automatizaciones: { label: "Automatizaciones", description: "Mensajes que se envían solos en el momento justo." },
    tarjeta: { label: "Tarjeta", description: "El diseño de tu tarjeta y lo que muestra en Google Wallet." },
    recompensas: { label: "Recompensas", description: "Premios por sellos, escáner de empleados y reseñas." },
    negocio: { label: "Mi negocio", description: "Nombre, tipo, idioma, logo, colores y tu código QR." },
    plan: { label: "Plan", description: "Tu suscripción a Smart Loyalty." },
  },
  sectionsLabel: "Secciones del panel",
  finishTitle: "Termina tu registro",
  finishLead: "Completa los datos de tu negocio para empezar tu prueba gratis.",
  finishCta: "Completar registro",
  cardDesign: "Diseño de la tarjeta",
  walletData: "Datos y botones en Google Wallet",
  businessData: "Datos del negocio",
  qrTitle: "Tu código QR",
};

export const planBanner = {
  expiredTitle: "Tu plan no está activo.",
  expiredText: "Tus clientes siguen viendo su tarjeta y los sellos siguen funcionando, pero no puedes enviar notificaciones ni usar automatizaciones.",
  failedTitle: "El último cobro de PayPal falló.",
  failedText: "PayPal lo va a reintentar; revisa tu método de pago.",
  trialOne: "Te queda 1 día de prueba gratis.",
  trialMany: "Te quedan {days} días de prueba gratis.",
  trialText: "Todas las funciones están disponibles.",
  activate: "Activar plan",
};

export const business = {
  name: "Nombre del negocio",
  description: "Descripción (qué ofreces)",
  type: "Tipo de negocio",
  language: "Idioma de los mensajes automáticos",
  languageHint: "Cumpleaños, “te falta 1 sello”, pedido de reseña y textos de Google Wallet.",
  logo: "Logo",
  changeLogo: "Cambiar logo",
  uploadLogo: "Subir logo",
  buttonColor: "Color de botones",
  bgColor: "Color de fondo",
  previewNote: "Así se verá tu página del QR y de promociones",
  previewButton: "Activar notificaciones",
  nameRequired: "Escribe el nombre del negocio.",
  savedWallet: "Guardado · {count} tarjetas de Wallet actualizadas.",
  invalidImage: "Imagen inválida",
};

export const qr = {
  hint: "Tus clientes lo escanean para unirse, juntar sellos y recibir tus promociones",
  download: "Descargar PNG",
  fileName: "qr-smart-loyalty.png",
};

export const labels = {
  audiences: {
    all: "Todos",
    frequent: "Frecuentes",
    inactive: "Inactivos",
    near_reward: "Cerca de un premio",
    members: "Clientes elegidos",
  },
  automatic: {
    review: "Pedido de reseña (automático)",
    near_reward: "Te falta 1 sello (automático)",
    birthday: "Cumpleaños (automático)",
    winback: "Te extrañamos (automático)",
  },
};
