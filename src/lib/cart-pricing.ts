/**
 * Pure cart / checkout pricing engine.
 *
 * The exact same module is imported by the Cloud Function that creates orders,
 * so the totals shown in the browser and the totals written to Firestore are
 * produced by identical code. The server still re-reads prices from Firestore
 * and never trusts numbers posted by the browser.
 */

import { SHIPPING_METHODS, type ShippingMethodId } from "./constants";
import type { Coupon } from "./types";

export interface PricingLineInput {
  productId: string;
  name: string;
  unitPricePaisa: number;
  quantity: number;
  stock?: number;
  variantId?: string | null;
  sku?: string;
  imageUrl?: string;
}

export interface AppliedCoupon {
  code: string;
  type: Coupon["type"];
  value: number;
  minSubtotalPaisa?: number;
  maxDiscountPaisa?: number | null;
}

export interface PricingInput {
  lines: PricingLineInput[];
  shippingMethod?: ShippingMethodId | string;
  shippingFeePaisa?: number;
  freeShippingThresholdPaisa?: number;
  vatPercent?: number;
  coupon?: AppliedCoupon | null;
  settings?: {
    shippingFeePaisa?: number;
    freeShippingThresholdPaisa?: number;
    vatPercent?: number;
  };
}

export interface PricedLine extends PricingLineInput {
  lineTotalPaisa: number;
}

export interface PricingResult {
  lines: PricedLine[];
  subtotalPaisa: number;
  discountPaisa: number;
  shippingPaisa: number;
  taxPaisa: number;
  totalPaisa: number;
  itemCount: number;
  warnings: string[];
}

export const MAX_QUANTITY_PER_LINE = 20;

export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Validate a raw cart line before it enters the pricing engine. */
export function sanitizeLine(line: PricingLineInput): PricingLineInput {
  const quantity = isPositiveInt(line.quantity)
    ? Math.min(line.quantity, MAX_QUANTITY_PER_LINE)
    : 1;
  return { ...line, quantity };
}

export function calculateDiscount(coupon: AppliedCoupon | null | undefined, subtotalPaisa: number): number {
  if (!coupon || subtotalPaisa <= 0) return 0;
  if (coupon.minSubtotalPaisa && subtotalPaisa < coupon.minSubtotalPaisa) return 0;

  let discount =
    coupon.type === "percentage"
      ? Math.round((subtotalPaisa * clampPercent(coupon.value)) / 100)
      : Math.round(coupon.value);

  if (coupon.maxDiscountPaisa && coupon.maxDiscountPaisa > 0) {
    discount = Math.min(discount, coupon.maxDiscountPaisa);
  }
  // A coupon can never make an order negative or pay for shipping.
  return Math.max(0, Math.min(discount, subtotalPaisa));
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function calculateShipping(
  subtotalAfterDiscountPaisa: number,
  methodId: ShippingMethodId | string | undefined,
  overrides?: { shippingFeePaisa?: number; freeShippingThresholdPaisa?: number }
): number {
  if (subtotalAfterDiscountPaisa <= 0) return 0;
  const method = SHIPPING_METHODS.find((m) => m.id === methodId) ?? SHIPPING_METHODS[0];

  const fee = methodId === "standard" && overrides?.shippingFeePaisa !== undefined
    ? overrides.shippingFeePaisa
    : method.feePaisa;

  const freeOver = methodId === "standard" && overrides?.freeShippingThresholdPaisa !== undefined
    ? overrides.freeShippingThresholdPaisa
    : method.freeOverPaisa;

  if (freeOver !== null && freeOver > 0 && subtotalAfterDiscountPaisa >= freeOver) return 0;
  return Math.max(0, Math.round(fee));
}

export function roundPaisa(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

/**
 * Compute the full order summary. Everything is integer paisa.
 * Tax is calculated on (subtotal - discount) and shipping is not taxed.
 */
export function calculateTotals(input: PricingInput): PricingResult {
  const warnings: string[] = [];

  const lines: PricedLine[] = input.lines
    .filter((line) => line && typeof line.unitPricePaisa === "number" && line.unitPricePaisa >= 0)
    .map((raw) => {
      const line = sanitizeLine(raw);
      if (raw.quantity !== line.quantity && isPositiveInt(raw.quantity)) {
        warnings.push(`Quantity for "${line.name}" was capped at ${MAX_QUANTITY_PER_LINE}.`);
      }
      if (line.stock !== undefined && line.stock < line.quantity) {
        warnings.push(`Only ${Math.max(0, line.stock)} left of "${line.name}".`);
      }
      return { ...line, lineTotalPaisa: line.unitPricePaisa * line.quantity };
    });

  const subtotalPaisa = lines.reduce((sum, l) => sum + l.lineTotalPaisa, 0);
  const discountPaisa = calculateDiscount(input.coupon, subtotalPaisa);
  const discountedSubtotal = subtotalPaisa - discountPaisa;

  const shippingOverrides = {
    shippingFeePaisa: input.shippingFeePaisa ?? input.settings?.shippingFeePaisa,
    freeShippingThresholdPaisa:
      input.freeShippingThresholdPaisa ?? input.settings?.freeShippingThresholdPaisa,
  };
  const shippingPaisa = calculateShipping(discountedSubtotal, input.shippingMethod ?? "standard", shippingOverrides);

  const vatPercent = clampPercent(input.vatPercent ?? input.settings?.vatPercent ?? 0);
  const taxPaisa = roundPaisa((discountedSubtotal * vatPercent) / 100);

  const totalPaisa = discountedSubtotal + shippingPaisa + taxPaisa;

  return {
    lines,
    subtotalPaisa,
    discountPaisa,
    shippingPaisa,
    taxPaisa,
    totalPaisa,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    warnings,
  };
}

export interface CouponValidationContext {
  now?: Date;
  usedByUser?: number;
}

/** Validate a coupon document against the current cart. Returns an error or null. */
export function validateCoupon(
  coupon: Partial<Coupon> | null | undefined,
  subtotalPaisa: number,
  context: CouponValidationContext = {}
): string | null {
  if (!coupon) return "Coupon not found.";
  if (coupon.active === false) return "This coupon is no longer active.";

  const now = context.now ?? new Date();
  const start = toDate(coupon.startsAt);
  const end = toDate(coupon.expiresAt);
  if (start && now < start) return "This coupon is not active yet.";
  if (end && now > end) return "This coupon has expired.";

  if (coupon.usageLimit && coupon.usageLimit > 0 && (coupon.usedCount ?? 0) >= coupon.usageLimit) {
    return "This coupon has reached its usage limit.";
  }
  if (coupon.perUserLimit && coupon.perUserLimit > 0 && (context.usedByUser ?? 0) >= coupon.perUserLimit) {
    return "You have already used this coupon.";
  }
  if (coupon.minSubtotalPaisa && subtotalPaisa < coupon.minSubtotalPaisa) {
    return "Order total is below the minimum for this coupon.";
  }
  if (coupon.type !== "percentage" && coupon.type !== "fixed") return "Invalid coupon type.";
  if (typeof coupon.value !== "number" || coupon.value <= 0) return "Invalid coupon value.";
  if (coupon.type === "percentage" && coupon.value > 100) return "Invalid coupon value.";

  return null;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && "toDate" in (value as object)) {
    try {
      return (value as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof (value as { seconds?: number }).seconds === "number") {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}
