import type { Locale } from "./config";

// El servidor responde los errores en español. En el navegador se traducen con esta tabla (inglés y tailandés).
// Si un mensaje no está aquí, se muestra tal cual.

type Table = Record<string, [en: string, th: string]>;

const EXACT: Table = {
  "No autorizado": ["Not authorized", "ไม่ได้รับอนุญาต"],
  "Sesión inválida": ["Invalid session. Log in again.", "เซสชันไม่ถูกต้อง โปรดเข้าสู่ระบบอีกครั้ง"],
  "Restaurante no encontrado": ["Business not found", "ไม่พบร้าน"],
  "Restaurante inválido": ["Invalid business", "ร้านไม่ถูกต้อง"],
  "Datos inválidos": ["Invalid data", "ข้อมูลไม่ถูกต้อง"],
  "Primero registra tu empresa": ["Sign up your business first", "ลงทะเบียนร้านก่อน"],
  "Acción inválida": ["Invalid action", "การดำเนินการไม่ถูกต้อง"],
  "Tarjeta no encontrada": ["Card not found", "ไม่พบบัตร"],
  "Tarjeta no encontrada en este restaurante": ["Card not found at this business", "ไม่พบบัตรในร้านนี้"],
  "Tarjeta inválida": ["Invalid card", "บัตรไม่ถูกต้อง"],
  "Recompensa no encontrada": ["Reward not found", "ไม่พบรางวัล"],
  "Cupón inválido": ["Invalid coupon", "คูปองไม่ถูกต้อง"],
  "Tipo inválido": ["Invalid type", "ประเภทไม่ถูกต้อง"],
  "Suscripción inválida": ["Invalid subscription", "การสมัครไม่ถูกต้อง"],
  "Tu sesión terminó. Vuelve a escribir el PIN.": ["Your session ended. Enter the PIN again.", "เซสชันหมดอายุ โปรดใส่ PIN อีกครั้ง"],
  "El dueño aún no configura el PIN de empleados": ["The owner hasn't set the staff PIN yet", "เจ้าของร้านยังไม่ได้ตั้ง PIN ของพนักงาน"],
  "Demasiados intentos. Espera 10 minutos.": ["Too many attempts. Wait 10 minutes.", "ลองหลายครั้งเกินไป โปรดรอ 10 นาที"],
  "PIN incorrecto": ["Wrong PIN", "PIN ไม่ถูกต้อง"],
  "El PIN debe tener de 4 a 8 números": ["The PIN must be 4 to 8 digits", "PIN ต้องเป็นตัวเลข 4 ถึง 8 หลัก"],
  "Código no válido. Son 8 caracteres, ej. 3F9A12BC.": ["Invalid code. It has 8 characters, e.g. 3F9A12BC.", "โค้ดไม่ถูกต้อง ต้องมี 8 ตัวอักษร เช่น 3F9A12BC"],
  "Hay más de una tarjeta con ese código. Escanea el QR.": ["More than one card has that code. Scan the QR.", "มีบัตรมากกว่าหนึ่งใบที่ใช้โค้ดนี้ โปรดสแกนคิวอาร์"],
  "Este cupón ya no está activo.": ["This coupon is no longer active.", "คูปองนี้ปิดใช้แล้ว"],
  "Este cupón ya venció.": ["This coupon has expired.", "คูปองนี้หมดอายุแล้ว"],
  "Este cupón es para otro cliente.": ["This coupon belongs to another customer.", "คูปองนี้เป็นของลูกค้าคนอื่น"],
  "Este cliente ya usó este cupón.": ["This customer already used this coupon.", "ลูกค้าคนนี้ใช้คูปองนี้แล้ว"],
  "A esta tarjeta ya se le sumaron puntos hace menos de 1 minuto.": ["This card got points less than 1 minute ago.", "บัตรนี้เพิ่งได้แต้มไปเมื่อไม่ถึง 1 นาทีที่แล้ว"],
  "Ya nos dejaste tu opinión hoy. ¡Gracias!": ["You already left feedback today. Thanks!", "วันนี้คุณให้ความคิดเห็นแล้ว ขอบคุณ!"],
  "Escribe tu nombre.": ["Enter your name.", "กรอกชื่อของคุณ"],
  "Escribe el monto de la compra.": ["Enter the purchase amount.", "กรอกยอดซื้อ"],
  "Elige de 1 a 5 estrellas": ["Choose 1 to 5 stars", "เลือก 1 ถึง 5 ดาว"],
  "Tu cumpleaños ya está registrado": ["Your birthday is already saved", "บันทึกวันเกิดของคุณไว้แล้ว"],
  "Fecha de cumpleaños no válida": ["Invalid birthday", "วันเกิดไม่ถูกต้อง"],
  "Verifica tu correo primero": ["Verify your email first", "ยืนยันอีเมลของคุณก่อน"],
  "correo sin verificar": ["Email not verified", "ยังไม่ได้ยืนยันอีเมล"],
  "Abre el enlace de tu correo para proteger tu tarjeta": ["Open the link in your email to protect your card", "เปิดลิงก์ในอีเมลเพื่อป้องกันบัตรของคุณ"],
  "Esta tarjeta ya está protegida con otro correo": ["This card is already protected with another email", "บัตรนี้ผูกกับอีเมลอื่นแล้ว"],
  "No se pudo verificar tu correo. Vuelve a pedir el enlace.": ["Couldn't verify your email. Request the link again.", "ยืนยันอีเมลไม่สำเร็จ โปรดขอลิงก์อีกครั้ง"],
  "El código tiene 8 letras y números": ["The code has 8 letters and numbers", "โค้ดมีตัวอักษรและตัวเลข 8 ตัว"],
  "Código inválido o vencido. Pide uno nuevo.": ["Invalid or expired code. Request a new one.", "โค้ดไม่ถูกต้องหรือหมดอายุ โปรดขอใหม่"],
  "No se pudo crear el código. Inténtalo de nuevo.": ["Couldn't create the code. Please try again.", "สร้างโค้ดไม่สำเร็จ โปรดลองอีกครั้ง"],
  "El título es obligatorio (máx. 65)": ["A title is required (max. 65)", "ต้องมีหัวข้อ (สูงสุด 65)"],
  "El mensaje es obligatorio (máx. 240)": ["A message is required (max. 240)", "ต้องมีข้อความ (สูงสุด 240)"],
  "La foto debe ser JPG, PNG o WebP de menos de 2 MB": ["The photo must be JPG, PNG or WebP under 2 MB", "รูปต้องเป็น JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB"],
  "El enlace del botón debe empezar con https://": ["The button link must start with https://", "ลิงก์ของปุ่มต้องขึ้นต้นด้วย https://"],
  "El texto del botón es muy largo (máx. 30)": ["The button text is too long (max. 30)", "ข้อความปุ่มยาวเกินไป (สูงสุด 30)"],
  "El cupón necesita un nombre (máx. 60)": ["The coupon needs a name (max. 60)", "คูปองต้องมีชื่อ (สูงสุด 60)"],
  "La fecha de vencimiento del cupón no es válida": ["The coupon expiry date isn't valid", "วันหมดอายุของคูปองไม่ถูกต้อง"],
  "La fecha de envío no es válida": ["The send date isn't valid", "วันส่งไม่ถูกต้อง"],
  "Primero guarda los datos del restaurante": ["Save your business details first", "บันทึกข้อมูลร้านก่อน"],
  "Google Wallet aún no está configurado": ["Google Wallet isn't set up yet", "ยังไม่ได้ตั้งค่า Google Wallet"],
  "No se pudieron actualizar las tarjetas": ["Couldn't update the cards", "อัปเดตบัตรไม่สำเร็จ"],
  "El archivo debe ser una imagen (PNG, JPG o WebP).": ["The file must be an image (PNG, JPG or WebP).", "ไฟล์ต้องเป็นรูปภาพ (PNG, JPG หรือ WebP)"],
  "No se pudo leer la imagen.": ["Couldn't read the image.", "อ่านรูปภาพไม่สำเร็จ"],
  "No se pudo comprimir la foto. Prueba con otra imagen.": ["Couldn't compress the photo. Try another image.", "บีบอัดรูปไม่สำเร็จ ลองใช้รูปอื่น"],
  "Inicia sesión con Google para registrarte": ["Log in with Google to sign up", "เข้าสู่ระบบด้วย Google เพื่อสมัคร"],
  "Escribe el nombre del restaurante": ["Enter your business name", "กรอกชื่อร้าน"],
  "Escribe tu nombre": ["Enter your name", "กรอกชื่อของคุณ"],
  "Escribe un número de WhatsApp válido, ej. +506 8888 8888": ["Enter a valid WhatsApp number, e.g. +66 81 234 5678", "กรอกหมายเลขโทรศัพท์ที่ถูกต้อง เช่น +66 81 234 5678"],
  "PayPal todavía no confirma el pago. Espera un momento y recarga.": ["PayPal hasn't confirmed the payment yet. Wait a moment and reload.", "PayPal ยังไม่ยืนยันการชำระเงิน รอสักครู่แล้วรีเฟรช"],
  "No tienes una suscripción de PayPal activa": ["You don't have an active PayPal subscription", "คุณไม่มีการสมัคร PayPal ที่ใช้งานอยู่"],
  "No se pudo confirmar el pago con PayPal. Inténtalo de nuevo.": ["Couldn't confirm the PayPal payment. Please try again.", "ยืนยันการชำระเงินกับ PayPal ไม่สำเร็จ โปรดลองอีกครั้ง"],
  "No se pudo cancelar en PayPal. Inténtalo de nuevo.": ["Couldn't cancel in PayPal. Please try again.", "ยกเลิกใน PayPal ไม่สำเร็จ โปรดลองอีกครั้ง"],
  "La suscripción no pertenece a esta cuenta": ["The subscription doesn't belong to this account", "การสมัครนี้ไม่ใช่ของบัญชีนี้"],
  "La suscripción es de otro plan": ["The subscription is for a different plan", "การสมัครนี้เป็นแพ็กเกจอื่น"],
  "Tu plan no está activo. Actívalo en la sección Tu plan del panel para seguir enviando notificaciones.": [
    "Your plan isn't active. Activate it in the Plan section of your dashboard to keep sending notifications.",
    "แพ็กเกจของคุณยังไม่เปิดใช้งาน เปิดใช้ในส่วน แพ็กเกจ ของแดชบอร์ดเพื่อส่งการแจ้งเตือนต่อ",
  ],
  "Cuéntale a la IA qué quieres lograr.": ["Tell the AI what you want to achieve.", "บอก AI ว่าคุณอยากได้อะไร"],
  "La IA todavía no está configurada.": ["AI isn't set up yet.", "ยังไม่ได้ตั้งค่า AI"],
  "La IA no pudo responder esta vez. Prueba escribirlo de otra forma.": ["The AI couldn't answer this time. Try wording it differently.", "AI ตอบไม่ได้ในครั้งนี้ ลองเขียนใหม่อีกแบบ"],
  "La IA está ocupada. Inténtalo en un minuto.": ["The AI is busy. Try again in a minute.", "AI กำลังยุ่ง โปรดลองอีกครั้งในหนึ่งนาที"],
  "La IA no respondió. Inténtalo de nuevo.": ["The AI didn't respond. Please try again.", "AI ไม่ตอบสนอง โปรดลองอีกครั้ง"],
};

// Mensajes con datos variables.
const PATTERNS: [RegExp, en: string, th: string][] = [
  [/^Llegaste al máximo de (\d+) usos de IA de hoy\. Mañana se renueva\.$/, "You've reached today's limit of $1 AI uses. It resets tomorrow.", "ใช้ AI ครบ $1 ครั้งของวันนี้แล้ว จะรีเซ็ตพรุ่งนี้"],
  [/^Necesitas al menos (\d+) opiniones de los últimos (\d+) días\.$/, "You need at least $1 reviews from the last $2 days.", "ต้องมีความคิดเห็นอย่างน้อย $1 รายการใน $2 วันที่ผ่านมา"],
  [/^Le faltan (\d+) puntos para "(.+)"\.$/, "$1 more points needed for “$2”.", "ยังขาดอีก $1 แต้มสำหรับ “$2”"],
];

export function translateError(locale: Locale, message?: string | null): string | undefined {
  if (!message || locale === "es") return message ?? undefined;
  const i = locale === "en" ? 0 : 1;
  const exact = EXACT[message];
  if (exact) return exact[i];
  for (const [re, en, th] of PATTERNS) if (re.test(message)) return message.replace(re, i === 0 ? en : th);
  return message;
}
