import type { Locale } from "../i18n/config";
import { formatColones } from "../lib/format-money";

// Textos de la portada 3D en español, inglés y tailandés.
// El tipo sale del español: si a inglés o tailandés les falta algo, TypeScript avisa.
// En español los montos van en colones; en los otros idiomas, en dólares (igual que el resto del sitio).

const es = {
  money: (minor: number) => formatColones(minor),
  numberLocale: "es-CR",

  nav: {
    skip: "Saltar al contenido",
    home: "Smart Loyalty, inicio",
    sections: "Secciones",
    how: "Cómo funciona",
    try: "Pruébalo",
    pricing: "Precios",
    login: "Entrar",
    tryFree: "Probar gratis",
    cursorStart: "Empezar",
  },
  hud: { hero: "Inicio", how: "Cómo funciona", try: "Pruébalo", ready: "Lo que viene listo", steps: "Tres pasos", pricing: "Precios", start: "Empieza" },
  loader: { label: "visitas", aria: "Cargando" },

  hero: {
    line1: "Clientes",
    line2: "que vuelven.",
    lead: "La tarjeta de lealtad de tu negocio, en el celular de tus clientes. Suma puntos, avisa tus promociones y consigue reseñas en Google, sin que nadie descargue una app.",
    cta: (days: number) => `Probar ${days} días gratis`,
    how: "Ver cómo funciona",
    cursorDown: "Bajar",
    note: "Sin tarjeta de crédito. Tu QR listo en 10 minutos.",
    scroll: "Desliza",
  },

  value: {
    title: "Tres cosas que la tarjeta de cartón nunca hizo",
    beats: [
      {
        verb: "Suma.",
        text: "Cada visita suma un sello. Tu empleado escanea con su PIN y la tarjeta del cliente se actualiza sola. Con 10, el café va por la casa.",
        data: "Compra escaneada: +1 sello",
      },
      {
        verb: "Avisa.",
        text: "Tus promociones llegan a la pantalla de bloqueo. A todos, solo a los frecuentes o a los que llevan semanas sin venir.",
        data: "Viernes 5:00 p. m.: sello doble",
      },
      {
        verb: "Recomienda.",
        text: "Dos minutos después de la compra llega una encuesta corta. A quien quedó contento se le pide la reseña en Google.",
        data: "Encuesta enviada, reseña pedida",
      },
    ],
    stepOf: (i: number, n: number) => `Paso ${i} de ${n}`,
  },

  sim: {
    title: "Pruébalo aquí mismo.",
    lead: "Así lo vive tu cliente. Elige cómo premias, escanea una compra y mira qué le llega al celular.",
    choose: "Elige cómo premias",
    programLabel: "Tipo de programa",
    modes: { sellos: "Sellos", puntos: "Puntos", cashback: "Cashback" },
    hints: {
      sellos: "1 sello por visita. Con 10, café gratis.",
      puntos: "2 puntos por cada ₡100. Con 400, café gratis.",
      cashback: "5% de cada compra vuelve como saldo.",
    },
    amount: "Monto de la compra",
    amounts: [4000, 8000, 12000],
    pointsPerUnit: 0.02, // puntos por colón
    minor: 1, // el saldo de cashback se guarda en colones
    scan: "Escanear compra",
    scanning: "Escaneando…",
    cursorScan: "Escanear",
    redeem: "Canjear premio",
    logLabel: "Últimas compras",
    logEmpty: "Todavía no hay compras. Escanea la primera.",
    note: "Es una demostración: nada de esto se guarda.",
    phone: "Celular del cliente",
    day: "sábado",
    now: "ahora",
    readyTitle: "¡Tu café gratis está listo! ☕",
    readyStamps: "Muéstralo en caja en tu próxima visita.",
    readyPoints: "Tienes 400 puntos. Muéstralo en caja.",
    almostTitle: "Ya casi lo logras",
    almostStamps: "Te faltan 2 sellos para tu café gratis.",
    almostPoints: (n: number) => `Te faltan ${n} puntos para tu café gratis.`,
    lineStamp: "+1 sello",
    linePoints: (amount: string, n: number) => `${amount}: +${n} puntos`,
    lineCash: (amount: string, back: string) => `${amount}: +${back} de saldo`,
    redeemed: "Premio canjeado en caja",
    statusCash: (v: string) => `Saldo para tu próxima compra: ${v}`,
    statusReady: "Premio listo: café gratis",
    statusStamps: (n: number) => `Te faltan ${n} sellos para tu café gratis`,
    statusPoints: (n: number) => `Te faltan ${n} puntos para tu café gratis`,
    head: { sellos: "SELLOS", puntos: "PUNTOS", cashback: "SALDO" },
    member: "MIEMBRO",
    reward: "PREMIO",
    rewardFree: "Café gratis",
    rewardCash: "5% de vuelta",
    showCode: "Muestra este código en caja",
    foot: "Se actualiza sola en Google Wallet",
  },

  // Cara de la tarjeta 3D (se dibuja en un canvas).
  card: {
    stamps: "SELLOS",
    of: (n: number) => `${n} de 10`,
    member: "MIEMBRO",
    left: "FALTAN",
    leftValue: (n: number) => `${n} sellos`,
    done: "¡Listo!",
    reward: "PREMIO",
    rewardValue: "Café gratis",
    showCode: "Muestra este código en caja",
  },

  figures: {
    title: "Lo que ya viene listo",
    items: [
      { n: 10, unit: "min", label: "desde que te registras hasta tener tu QR impreso" },
      { n: 0, unit: "apps", label: "que tus clientes tienen que descargar" },
      { n: 2, unit: "min", label: "después de la compra sale la encuesta de reseña" },
      { n: 3, unit: "idiomas", label: "español, inglés y tailandés, según el celular de cada cliente" },
    ],
    madeFor: "Hecho para",
    nichesTitle: "Hecho para negocios donde el cliente vuelve",
    niches: ["Restaurantes y cafés", "Barberías", "Salones de belleza", "Spas", "Gimnasios", "Lavacar", "Veterinarias", "Minisúper"],
  },

  steps: {
    title: "Listo en tres pasos",
    lead: "Sin técnicos, sin instalar nada en caja. Si tienes celular, ya tienes todo.",
    items: [
      { title: "Pon tu QR a la vista", text: "Te registras, subes tu logo y descargas tu código. Lo pones en el mostrador, la caja, las mesas o el espejo." },
      { title: "Tus clientes se unen en un toque", text: "Escanean, activan las notificaciones y guardan su tarjeta. Sin descargar ninguna app." },
      { title: "Tú los haces volver", text: "Sumas según el monto, mandas promociones, das cupones y ves en tus estadísticas quién regresa." },
    ],
    stepLabel: (i: number) => `Paso ${i}: `,
  },

  pricing: {
    title: "Un plan para cada etapa de tu negocio",
    lead: (days: number) =>
      `Empiezas con ${days} días gratis con todo lo de Pro. Después eliges plan y pagas con SINPE Móvil, PayPal o tarjeta. Cancelas cuando quieras.`,
    periodLabel: "Forma de pago",
    monthly: "Mensual",
    annual: "Anual, 2 meses gratis",
    flag: "Recomendado",
    perMonth: "al mes",
    perYear: "al año",
    secondary: (usd: number) => `US$${usd}, sin IVA`,
    cta: (days: number) => `Probar ${days} días gratis`,
    names: { esencial: "Esencial", pro: "Pro", multi: "Multi-local" },
    taglines: { esencial: "Para empezar con un local", pro: "Todo para que vuelvan más", multi: "Para 2 o 3 locales" },
    features: {
      esencial: [
        "Tarjeta en Google Wallet (Apple Wallet, próximamente)",
        "Escáner con PIN para tus empleados",
        "4 campañas de notificaciones al mes",
        "Aviso automático “ya casi lo logras”",
        "Estadísticas de visitas",
      ],
      pro: [
        "Todo lo de Esencial",
        "Notificaciones sin límite, programadas y por grupo",
        "Cumpleaños y “te extrañamos” con cupón",
        "Reseñas en Google después de la visita",
        "Cupones de un solo uso e inteligencia artificial",
      ],
      multi: ["Todo lo de Pro", "Hasta 3 locales (una cuenta por local)", "{extra} por cada local extra", "Soporte prioritario"],
    },
  },

  final: {
    line1: "Tu próximo cliente frecuente",
    line2: "ya está en tu negocio.",
    lead: (days: number) => `${days} días gratis. Sin tarjeta de crédito.`,
    cta: "Registrar mi negocio",
    cursor: "¡Vamos!",
    demo: "Prefiero agendar una demo",
  },

  footer: {
    tagline: "Hecho en Costa Rica para negocios donde el cliente vuelve.",
    label: "Pie de página",
    product: "Producto",
    account: "Cuenta",
    help: "Ayuda",
    demo: "Agendar demo",
    signup: "Registrar mi negocio",
    support: "Soporte",
    privacy: "Privacidad",
    terms: "Términos",
  },
};

export type NvCopy = typeof es;

const usd = (minor: number) => {
  const v = minor / 100;
  return `$${Number.isInteger(v) ? v : v.toFixed(2)}`;
};

const en: NvCopy = {
  money: usd,
  numberLocale: "en-US",

  nav: {
    skip: "Skip to content",
    home: "Smart Loyalty, home",
    sections: "Sections",
    how: "How it works",
    try: "Try it",
    pricing: "Pricing",
    login: "Log in",
    tryFree: "Try it free",
    cursorStart: "Start",
  },
  hud: { hero: "Home", how: "How it works", try: "Try it", ready: "Ready to go", steps: "Three steps", pricing: "Pricing", start: "Start" },
  loader: { label: "visits", aria: "Loading" },

  hero: {
    line1: "Customers",
    line2: "who come back.",
    lead: "Your business’s loyalty card, on your customers’ phones. Earn points, announce your promotions and get Google reviews, with no app for anyone to download.",
    cta: (days) => `Try ${days} days free`,
    how: "See how it works",
    cursorDown: "Scroll",
    note: "No credit card. Your QR ready in 10 minutes.",
    scroll: "Scroll",
  },

  value: {
    title: "Three things a paper punch card never did",
    beats: [
      {
        verb: "Collect.",
        text: "Every visit adds a stamp. Your staff scans with their PIN and the customer’s card updates on its own. At 10, the coffee is on the house.",
        data: "Purchase scanned: +1 stamp",
      },
      {
        verb: "Notify.",
        text: "Your promotions land on the lock screen. To everyone, only your regulars, or the ones who haven’t been back in weeks.",
        data: "Friday 5:00 p.m.: double stamps",
      },
      {
        verb: "Review.",
        text: "Two minutes after the purchase, a short survey arrives. Happy customers are asked for a Google review.",
        data: "Survey sent, review requested",
      },
    ],
    stepOf: (i, n) => `Step ${i} of ${n}`,
  },

  sim: {
    title: "Try it right here.",
    lead: "This is what your customer sees. Pick how you reward, scan a purchase and watch what lands on their phone.",
    choose: "Pick how you reward",
    programLabel: "Program type",
    modes: { sellos: "Stamps", puntos: "Points", cashback: "Cashback" },
    hints: {
      sellos: "1 stamp per visit. At 10, a free coffee.",
      puntos: "20 points per $1. At 400, a free coffee.",
      cashback: "5% of every purchase comes back as credit.",
    },
    amount: "Purchase amount",
    amounts: [5, 10, 15],
    pointsPerUnit: 20,
    minor: 100, // cashback credit is kept in cents
    scan: "Scan purchase",
    scanning: "Scanning…",
    cursorScan: "Scan",
    redeem: "Redeem reward",
    logLabel: "Latest purchases",
    logEmpty: "No purchases yet. Scan the first one.",
    note: "This is a demo: nothing here is saved.",
    phone: "Customer’s phone",
    day: "Saturday",
    now: "now",
    readyTitle: "Your free coffee is ready! ☕",
    readyStamps: "Show it at the counter on your next visit.",
    readyPoints: "You have 400 points. Show it at the counter.",
    almostTitle: "Almost there",
    almostStamps: "2 more stamps for your free coffee.",
    almostPoints: (n) => `${n} more points for your free coffee.`,
    lineStamp: "+1 stamp",
    linePoints: (amount, n) => `${amount}: +${n} points`,
    lineCash: (amount, back) => `${amount}: +${back} credit`,
    redeemed: "Reward redeemed at the counter",
    statusCash: (v) => `Credit for your next purchase: ${v}`,
    statusReady: "Reward ready: free coffee",
    statusStamps: (n) => `${n} more stamps for your free coffee`,
    statusPoints: (n) => `${n} more points for your free coffee`,
    head: { sellos: "STAMPS", puntos: "POINTS", cashback: "CREDIT" },
    member: "MEMBER",
    reward: "REWARD",
    rewardFree: "Free coffee",
    rewardCash: "5% back",
    showCode: "Show this code at the counter",
    foot: "Updates on its own in Google Wallet",
  },

  card: {
    stamps: "STAMPS",
    of: (n) => `${n} of 10`,
    member: "MEMBER",
    left: "TO GO",
    leftValue: (n) => `${n} stamps`,
    done: "Done!",
    reward: "REWARD",
    rewardValue: "Free coffee",
    showCode: "Show this code at the counter",
  },

  figures: {
    title: "Ready out of the box",
    items: [
      { n: 10, unit: "min", label: "from signing up to having your QR printed" },
      { n: 0, unit: "apps", label: "for your customers to download" },
      { n: 2, unit: "min", label: "after the purchase, the review survey goes out" },
      { n: 3, unit: "languages", label: "Spanish, English and Thai, matching each customer’s phone" },
    ],
    madeFor: "Made for",
    nichesTitle: "Made for businesses where customers come back",
    niches: ["Restaurants and cafés", "Barbershops", "Beauty salons", "Spas", "Gyms", "Car washes", "Vets", "Convenience stores"],
  },

  steps: {
    title: "Ready in three steps",
    lead: "No technicians, nothing to install at the register. If you have a phone, you have everything.",
    items: [
      { title: "Put your QR in sight", text: "Sign up, upload your logo and download your code. Place it on the counter, register, tables or mirror." },
      { title: "Customers join in one tap", text: "They scan, turn on notifications and save their card. No app to download." },
      { title: "You bring them back", text: "Reward by purchase amount, send promotions, give coupons and see in your stats who comes back." },
    ],
    stepLabel: (i) => `Step ${i}: `,
  },

  pricing: {
    title: "A plan for every stage of your business",
    lead: (days) =>
      `Start with ${days} days free with everything in Pro. Then pick a plan and pay with PayPal or card (SINPE Móvil in Costa Rica). Cancel anytime.`,
    periodLabel: "Billing",
    monthly: "Monthly",
    annual: "Annual, 2 months free",
    flag: "Recommended",
    perMonth: "a month",
    perYear: "a year",
    secondary: () => "Prices exclude VAT",
    cta: (days) => `Try ${days} days free`,
    names: { esencial: "Essential", pro: "Pro", multi: "Multi-location" },
    taglines: { esencial: "To start with one location", pro: "Everything to bring them back", multi: "For 2 or 3 locations" },
    features: {
      esencial: [
        "Card in Google Wallet (Apple Wallet coming soon)",
        "Staff scanner with PIN",
        "4 notification campaigns a month",
        "Automatic “almost there” message",
        "Visit statistics",
      ],
      pro: [
        "Everything in Essential",
        "Unlimited, scheduled and segmented notifications",
        "Birthday and “we miss you” with a coupon",
        "Google reviews after the visit",
        "Single-use coupons and AI",
      ],
      multi: ["Everything in Pro", "Up to 3 locations (one account each)", "{extra} per extra location", "Priority support"],
    },
  },

  final: {
    line1: "Your next regular",
    line2: "is already in your business.",
    lead: (days) => `${days} days free. No credit card.`,
    cta: "Sign up my business",
    cursor: "Let’s go!",
    demo: "I’d rather book a demo",
  },

  footer: {
    tagline: "Made in Costa Rica for businesses where customers come back.",
    label: "Footer",
    product: "Product",
    account: "Account",
    help: "Help",
    demo: "Book a demo",
    signup: "Sign up my business",
    support: "Support",
    privacy: "Privacy",
    terms: "Terms",
  },
};

const th: NvCopy = {
  money: usd,
  numberLocale: "th-TH",

  nav: {
    skip: "ข้ามไปที่เนื้อหา",
    home: "Smart Loyalty หน้าแรก",
    sections: "ส่วนต่าง ๆ",
    how: "วิธีใช้งาน",
    try: "ลองเลย",
    pricing: "ราคา",
    login: "เข้าสู่ระบบ",
    tryFree: "ทดลองฟรี",
    cursorStart: "เริ่ม",
  },
  hud: { hero: "หน้าแรก", how: "วิธีใช้งาน", try: "ลองเลย", ready: "พร้อมใช้ทันที", steps: "3 ขั้นตอน", pricing: "ราคา", start: "เริ่มเลย" },
  loader: { label: "การมาเยือน", aria: "กำลังโหลด" },

  hero: {
    line1: "ลูกค้า",
    line2: "ที่กลับมาอีก",
    lead: "บัตรสะสมแต้มของร้านคุณ อยู่ในมือถือของลูกค้า สะสมคะแนน แจ้งโปรโมชัน และได้รีวิวใน Google โดยไม่มีใครต้องดาวน์โหลดแอป",
    cta: (days) => `ทดลองใช้ฟรี ${days} วัน`,
    how: "ดูวิธีใช้งาน",
    cursorDown: "เลื่อนลง",
    note: "ไม่ต้องใช้บัตรเครดิต คิวอาร์พร้อมใช้ใน 10 นาที",
    scroll: "เลื่อน",
  },

  value: {
    title: "สามสิ่งที่บัตรกระดาษไม่เคยทำได้",
    beats: [
      {
        verb: "สะสม",
        text: "ทุกครั้งที่มาได้หนึ่งแสตมป์ พนักงานสแกนด้วย PIN และบัตรของลูกค้าอัปเดตเอง ครบ 10 ดวง รับกาแฟฟรี",
        data: "สแกนการซื้อแล้ว: +1 แสตมป์",
      },
      {
        verb: "แจ้งเตือน",
        text: "โปรโมชันของคุณขึ้นบนหน้าจอล็อก ส่งถึงทุกคน เฉพาะลูกค้าประจำ หรือคนที่ไม่ได้มาหลายสัปดาห์",
        data: "วันศุกร์ 17:00 น.: แสตมป์สองเท่า",
      },
      {
        verb: "รีวิว",
        text: "สองนาทีหลังการซื้อ แบบสอบถามสั้น ๆ จะถูกส่งไป ลูกค้าที่พอใจจะได้รับคำเชิญให้รีวิวใน Google",
        data: "ส่งแบบสอบถามแล้ว ขอรีวิวแล้ว",
      },
    ],
    stepOf: (i, n) => `ขั้นตอนที่ ${i} จาก ${n}`,
  },

  sim: {
    title: "ลองได้ที่นี่เลย",
    lead: "นี่คือสิ่งที่ลูกค้าของคุณเห็น เลือกวิธีให้รางวัล สแกนการซื้อ แล้วดูว่ามือถือของลูกค้าได้รับอะไร",
    choose: "เลือกวิธีให้รางวัล",
    programLabel: "ประเภทโปรแกรม",
    modes: { sellos: "แสตมป์", puntos: "คะแนน", cashback: "เงินคืน" },
    hints: {
      sellos: "1 แสตมป์ต่อการมา ครบ 10 ดวงรับกาแฟฟรี",
      puntos: "20 คะแนนต่อ $1 ครบ 400 คะแนนรับกาแฟฟรี",
      cashback: "5% ของทุกการซื้อกลับมาเป็นยอดเงินสะสม",
    },
    amount: "ยอดซื้อ",
    amounts: [5, 10, 15],
    pointsPerUnit: 20,
    minor: 100,
    scan: "สแกนการซื้อ",
    scanning: "กำลังสแกน…",
    cursorScan: "สแกน",
    redeem: "แลกรางวัล",
    logLabel: "การซื้อล่าสุด",
    logEmpty: "ยังไม่มีการซื้อ สแกนรายการแรกได้เลย",
    note: "นี่เป็นการสาธิต ไม่มีการบันทึกข้อมูล",
    phone: "มือถือของลูกค้า",
    day: "วันเสาร์",
    now: "ตอนนี้",
    readyTitle: "กาแฟฟรีของคุณพร้อมแล้ว! ☕",
    readyStamps: "แสดงที่เคาน์เตอร์ในครั้งหน้าที่มา",
    readyPoints: "คุณมี 400 คะแนนแล้ว แสดงที่เคาน์เตอร์ได้เลย",
    almostTitle: "ใกล้ได้รางวัลแล้ว",
    almostStamps: "อีก 2 แสตมป์ รับกาแฟฟรี",
    almostPoints: (n) => `อีก ${n} คะแนน รับกาแฟฟรี`,
    lineStamp: "+1 แสตมป์",
    linePoints: (amount, n) => `${amount}: +${n} คะแนน`,
    lineCash: (amount, back) => `${amount}: +${back} เงินสะสม`,
    redeemed: "แลกรางวัลที่เคาน์เตอร์แล้ว",
    statusCash: (v) => `ยอดสะสมสำหรับการซื้อครั้งหน้า: ${v}`,
    statusReady: "รางวัลพร้อมแล้ว: กาแฟฟรี",
    statusStamps: (n) => `อีก ${n} แสตมป์ รับกาแฟฟรี`,
    statusPoints: (n) => `อีก ${n} คะแนน รับกาแฟฟรี`,
    head: { sellos: "แสตมป์", puntos: "คะแนน", cashback: "ยอดสะสม" },
    member: "สมาชิก",
    reward: "รางวัล",
    rewardFree: "กาแฟฟรี",
    rewardCash: "คืน 5%",
    showCode: "แสดงโค้ดนี้ที่เคาน์เตอร์",
    foot: "อัปเดตเองใน Google Wallet",
  },

  card: {
    stamps: "แสตมป์",
    of: (n) => `${n} จาก 10`,
    member: "สมาชิก",
    left: "อีก",
    leftValue: (n) => `${n} ดวง`,
    done: "ครบแล้ว!",
    reward: "รางวัล",
    rewardValue: "กาแฟฟรี",
    showCode: "แสดงโค้ดนี้ที่เคาน์เตอร์",
  },

  figures: {
    title: "พร้อมใช้ทันที",
    items: [
      { n: 10, unit: "นาที", label: "ตั้งแต่สมัครจนได้คิวอาร์ที่พิมพ์แล้ว" },
      { n: 0, unit: "แอป", label: "ที่ลูกค้าต้องดาวน์โหลด" },
      { n: 2, unit: "นาที", label: "หลังการซื้อ แบบสอบถามรีวิวก็ถูกส่งไป" },
      { n: 3, unit: "ภาษา", label: "สเปน อังกฤษ และไทย ตามภาษาในมือถือของลูกค้าแต่ละคน" },
    ],
    madeFor: "ออกแบบมาสำหรับ",
    nichesTitle: "ออกแบบมาสำหรับธุรกิจที่ลูกค้ากลับมาซ้ำ",
    niches: ["ร้านอาหารและคาเฟ่", "ร้านตัดผมชาย", "ร้านเสริมสวย", "สปา", "ฟิตเนส", "คาร์แคร์", "คลินิกสัตว์", "มินิมาร์ท"],
  },

  steps: {
    title: "พร้อมใช้ใน 3 ขั้นตอน",
    lead: "ไม่ต้องมีช่าง ไม่ต้องติดตั้งอะไรที่แคชเชียร์ มีมือถือก็พร้อมแล้ว",
    items: [
      { title: "วางคิวอาร์ให้เห็นชัด", text: "สมัคร อัปโหลดโลโก้ และดาวน์โหลดโค้ดของคุณ วางไว้ที่เคาน์เตอร์ แคชเชียร์ โต๊ะ หรือกระจก" },
      { title: "ลูกค้าเข้าร่วมในแตะเดียว", text: "สแกน เปิดการแจ้งเตือน และเก็บบัตรไว้ ไม่ต้องดาวน์โหลดแอป" },
      { title: "คุณดึงลูกค้ากลับมา", text: "ให้รางวัลตามยอดซื้อ ส่งโปรโมชัน แจกคูปอง และดูสถิติว่าใครกลับมาบ้าง" },
    ],
    stepLabel: (i) => `ขั้นตอนที่ ${i}: `,
  },

  pricing: {
    title: "แพ็กเกจสำหรับทุกช่วงของธุรกิจ",
    lead: (days) => `เริ่มทดลองใช้ฟรี ${days} วันพร้อมทุกอย่างใน Pro จากนั้นเลือกแพ็กเกจและชำระผ่าน PayPal หรือบัตร ยกเลิกได้ทุกเมื่อ`,
    periodLabel: "รูปแบบการชำระ",
    monthly: "รายเดือน",
    annual: "รายปี ฟรี 2 เดือน",
    flag: "แนะนำ",
    perMonth: "ต่อเดือน",
    perYear: "ต่อปี",
    secondary: () => "ราคายังไม่รวมภาษี",
    cta: (days) => `ทดลองใช้ฟรี ${days} วัน`,
    names: { esencial: "เริ่มต้น", pro: "Pro", multi: "หลายสาขา" },
    taglines: { esencial: "สำหรับเริ่มต้นหนึ่งสาขา", pro: "ครบทุกอย่างให้ลูกค้ากลับมา", multi: "สำหรับ 2 หรือ 3 สาขา" },
    features: {
      esencial: [
        "บัตรใน Google Wallet (Apple Wallet เร็ว ๆ นี้)",
        "เครื่องสแกนของพนักงานพร้อม PIN",
        "แคมเปญแจ้งเตือน 4 ครั้งต่อเดือน",
        "ข้อความอัตโนมัติ “ใกล้ได้รางวัลแล้ว”",
        "สถิติการมาใช้บริการ",
      ],
      pro: [
        "ทุกอย่างในแพ็กเกจเริ่มต้น",
        "แจ้งเตือนไม่จำกัด ตั้งเวลาและส่งตามกลุ่มได้",
        "วันเกิดและ “คิดถึงคุณ” พร้อมคูปอง",
        "รีวิวใน Google หลังมาใช้บริการ",
        "คูปองใช้ครั้งเดียวและ AI",
      ],
      multi: ["ทุกอย่างในแพ็กเกจ Pro", "สูงสุด 3 สาขา (หนึ่งบัญชีต่อสาขา)", "{extra} ต่อสาขาเพิ่มเติม", "ซัพพอร์ตแบบเร่งด่วน"],
    },
  },

  final: {
    line1: "ลูกค้าประจำคนต่อไป",
    line2: "อยู่ในร้านของคุณแล้ว",
    lead: (days) => `ฟรี ${days} วัน ไม่ต้องใช้บัตรเครดิต`,
    cta: "ลงทะเบียนร้านของฉัน",
    cursor: "ไปกันเลย!",
    demo: "ขอนัดดูเดโมแทน",
  },

  footer: {
    tagline: "ผลิตในคอสตาริกา สำหรับธุรกิจที่ลูกค้ากลับมาซ้ำ",
    label: "ส่วนท้าย",
    product: "ผลิตภัณฑ์",
    account: "บัญชี",
    help: "ช่วยเหลือ",
    demo: "นัดดูเดโม",
    signup: "ลงทะเบียนร้านของฉัน",
    support: "ซัพพอร์ต",
    privacy: "ความเป็นส่วนตัว",
    terms: "ข้อกำหนด",
  },
};

export const NV_COPY: Record<Locale, NvCopy> = { es, en, th };
