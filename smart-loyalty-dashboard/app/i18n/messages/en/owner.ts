import type { Messages } from "../es";

export const auth: Messages["auth"] = {
  title: "Log in to your dashboard",
  loginError: "Couldn't sign in with Google. Please try again.",
};

export const signup: Messages["signup"] = {
  metaTitle: "Sign up your business · Smart Loyalty",
  metaDescription: "Create your account and try Smart Loyalty for free. No credit card.",
  eyebrow: "{days} days free · no card",
  title: "Sign up your business",
  lead: "In 10 minutes your QR is ready to put in front of your customers.",
  account: "Account:",
  name: "Business name",
  namePlaceholder: "Leo's Barbershop",
  type: "Type of business",
  owner: "Your name",
  phone: "WhatsApp",
  city: "City and country",
  cityPlaceholder: "Bangkok, Thailand",
  creating: "Creating your account...",
  start: "Start {days}-day trial",
  failed: "Couldn't complete sign-up",
  haveAccount: "Already have an account?",
  login: "Log in",
};

export const panel: Messages["panel"] = {
  metaTitle: "Dashboard · Smart Loyalty",
  tabs: {
    inicio: { label: "Home", description: "How your business did in the last 30 days." },
    mensajes: { label: "Messages", description: "Send or schedule promotions, opening hours and events." },
    resultados: { label: "Results", description: "What happened after each message: opens, coupons and customers who came back." },
    automatizaciones: { label: "Automations", description: "Messages that send themselves at the right moment." },
    tarjeta: { label: "Card", description: "Your card design and what it shows in Google Wallet." },
    recompensas: { label: "Rewards", description: "Point rewards, staff scanner and reviews." },
    negocio: { label: "My business", description: "Name, type, language, logo, colors and your QR code." },
    plan: { label: "Plan", description: "Your Smart Loyalty subscription." },
  },
  sectionsLabel: "Dashboard sections",
  finishTitle: "Finish signing up",
  finishLead: "Fill in your business details to start your free trial.",
  finishCta: "Complete sign-up",
  cardDesign: "Card design",
  walletData: "Google Wallet details and buttons",
  businessData: "Business details",
  qrTitle: "Your QR code",
};

export const planBanner: Messages["planBanner"] = {
  expiredTitle: "Your plan isn't active.",
  expiredText: "Your customers still see their card and points still work, but you can't send notifications or use automations.",
  failedTitle: "The last PayPal payment failed.",
  failedText: "PayPal will retry it; please check your payment method.",
  trialOne: "1 day left in your free trial.",
  trialMany: "{days} days left in your free trial.",
  trialText: "Every feature is available.",
  activate: "Activate plan",
};

export const business: Messages["business"] = {
  name: "Business name",
  description: "Description (what you offer)",
  type: "Type of business",
  language: "Language of automatic messages",
  languageHint: "Birthday, “Almost there”, review request and Google Wallet texts.",
  logo: "Logo",
  changeLogo: "Change logo",
  uploadLogo: "Upload logo",
  buttonColor: "Button color",
  bgColor: "Background color",
  previewNote: "This is how your QR and promotion pages will look",
  previewButton: "Turn on notifications",
  nameRequired: "Enter your business name.",
  savedWallet: "Saved · {count} Wallet cards updated.",
  invalidImage: "Invalid image",
};

export const qr: Messages["qr"] = {
  hint: "Customers scan it to join, collect points and get your promotions",
  download: "Download PNG",
  fileName: "smart-loyalty-qr.png",
};

export const labels: Messages["labels"] = {
  audiences: {
    all: "Everyone",
    frequent: "Frequent",
    inactive: "Inactive",
    near_reward: "Close to a reward",
    members: "Selected customers",
  },
  automatic: {
    review: "Review request (automatic)",
    near_reward: "Almost there (automatic)",
    birthday: "Birthday (automatic)",
    winback: "We miss you (automatic)",
  },
};
