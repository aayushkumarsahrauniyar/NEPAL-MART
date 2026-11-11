import type { OrderStatus, PaymentStatus, SiteSettings } from "./types";

export const SITE_NAME = "Nepal Mart";
export const SITE_TAGLINE = "Nepal's trusted online marketplace";
export const CURRENCY = "NPR";
export const COUNTRY = "Nepal";

export const PROVINCES = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
] as const;

export const SHIPPING_METHODS = [
  { id: "standard", label: "Standard delivery (2-4 days)", feePaisa: 10000, freeOverPaisa: 500000 },
  { id: "express", label: "Express delivery (Kathmandu Valley, 24h)", feePaisa: 25000, freeOverPaisa: null },
  { id: "pickup", label: "Store pickup", feePaisa: 0, freeOverPaisa: null },
] as const;

export type ShippingMethodId = (typeof SHIPPING_METHODS)[number]["id"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

/** Allowed status transitions. Prevents admin/function mistakes from skipping steps. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "returned"],
  out_for_delivery: ["delivered", "returned"],
  delivered: ["returned", "refunded"],
  cancelled: [],
  returned: ["refunded"],
  refunded: [],
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  cod_pending: "Cash on delivery pending",
};

export const LOW_STOCK_DEFAULT = 5;
export const MAX_CART_QUANTITY = 20;
export const PRODUCTS_PAGE_SIZE = 12;

export const DEFAULT_SETTINGS: Omit<SiteSettings, "id"> = {
  siteName: SITE_NAME,
  tagline: SITE_TAGLINE,
  currency: CURRENCY,
  contactEmail: "support@nepalmart.com.np",
  contactPhone: "+977 9800000000",
  address: "Durbar Marg, Kathmandu 44600, Nepal",
  freeShippingThresholdPaisa: 500000,
  shippingFeePaisa: 10000,
  vatPercent: 13,
  codEnabled: true,
  stripeEnabled: false,
  announcement: "Free delivery across Nepal on orders over Rs 5,000",
  socialLinks: { facebook: "https://facebook.com", instagram: "https://instagram.com" },
};

export const STORAGE_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
};

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
