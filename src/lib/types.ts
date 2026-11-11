/**
 * Domain types shared by the storefront, the admin dashboard and Cloud Functions.
 * All money values are stored as INTEGER PAISA (1 NPR = 100 paisa) to avoid
 * floating point rounding errors. Use src/lib/money.ts to format them.
 */

export type Role = "customer" | "admin";

export type Timestampish = unknown;

export interface BaseDoc {
  id: string;
  createdAt?: Timestampish;
  updatedAt?: Timestampish;
}

export interface UserProfile extends BaseDoc {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  photoURL?: string;
  role: Role;
  emailVerified?: boolean;
  status?: "active" | "blocked";
  ordersCount?: number;
  totalSpentPaisa?: number;
}

export interface Address {
  id?: string;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  district: string;
  province: string;
  postalCode?: string;
  country: string;
}

export interface Category extends BaseDoc {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
  order?: number;
  productCount?: number;
  active?: boolean;
}

export interface ProductImage {
  url: string;
  path?: string;
  alt?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  pricePaisa?: number;
  stock?: number;
  attributes?: Record<string, string>;
}

export interface Product extends BaseDoc {
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string;
  pricePaisa: number;
  compareAtPricePaisa?: number | null;
  categoryId: string;
  subcategoryId?: string | null;
  brand?: string;
  images: ProductImage[];
  variants?: ProductVariant[];
  stock: number;
  lowStockThreshold?: number;
  unit?: string;
  weightGrams?: number;
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
  active: boolean;
  relatedProductIds?: string[];
}

export interface CartItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface CartDoc extends BaseDoc {
  userId: string;
  items: CartItem[];
}

export interface WishlistDoc extends BaseDoc {
  userId: string;
  productIds: string[];
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded";

export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded" | "cod_pending";
export type PaymentMethod = "cod" | "stripe";

export interface OrderItem {
  productId: string;
  variantId?: string | null;
  name: string;
  sku?: string;
  imageUrl?: string;
  unitPricePaisa: number;
  quantity: number;
  lineTotalPaisa: number;
}

export interface OrderTotals {
  subtotalPaisa: number;
  discountPaisa: number;
  shippingPaisa: number;
  taxPaisa: number;
  totalPaisa: number;
}

export interface Order extends BaseDoc {
  orderNumber: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  totals: OrderTotals;
  shippingAddress: Address;
  billingAddress?: Address;
  shippingMethod: string;
  couponCode?: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId?: string | null;
  status: OrderStatus;
  trackingNumber?: string | null;
  notes?: string | null;
  statusHistory?: { status: OrderStatus; at: Timestampish; by?: string }[];
  invoiceNumber?: string;
}

export interface Coupon extends BaseDoc {
  code: string;
  type: "percentage" | "fixed";
  /** percentage: 1-100, fixed: amount in paisa */
  value: number;
  minSubtotalPaisa?: number;
  maxDiscountPaisa?: number | null;
  usageLimit?: number | null;
  usedCount?: number;
  perUserLimit?: number | null;
  startsAt?: Timestampish;
  expiresAt?: Timestampish;
  active: boolean;
}

export interface Review extends BaseDoc {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  approved: boolean;
}

export interface Banner extends BaseDoc {
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  placement: "hero" | "promo" | "strip";
  order?: number;
  active: boolean;
}

export interface SiteSettings extends BaseDoc {
  siteName: string;
  tagline?: string;
  currency: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  freeShippingThresholdPaisa: number;
  shippingFeePaisa: number;
  vatPercent: number;
  codEnabled: boolean;
  stripeEnabled: boolean;
  announcement?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
}

export interface ContactMessage extends BaseDoc {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: "new" | "read" | "resolved";
}

export interface InventoryRecord extends BaseDoc {
  productId: string;
  variantId?: string | null;
  stock: number;
  lowStockThreshold: number;
  updatedBy?: string;
}
