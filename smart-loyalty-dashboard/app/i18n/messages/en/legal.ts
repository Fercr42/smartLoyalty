import type { Messages } from "../es";

export const legal: Messages["legal"] = {
  updated: "Last updated: 20 September 2026",
  company: "Smart Loyalty, operated by Fernando Rodríguez (Costa Rica)",
  contact: "Contact: {email}",
  backHome: "Back to home",
  privacyLink: "Privacy",
  termsLink: "Terms",
  privacy: {
    metaTitle: "Privacy policy · Smart Loyalty",
    metaDescription: "What data Smart Loyalty stores, what it is used for and how to ask for it to be deleted.",
    title: "Privacy policy",
    intro:
      "Smart Loyalty is a tool businesses (restaurants, barbershops, salons, cafés and others) use for their customer programme: point card, coupons and notifications. This page explains what data we store, why, and what you can ask us for.",
    sections: [
      {
        h: "Who is responsible for your data",
        p: [
          "{company} provides the service and is responsible for the platform.",
          "The business whose QR code you scanned decides which rewards it offers and which messages it sends you. We store the data on that business's behalf.",
        ],
      },
      {
        h: "Data about a business's customers",
        p: [
          "When you scan the QR and accept notifications we store: the identifier your phone's browser provides to receive notifications, a card code, your points, visits, redeemed rewards and used coupons.",
          "If you choose to protect your card, we store your email address. If you allow it, that email is shared with the business.",
          "If you enter it, we store the day and month of your birthday (not the year) for the birthday gift.",
          "If you answer the survey, we store your 1-to-5 rating and your comment.",
          "We do not ask for or store your full name, address, ID number or payment details.",
        ],
      },
      {
        h: "Data about businesses",
        p: [
          "From the owner we store: business name, business type, contact name, email, WhatsApp number, city, logo, colors, rewards, messages and usage statistics.",
          "Payments are processed by PayPal. We never see or store card numbers.",
        ],
      },
      {
        h: "What we use the data for",
        p: [
          "To run the point card, the coupons and the notifications the business sends.",
          "To show the business its visit statistics and campaign results.",
          "To charge the business's subscription and provide support.",
          "To calculate aggregated, anonymous statistics that help us improve the product.",
          "We do not sell personal data and do not use it for third-party advertising.",
        ],
      },
      {
        h: "Who we share it with",
        p: [
          "Google (Firebase and Firebase Cloud Messaging): stores the data and delivers the notifications.",
          "Google Wallet: only if you save your card there; it receives the business name, your card code and your points.",
          "Google Gemini: when the owner uses the artificial intelligence, their promotion texts, business statistics and survey comments are sent (without customer emails or identifiers) to draft suggestions and summaries.",
          "PayPal: to charge the business's subscription.",
          "Vercel: serves the website.",
          "These services may process the information outside your country, including the United States.",
        ],
      },
      {
        h: "How long we keep it",
        p: [
          "For as long as the business uses Smart Loyalty and you have your card.",
          "If you ask us to delete your card, we remove it along with your points, coupons and feedback.",
          "If a business closes its account, we delete its data and its customers' data within 90 days.",
        ],
      },
      {
        h: "Your rights",
        p: [
          "You can ask to see, correct or delete your data by writing to {email}, or by asking the business where you use the card.",
          "You can stop notifications at any time: turn them off in your browser or phone settings for that site.",
          "You can remove the card from Google Wallet in the Wallet app itself.",
        ],
      },
      {
        h: "Children",
        p: ["The service is not aimed at children under 13. If we find a child's data, we delete it."],
      },
      {
        h: "Cookies and browser storage",
        p: [
          "We use a cookie to remember your language, and browser storage to remember your card on that phone.",
          "We do not use advertising or cross-site tracking cookies.",
        ],
      },
      {
        h: "Security",
        p: [
          "Data travels encrypted (HTTPS) and is stored in Google Firebase with access rules.",
          "Staff PINs are stored hashed and staff sessions expire after 12 hours.",
        ],
      },
      {
        h: "Changes",
        p: ["If we change this policy, we update the date above and publish the new version on this page."],
      },
    ],
  },
  terms: {
    metaTitle: "Terms of use · Smart Loyalty",
    metaDescription: "Smart Loyalty service terms: plan, payments, cancellation and acceptable use.",
    title: "Terms of use",
    intro: "These terms apply to the business that subscribes to Smart Loyalty and to the people who use the customer card.",
    sections: [
      {
        h: "The service",
        p: [
          "Smart Loyalty provides a digital point card, coupons, phone notifications, a satisfaction survey, statistics and artificial-intelligence help.",
          "The service is provided as is. We work to keep it available, but we do not guarantee uninterrupted operation.",
        ],
      },
      {
        h: "Business account",
        p: [
          "To sign up you need a Google account and real details about your business.",
          "You are responsible for your account, for the PIN you give your team and for what is done with them.",
        ],
      },
      {
        h: "Price, trial and payments",
        p: [
          "The free trial lasts {days} days with every feature and needs no card.",
          "After that it costs {price} USD a month. PayPal charges automatically until you cancel.",
          "If a charge fails, we keep access for a few days while PayPal retries.",
        ],
      },
      {
        h: "Cancellation",
        p: [
          "You can cancel anytime from the Plan section of your dashboard. You keep access until the end of the month already paid.",
          "We do not refund months already charged, unless the law requires it.",
          "After cancelling, your customers keep their card and points, but sends and automations stop.",
        ],
      },
      {
        h: "Acceptable use",
        p: [
          "You may only message customers who agreed to receive messages, and only about your own business.",
          "Misleading, offensive or illegal content, content unrelated to your business, and reselling the service without permission are not allowed.",
          "Honouring your rewards, coupons and promotions is your responsibility, not ours.",
          "We may suspend an account that breaks these rules or generates complaints from its customers.",
        ],
      },
      {
        h: "Content and artificial intelligence",
        p: [
          "The texts, photos and logos you upload remain yours; you allow us to show them inside the service to your customers.",
          "The artificial intelligence suggests texts and summaries that may contain mistakes. Review them before sending: you are responsible for what is sent.",
        ],
      },
      {
        h: "Your data",
        p: [
          "Your customers' data is yours. You can download it as a spreadsheet from the dashboard anytime.",
          "How personal data is handled is explained in the privacy policy.",
          "We may use aggregated, anonymous information (for example, average visits or returning-customer rates) to improve the product and in sales material, without identifying your business or your customers, unless you give us written permission.",
        ],
      },
      {
        h: "Liability",
        p: [
          "We are not liable for lost sales, profits or data arising from use of the service.",
          "Our maximum liability is the amount you paid in the last 3 months.",
        ],
      },
      {
        h: "Changes and closing",
        p: [
          "We may change features or prices with at least 30 days' notice in the dashboard or by email.",
          "You can stop using the service whenever you want.",
        ],
      },
      {
        h: "Governing law",
        p: ["These terms are governed by the laws of Costa Rica."],
      },
    ],
  },
};
