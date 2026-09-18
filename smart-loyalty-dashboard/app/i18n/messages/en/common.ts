import type { Messages } from "../es";

export const common: Messages["common"] = {
  language: "Language",
  appDescription: "Stamp cards, coupons and notifications that bring your customers back to your business.",
  save: "Save",
  saving: "Saving...",
  saved: "Saved.",
  cancel: "Cancel",
  remove: "Remove",
  refresh: "Refresh",
  loading: "Loading...",
  logout: "Log out",
  continueWithGoogle: "Continue with Google",
  networkError: "Couldn't save. Check your connection and try again.",
};

export const niches: Messages["niches"] = {
  types: {
    restaurant: "Restaurant",
    cafe: "Café or bakery",
    bar: "Bar",
    barbershop: "Barbershop",
    beauty: "Beauty or nail salon",
    spa: "Spa or aesthetics",
    gym: "Gym or studio",
    carwash: "Car wash",
    vet: "Vet or pet shop",
    retail: "Shop or convenience store",
    other: "Other",
  },
  rewardHints: {
    restaurant: ["Free drink", "Free dessert", "Free main dish"],
    cafe: ["Free coffee", "Free pastry", "Free breakfast"],
    bar: ["Free beer", "Free snack", "Free cocktail"],
    barbershop: ["Free wash", "Free beard trim", "Free haircut"],
    beauty: ["Free nail art", "Free manicure", "Free hair treatment"],
    spa: ["Free face mask", "Free 30-min massage", "Free facial"],
    gym: ["Free shake", "Free class", "Free week"],
    carwash: ["Free vacuum", "Free wax", "Free wash"],
    vet: ["Treat for your pet", "Free bath", "Free check-up"],
    retail: ["Surprise gift", "5% off", "10% off"],
    other: ["Surprise gift", "10% off", "Free service"],
  },
};
