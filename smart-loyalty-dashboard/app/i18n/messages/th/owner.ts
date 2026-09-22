import type { Messages } from "../es";

export const auth: Messages["auth"] = {
  title: "เข้าสู่แดชบอร์ดของคุณ",
  loginError: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ โปรดลองอีกครั้ง",
};

export const signup: Messages["signup"] = {
  metaTitle: "ลงทะเบียนร้านของคุณ · Smart Loyalty",
  metaDescription: "สร้างบัญชีและทดลองใช้ Smart Loyalty ฟรี ไม่ต้องใช้บัตรเครดิต",
  eyebrow: "ฟรี {days} วัน · ไม่ต้องใช้บัตร",
  title: "ลงทะเบียนร้านของคุณ",
  lead: "ภายใน 10 นาที คิวอาร์ของคุณพร้อมวางให้ลูกค้าเห็น",
  account: "บัญชี:",
  name: "ชื่อร้าน",
  namePlaceholder: "ลีโอ บาร์เบอร์",
  type: "ประเภทธุรกิจ",
  owner: "ชื่อของคุณ",
  phone: "WhatsApp หรือ LINE",
  city: "เมืองและประเทศ",
  cityPlaceholder: "กรุงเทพฯ ประเทศไทย",
  creating: "กำลังสร้างบัญชี...",
  start: "เริ่มทดลองใช้ {days} วัน",
  failed: "ลงทะเบียนไม่สำเร็จ",
  haveAccount: "มีบัญชีแล้ว?",
  login: "เข้าสู่ระบบ",
};

export const panel: Messages["panel"] = {
  metaTitle: "แดชบอร์ด · Smart Loyalty",
  tabs: {
    inicio: { label: "หน้าหลัก", description: "ภาพรวมร้านของคุณใน 30 วันที่ผ่านมา" },
    mensajes: { label: "ข้อความ", description: "ส่งหรือตั้งเวลาโปรโมชัน เวลาเปิด-ปิด และกิจกรรม" },
    resultados: { label: "ผลลัพธ์", description: "เกิดอะไรขึ้นหลังแต่ละข้อความ: การเปิดอ่าน คูปอง และลูกค้าที่กลับมา" },
    automatizaciones: { label: "อัตโนมัติ", description: "ข้อความที่ส่งเองในเวลาที่เหมาะสม" },
    tarjeta: { label: "บัตร", description: "ดีไซน์บัตรของคุณและสิ่งที่แสดงใน Google Wallet" },
    recompensas: { label: "รางวัล", description: "รางวัลจากคะแนน เครื่องสแกนของพนักงาน และรีวิว" },
    negocio: { label: "ร้านของฉัน", description: "ชื่อ ประเภท ภาษา โลโก้ สี และคิวอาร์โค้ดของคุณ" },
    clientes: { label: "ลูกค้า", description: "ใครมีบัตรของคุณบ้าง: ชื่อ คะแนน จำนวนครั้งที่มา และช่องทางติดต่อ" },
    plan: { label: "แพ็กเกจ", description: "การสมัครสมาชิก Smart Loyalty ของคุณ" },
  },
  sectionsLabel: "ส่วนต่าง ๆ ของแดชบอร์ด",
  finishTitle: "ลงทะเบียนให้เสร็จ",
  finishLead: "กรอกข้อมูลร้านเพื่อเริ่มทดลองใช้ฟรี",
  finishCta: "ลงทะเบียนให้เสร็จ",
  cardDesign: "ดีไซน์บัตร",
  walletData: "ข้อมูลและปุ่มใน Google Wallet",
  businessData: "ข้อมูลร้าน",
  qrTitle: "คิวอาร์โค้ดของคุณ",
};

export const planBanner: Messages["planBanner"] = {
  expiredTitle: "แพ็กเกจของคุณยังไม่เปิดใช้งาน",
  expiredText: "ลูกค้ายังเห็นบัตรและยังสะสมคะแนนได้ แต่คุณส่งการแจ้งเตือนหรือใช้ระบบอัตโนมัติไม่ได้",
  failedTitle: "การชำระเงินผ่าน PayPal ครั้งล่าสุดไม่สำเร็จ",
  failedText: "PayPal จะลองเรียกเก็บอีกครั้ง โปรดตรวจสอบวิธีชำระเงินของคุณ",
  trialOne: "เหลือเวลาทดลองใช้ฟรีอีก 1 วัน",
  trialMany: "เหลือเวลาทดลองใช้ฟรีอีก {days} วัน",
  trialText: "ใช้ได้ทุกฟีเจอร์",
  activate: "เปิดใช้แพ็กเกจ",
};

export const business: Messages["business"] = {
  name: "ชื่อร้าน",
  description: "คำอธิบาย (ร้านของคุณมีอะไรบ้าง)",
  type: "ประเภทธุรกิจ",
  language: "ภาษาของข้อความอัตโนมัติ",
  languageHint: "วันเกิด “ใกล้ได้รางวัล” คำขอรีวิว และข้อความใน Google Wallet",
  logo: "โลโก้",
  changeLogo: "เปลี่ยนโลโก้",
  uploadLogo: "อัปโหลดโลโก้",
  buttonColor: "สีปุ่ม",
  bgColor: "สีพื้นหลัง",
  previewNote: "หน้าคิวอาร์และหน้าโปรโมชันของคุณจะมีหน้าตาแบบนี้",
  previewButton: "เปิดการแจ้งเตือน",
  nameRequired: "กรอกชื่อร้าน",
  savedWallet: "บันทึกแล้ว · อัปเดตบัตร Wallet แล้ว {count} ใบ",
  invalidImage: "รูปภาพไม่ถูกต้อง",
};

export const qr: Messages["qr"] = {
  hint: "ลูกค้าสแกนเพื่อเข้าร่วม สะสมคะแนน และรับโปรโมชันของคุณ",
  download: "ดาวน์โหลด PNG",
  fileName: "smart-loyalty-qr.png",
};

export const labels: Messages["labels"] = {
  audiences: {
    all: "ทุกคน",
    frequent: "ลูกค้าประจำ",
    inactive: "ลูกค้าที่หายไป",
    near_reward: "ใกล้ได้รางวัล",
    members: "ลูกค้าที่เลือก",
  },
  automatic: {
    review: "ขอรีวิว (อัตโนมัติ)",
    near_reward: "ใกล้ได้รางวัล (อัตโนมัติ)",
    birthday: "วันเกิด (อัตโนมัติ)",
    winback: "คิดถึงนะ (อัตโนมัติ)",
  },
};

export const customers: Messages["customers"] = {
  search: "ค้นหาด้วยชื่อ รหัส หรืออีเมล",
  count: "ลูกค้า {count} คน",
  showing: "แสดง {shown} จาก {count}",
  empty: "ยังไม่มีลูกค้า ลูกค้าจะแสดงที่นี่หลังจากสแกนคิวอาร์ของคุณ",
  noResults: "ไม่พบลูกค้าที่ตรงกับการค้นหา",
  noName: "ไม่มีชื่อ",
  name: "ลูกค้า",
  points: "คะแนน",
  visits: "ครั้งที่มา",
  lastVisit: "มาล่าสุด",
  contact: "ติดต่อ",
  never: "—",
  wallet: "Wallet",
  push: "การแจ้งเตือน",
  birthday: "วันเกิด {date}",
  loadError: "โหลดรายชื่อลูกค้าไม่สำเร็จ",
  namesHint: "ลูกค้ากรอกชื่อของตนเองบนบัตร (หน้าคิวอาร์ของคุณ)",
};
