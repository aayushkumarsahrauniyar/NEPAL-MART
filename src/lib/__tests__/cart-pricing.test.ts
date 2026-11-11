import { describe, expect, it } from "vitest";

import {
  MAX_QUANTITY_PER_LINE,
  calculateDiscount,
  calculateShipping,
  calculateTotals,
  isPositiveInt,
  roundPaisa,
  sanitizeLine,
  validateCoupon,
  type AppliedCoupon,
  type PricingLineInput,
} from "@/lib/cart-pricing";
import type { Coupon } from "@/lib/types";

const RICE: PricingLineInput = {
  productId: "p-rice",
  name: "Basmati Rice 1kg",
  unitPricePaisa: 25000,
  quantity: 2,
  stock: 10,
};

const SALT: PricingLineInput = {
  productId: "p-salt",
  name: "Himalayan Salt 500g",
  unitPricePaisa: 5000,
  quantity: 1,
  stock: 50,
};

function coupon(overrides: Partial<AppliedCoupon> = {}): AppliedCoupon {
  return { code: "SAVE10", type: "percentage", value: 10, ...overrides };
}

describe("isPositiveInt", () => {
  it.each([1, 5, 999])("returns true for %s", (value) => {
    expect(isPositiveInt(value)).toBe(true);
  });

  it.each<[string, unknown]>([
    ["zero", 0],
    ["negative", -3],
    ["decimal", 1.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["numeric string", "3"],
    ["null", null],
    ["undefined", undefined],
    ["object", {}],
    ["boolean", true],
  ])("returns false for %s", (_case, value) => {
    expect(isPositiveInt(value)).toBe(false);
  });
});

describe("sanitizeLine", () => {
  it("keeps a valid quantity unchanged", () => {
    expect(sanitizeLine({ ...RICE, quantity: 3 }).quantity).toBe(3);
  });

  it("keeps the rest of the line untouched", () => {
    const sanitized = sanitizeLine({ ...RICE, quantity: 3 });
    expect(sanitized).toEqual({ ...RICE, quantity: 3 });
  });

  it("defaults an invalid quantity to 1", () => {
    expect(sanitizeLine({ ...RICE, quantity: 0 }).quantity).toBe(1);
    expect(sanitizeLine({ ...RICE, quantity: -5 }).quantity).toBe(1);
    expect(sanitizeLine({ ...RICE, quantity: 2.5 }).quantity).toBe(1);
    expect(sanitizeLine({ ...RICE, quantity: Number.NaN }).quantity).toBe(1);
  });

  it("caps the quantity at the maximum per line", () => {
    expect(sanitizeLine({ ...RICE, quantity: 500 }).quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it("allows exactly the maximum per line", () => {
    expect(sanitizeLine({ ...RICE, quantity: MAX_QUANTITY_PER_LINE }).quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it("does not mutate the input line", () => {
    const line = { ...RICE, quantity: 500 };
    sanitizeLine(line);
    expect(line.quantity).toBe(500);
  });
});

describe("calculateDiscount", () => {
  it("returns 0 when there is no coupon", () => {
    expect(calculateDiscount(null, 10000)).toBe(0);
    expect(calculateDiscount(undefined, 10000)).toBe(0);
  });

  it("returns 0 for a non-positive subtotal", () => {
    expect(calculateDiscount(coupon(), 0)).toBe(0);
    expect(calculateDiscount(coupon(), -100)).toBe(0);
  });

  it("computes a percentage discount", () => {
    expect(calculateDiscount(coupon({ value: 10 }), 100000)).toBe(10000);
  });

  it("rounds a percentage discount to the nearest paisa", () => {
    // 12345 * 10% = 1234.5 -> 1235
    expect(calculateDiscount(coupon({ value: 10 }), 12345)).toBe(1235);
    // 10001 * 15% = 1500.15 -> 1500
    expect(calculateDiscount(coupon({ value: 15 }), 10001)).toBe(1500);
  });

  it("applies a fixed discount", () => {
    expect(calculateDiscount({ code: "FLAT", type: "fixed", value: 50000 }, 100000)).toBe(50000);
  });

  it("rounds a fractional fixed discount", () => {
    expect(calculateDiscount({ code: "FLAT", type: "fixed", value: 499.6 }, 100000)).toBe(500);
  });

  it("respects the minimum subtotal", () => {
    expect(calculateDiscount(coupon({ minSubtotalPaisa: 200000 }), 100000)).toBe(0);
    expect(calculateDiscount(coupon({ minSubtotalPaisa: 100000 }), 100000)).toBe(10000);
  });

  it("caps the discount at maxDiscountPaisa", () => {
    expect(calculateDiscount(coupon({ value: 50, maxDiscountPaisa: 20000 }), 100000)).toBe(20000);
  });

  it("ignores a null maxDiscountPaisa", () => {
    expect(calculateDiscount(coupon({ value: 50, maxDiscountPaisa: null }), 100000)).toBe(50000);
  });

  it("never discounts more than the subtotal", () => {
    expect(calculateDiscount({ code: "BIG", type: "fixed", value: 999999 }, 10000)).toBe(10000);
  });

  it("never returns a negative discount", () => {
    expect(calculateDiscount({ code: "NEG", type: "fixed", value: -5000 }, 100000)).toBe(0);
  });

  it.each([
    ["above 100", 150],
    ["negative", -10],
    ["infinite", Number.POSITIVE_INFINITY],
  ])("clamps a %s percentage so the subtotal is never exceeded", (_case, value) => {
    const discount = calculateDiscount(coupon({ value }), 100000);
    expect(discount).toBeGreaterThanOrEqual(0);
    expect(discount).toBeLessThanOrEqual(100000);
  });

  it("treats a 100% coupon as fully free (clamped to the subtotal)", () => {
    expect(calculateDiscount(coupon({ value: 100 }), 77777)).toBe(77777);
  });
});

describe("calculateShipping", () => {
  it("returns 0 when there is nothing to ship", () => {
    expect(calculateShipping(0, "standard")).toBe(0);
    expect(calculateShipping(-100, "standard")).toBe(0);
  });

  it("charges the standard fee below the free threshold", () => {
    expect(calculateShipping(499999, "standard")).toBe(10000);
  });

  it("is free at exactly the free shipping threshold", () => {
    expect(calculateShipping(500000, "standard")).toBe(0);
  });

  it("charges the express fee at any subtotal", () => {
    expect(calculateShipping(10000, "express")).toBe(25000);
    expect(calculateShipping(10000000, "express")).toBe(25000);
  });

  it("is free for store pickup", () => {
    expect(calculateShipping(1000, "pickup")).toBe(0);
  });

  it("falls back to standard for an unknown method", () => {
    expect(calculateShipping(1000, "drone")).toBe(10000);
    expect(calculateShipping(1000, undefined)).toBe(10000);
  });

  it("honours a standard shipping fee override", () => {
    expect(calculateShipping(1000, "standard", { shippingFeePaisa: 7500 })).toBe(7500);
  });

  it("honours a free shipping threshold override", () => {
    expect(calculateShipping(600000, "standard", { freeShippingThresholdPaisa: 700000 })).toBe(10000);
    expect(calculateShipping(700000, "standard", { freeShippingThresholdPaisa: 700000 })).toBe(0);
  });

  it("ignores standard overrides for express", () => {
    expect(calculateShipping(1000, "express", { shippingFeePaisa: 1 })).toBe(25000);
  });

  it("never returns a negative fee", () => {
    expect(calculateShipping(1000, "standard", { shippingFeePaisa: -500 })).toBe(0);
  });

  it("rounds fractional overrides", () => {
    expect(calculateShipping(1000, "standard", { shippingFeePaisa: 1234.6 })).toBe(1235);
  });

  it("disables free shipping when an override sets the threshold to 0", () => {
    expect(calculateShipping(1000000, "standard", { freeShippingThresholdPaisa: 0 })).toBe(10000);
  });
});

describe("roundPaisa", () => {
  it.each([
    ["already integer", 1234, 1234],
    ["rounds down below .5", 1234.4, 1234],
    ["rounds up from .5", 1234.5, 1235],
    ["negative", -1234.6, -1235],
    ["NaN", Number.NaN, 0],
    ["Infinity", Number.POSITIVE_INFINITY, 0],
  ])("%s", (_case, input, expected) => {
    expect(roundPaisa(input)).toBe(expected);
  });
});

describe("calculateTotals", () => {
  it("prices a simple cart with no tax, shipping discount or coupon", () => {
    const result = calculateTotals({ lines: [RICE, SALT], shippingMethod: "pickup" });

    expect(result.subtotalPaisa).toBe(55000);
    expect(result.discountPaisa).toBe(0);
    expect(result.shippingPaisa).toBe(0);
    expect(result.taxPaisa).toBe(0);
    expect(result.totalPaisa).toBe(55000);
    expect(result.itemCount).toBe(3);
    expect(result.warnings).toEqual([]);
  });

  it("computes line totals", () => {
    const result = calculateTotals({ lines: [RICE], shippingMethod: "pickup" });
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].lineTotalPaisa).toBe(50000);
  });

  it("returns an empty result for an empty cart", () => {
    const result = calculateTotals({ lines: [] });

    expect(result).toEqual({
      lines: [],
      subtotalPaisa: 0,
      discountPaisa: 0,
      shippingPaisa: 0,
      taxPaisa: 0,
      totalPaisa: 0,
      itemCount: 0,
      warnings: [],
    });
  });

  it("defaults to standard shipping", () => {
    const result = calculateTotals({ lines: [{ ...SALT }] });
    expect(result.shippingPaisa).toBe(10000);
    expect(result.totalPaisa).toBe(15000);
  });

  it("applies a coupon before shipping and tax", () => {
    const result = calculateTotals({
      lines: [{ ...SALT, quantity: 2 }], // 10,000 paisa
      coupon: { code: "FLAT", type: "fixed", value: 1000 },
      shippingMethod: "standard",
      vatPercent: 13,
    });

    expect(result.subtotalPaisa).toBe(10000);
    expect(result.discountPaisa).toBe(1000);
    // Tax is on (subtotal - discount) = 9,000 * 13% = 1,170
    expect(result.taxPaisa).toBe(1170);
    expect(result.shippingPaisa).toBe(10000);
    expect(result.totalPaisa).toBe(9000 + 10000 + 1170);
  });

  it("does not tax shipping", () => {
    const withShipping = calculateTotals({
      lines: [SALT],
      shippingMethod: "express",
      vatPercent: 13,
    });
    expect(withShipping.shippingPaisa).toBe(25000);
    expect(withShipping.taxPaisa).toBe(650); // 5,000 * 13%
    expect(withShipping.totalPaisa).toBe(5000 + 25000 + 650);
  });

  it("rounds tax to the nearest paisa", () => {
    const result = calculateTotals({
      lines: [{ ...SALT, unitPricePaisa: 1001 }], // 1,001 * 13% = 130.13
      shippingMethod: "pickup",
      vatPercent: 13,
    });
    expect(result.taxPaisa).toBe(130);
  });

  it("keeps free shipping when the discount barely moves the order below the threshold", () => {
    const result = calculateTotals({
      lines: [{ ...RICE, quantity: 20 }], // 500,000 -> free standard shipping
      coupon: { code: "FLAT", type: "fixed", value: 1 },
      shippingMethod: "standard",
    });
    expect(result.shippingPaisa).toBe(0);
  });

  it("charges shipping when the discount drops the order below the threshold", () => {
    const result = calculateTotals({
      lines: [{ ...RICE, quantity: 20 }], // 500,000
      coupon: { code: "PCT", type: "percentage", value: 10 }, // -50,000
      shippingMethod: "standard",
    });
    expect(result.discountPaisa).toBe(50000);
    expect(result.shippingPaisa).toBe(10000);
  });

  it("prices an order that a coupon makes completely free", () => {
    const result = calculateTotals({
      lines: [{ ...SALT, quantity: 2 }], // 10,000
      coupon: { code: "FREE", type: "fixed", value: 50000 },
      shippingMethod: "standard",
      vatPercent: 13,
    });

    expect(result.discountPaisa).toBe(10000);
    expect(result.shippingPaisa).toBe(0);
    expect(result.taxPaisa).toBe(0);
    expect(result.totalPaisa).toBe(0);
  });

  it("applies settings for shipping fee, free threshold and VAT", () => {
    const result = calculateTotals({
      lines: [{ ...SALT, quantity: 2 }],
      settings: { shippingFeePaisa: 5000, freeShippingThresholdPaisa: 1000000, vatPercent: 10 },
    });
    expect(result.shippingPaisa).toBe(5000);
    expect(result.taxPaisa).toBe(1000);
  });

  it("prefers top-level values over settings", () => {
    const result = calculateTotals({
      lines: [{ ...SALT, quantity: 2 }],
      shippingFeePaisa: 2000,
      vatPercent: 0,
      settings: { shippingFeePaisa: 9000, vatPercent: 13 },
    });
    expect(result.shippingPaisa).toBe(2000);
    expect(result.taxPaisa).toBe(0);
  });

  it("clamps an invalid VAT percentage", () => {
    const negative = calculateTotals({ lines: [SALT], shippingMethod: "pickup", vatPercent: -20 });
    const excessive = calculateTotals({ lines: [SALT], shippingMethod: "pickup", vatPercent: 250 });
    expect(negative.taxPaisa).toBe(0);
    expect(excessive.taxPaisa).toBe(5000);
  });

  it("warns and caps a quantity above the per-line maximum", () => {
    const result = calculateTotals({
      lines: [{ ...RICE, quantity: 50, stock: 100 }],
      shippingMethod: "pickup",
    });

    expect(result.lines[0].quantity).toBe(MAX_QUANTITY_PER_LINE);
    expect(result.lines[0].lineTotalPaisa).toBe(25000 * MAX_QUANTITY_PER_LINE);
    expect(result.warnings).toContain(`Quantity for "Basmati Rice 1kg" was capped at ${MAX_QUANTITY_PER_LINE}.`);
  });

  it("warns when stock is lower than the requested quantity", () => {
    const result = calculateTotals({
      lines: [{ ...RICE, quantity: 3, stock: 2 }],
      shippingMethod: "pickup",
    });
    expect(result.warnings).toContain('Only 2 left of "Basmati Rice 1kg".');
  });

  it("never reports negative stock", () => {
    const result = calculateTotals({
      lines: [{ ...RICE, quantity: 1, stock: -5 }],
      shippingMethod: "pickup",
    });
    expect(result.warnings).toContain('Only 0 left of "Basmati Rice 1kg".');
  });

  it("does not warn when stock exactly matches the quantity", () => {
    const result = calculateTotals({
      lines: [{ ...RICE, quantity: 3, stock: 3 }],
      shippingMethod: "pickup",
    });
    expect(result.warnings).toEqual([]);
  });

  it("does not warn when the normalized quantity fits the stock", () => {
    const result = calculateTotals({
      lines: [{ ...RICE, quantity: -2, stock: 1 }],
      shippingMethod: "pickup",
    });
    expect(result.lines[0].quantity).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  it("warns about stock for a normalized quantity that exceeds it", () => {
    const result = calculateTotals({
      lines: [{ ...RICE, quantity: 0, stock: 0 }],
      shippingMethod: "pickup",
    });
    expect(result.lines[0].quantity).toBe(1);
    expect(result.warnings).toEqual(['Only 0 left of "Basmati Rice 1kg".']);
  });

  it("collects one warning per offending line", () => {
    const result = calculateTotals({
      lines: [
        { ...RICE, quantity: 99, stock: 100 },
        { ...SALT, quantity: 60, stock: 50 },
      ],
      shippingMethod: "pickup",
    });
    expect(result.warnings).toHaveLength(2);
  });

  it("drops malformed lines (negative or non-numeric unit price)", () => {
    const result = calculateTotals({
      lines: [
        { productId: "bad-1", name: "Bad", unitPricePaisa: -1, quantity: 1 },
        { productId: "bad-2", name: "Bad", unitPricePaisa: "100" as unknown as number, quantity: 1 },
        { productId: "bad-3", name: "Bad", unitPricePaisa: Number.NaN, quantity: 1 },
        SALT,
      ],
      shippingMethod: "pickup",
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].productId).toBe(SALT.productId);
    expect(result.subtotalPaisa).toBe(5000);
  });

  it("drops null-ish lines without throwing", () => {
    const result = calculateTotals({
      lines: [null as unknown as PricingLineInput, SALT],
      shippingMethod: "pickup",
    });
    expect(result.lines).toHaveLength(1);
  });

  it("accepts a zero-priced (free gift) line", () => {
    const result = calculateTotals({
      lines: [{ productId: "gift", name: "Free gift", unitPricePaisa: 0, quantity: 1 }],
      shippingMethod: "pickup",
    });
    expect(result.lines).toHaveLength(1);
    expect(result.subtotalPaisa).toBe(0);
    expect(result.shippingPaisa).toBe(0);
    expect(result.totalPaisa).toBe(0);
  });

  it("keeps every money value an integer", () => {
    const result = calculateTotals({
      lines: [{ ...RICE, unitPricePaisa: 3333, quantity: 7 }],
      coupon: { code: "PCT", type: "percentage", value: 7.5 },
      shippingMethod: "standard",
      vatPercent: 13,
      settings: { shippingFeePaisa: 1000.4 },
    });

    for (const value of [
      result.subtotalPaisa,
      result.discountPaisa,
      result.shippingPaisa,
      result.taxPaisa,
      result.totalPaisa,
      ...result.lines.map((line) => line.lineTotalPaisa),
    ]) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("always satisfies subtotal - discount + shipping + tax = total", () => {
    const result = calculateTotals({
      lines: [RICE, { ...SALT, quantity: 4 }],
      coupon: coupon({ value: 12.5, maxDiscountPaisa: 7000 }),
      shippingMethod: "express",
      vatPercent: 13,
    });

    expect(result.totalPaisa).toBe(
      result.subtotalPaisa - result.discountPaisa + result.shippingPaisa + result.taxPaisa
    );
  });

  it("aggregates itemCount across quantity-capped lines", () => {
    const result = calculateTotals({
      lines: [
        { ...RICE, quantity: 40, stock: 100 },
        { ...SALT, quantity: 3 },
      ],
      shippingMethod: "pickup",
    });
    expect(result.itemCount).toBe(MAX_QUANTITY_PER_LINE + 3);
  });

  it("preserves optional line metadata (variant, sku, image)", () => {
    const line: PricingLineInput = {
      ...SALT,
      variantId: "v-1",
      sku: "NM-SALT-500",
      imageUrl: "https://example.com/salt.webp",
    };
    const result = calculateTotals({ lines: [line], shippingMethod: "pickup" });
    expect(result.lines[0]).toMatchObject({
      variantId: "v-1",
      sku: "NM-SALT-500",
      imageUrl: "https://example.com/salt.webp",
    });
  });
});

describe("validateCoupon", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  function fullCoupon(overrides: Partial<Coupon> = {}): Partial<Coupon> {
    return {
      id: "c1",
      code: "SAVE10",
      type: "percentage",
      value: 10,
      active: true,
      minSubtotalPaisa: 0,
      usageLimit: 100,
      usedCount: 0,
      perUserLimit: 1,
      startsAt: new Date("2026-01-01T00:00:00Z"),
      expiresAt: new Date("2026-12-31T23:59:59Z"),
      ...overrides,
    };
  }

  it("returns null for a valid coupon", () => {
    expect(validateCoupon(fullCoupon(), 100000, { now })).toBeNull();
  });

  it("returns an error for a missing coupon", () => {
    expect(validateCoupon(null, 100000, { now })).toBe("Coupon not found.");
    expect(validateCoupon(undefined, 100000, { now })).toBe("Coupon not found.");
  });

  it("rejects an inactive coupon", () => {
    expect(validateCoupon(fullCoupon({ active: false }), 100000, { now })).toBe(
      "This coupon is no longer active."
    );
  });

  it("rejects a coupon that has not started yet", () => {
    expect(
      validateCoupon(fullCoupon({ startsAt: new Date("2026-06-16T00:00:00Z") }), 100000, { now })
    ).toBe("This coupon is not active yet.");
  });

  it("allows a coupon on its exact start date", () => {
    expect(validateCoupon(fullCoupon({ startsAt: now }), 100000, { now })).toBeNull();
  });

  it("rejects an expired coupon", () => {
    expect(
      validateCoupon(fullCoupon({ expiresAt: new Date("2026-06-14T00:00:00Z") }), 100000, { now })
    ).toBe("This coupon has expired.");
  });

  it("allows a coupon on its exact expiry date", () => {
    expect(validateCoupon(fullCoupon({ expiresAt: now }), 100000, { now })).toBeNull();
  });

  it("rejects a coupon that reached its usage limit", () => {
    expect(
      validateCoupon(fullCoupon({ usageLimit: 10, usedCount: 10 }), 100000, { now })
    ).toBe("This coupon has reached its usage limit.");
  });

  it("allows a coupon that is one use below its usage limit", () => {
    expect(validateCoupon(fullCoupon({ usageLimit: 10, usedCount: 9 }), 100000, { now })).toBeNull();
  });

  it("treats a null usageLimit as unlimited", () => {
    expect(validateCoupon(fullCoupon({ usageLimit: null, usedCount: 5000 }), 100000, { now })).toBeNull();
  });

  it("rejects a coupon the user already used", () => {
    expect(
      validateCoupon(fullCoupon({ perUserLimit: 1 }), 100000, { now, usedByUser: 1 })
    ).toBe("You have already used this coupon.");
  });

  it("treats a null perUserLimit as unlimited", () => {
    expect(
      validateCoupon(fullCoupon({ perUserLimit: null }), 100000, { now, usedByUser: 99 })
    ).toBeNull();
  });

  it("rejects an order below the minimum subtotal", () => {
    expect(validateCoupon(fullCoupon({ minSubtotalPaisa: 200000 }), 199999, { now })).toBe(
      "Order total is below the minimum for this coupon."
    );
  });

  it("allows an order exactly at the minimum subtotal", () => {
    expect(validateCoupon(fullCoupon({ minSubtotalPaisa: 200000 }), 200000, { now })).toBeNull();
  });

  it("rejects an unknown coupon type", () => {
    expect(
      validateCoupon(fullCoupon({ type: "bogo" as Coupon["type"] }), 100000, { now })
    ).toBe("Invalid coupon type.");
  });

  it.each([
    ["zero", 0],
    ["negative", -10],
  ])("rejects a %s coupon value", (_case, value) => {
    expect(validateCoupon(fullCoupon({ value }), 100000, { now })).toBe("Invalid coupon value.");
  });

  it("rejects a non-numeric coupon value", () => {
    expect(
      validateCoupon(fullCoupon({ value: "10" as unknown as number }), 100000, { now })
    ).toBe("Invalid coupon value.");
  });

  it("rejects a percentage above 100", () => {
    expect(validateCoupon(fullCoupon({ value: 101 }), 100000, { now })).toBe("Invalid coupon value.");
  });

  it("allows a 100% percentage coupon", () => {
    expect(validateCoupon(fullCoupon({ value: 100 }), 100000, { now })).toBeNull();
  });

  it("allows a fixed coupon value above 100 paisa", () => {
    expect(validateCoupon(fullCoupon({ type: "fixed", value: 50000 }), 100000, { now })).toBeNull();
  });

  it("accepts Firestore Timestamp-like values with a toDate method", () => {
    const timestampLike = { toDate: () => new Date("2026-07-01T00:00:00Z") };
    expect(validateCoupon(fullCoupon({ startsAt: timestampLike }), 100000, { now })).toBe(
      "This coupon is not active yet."
    );
  });

  it("accepts plain { seconds } timestamps", () => {
    const seconds = Math.floor(new Date("2026-01-01T00:00:00Z").getTime() / 1000);
    expect(validateCoupon(fullCoupon({ startsAt: { seconds } }), 100000, { now })).toBeNull();
  });

  it("ignores a broken Timestamp-like value instead of throwing", () => {
    const broken = {
      toDate: () => {
        throw new Error("boom");
      },
    };
    expect(validateCoupon(fullCoupon({ startsAt: broken }), 100000, { now })).toBeNull();
  });

  it("uses the current time when no clock is provided", () => {
    const past = new Date(Date.now() - 60_000);
    expect(validateCoupon(fullCoupon({ expiresAt: past }), 100000)).toBe("This coupon has expired.");
  });

  it("checks the active flag before the date window", () => {
    expect(
      validateCoupon(
        fullCoupon({ active: false, startsAt: new Date("2030-01-01T00:00:00Z") }),
        100000,
        { now }
      )
    ).toBe("This coupon is no longer active.");
  });

  it("checks the date window before the usage limits", () => {
    expect(
      validateCoupon(
        fullCoupon({ expiresAt: new Date("2020-01-01T00:00:00Z"), usageLimit: 1, usedCount: 1 }),
        100000,
        { now }
      )
    ).toBe("This coupon has expired.");
  });

  it("checks the minimum subtotal before the coupon value", () => {
    expect(
      validateCoupon(fullCoupon({ minSubtotalPaisa: 500000, value: 0 }), 1000, { now })
    ).toBe("Order total is below the minimum for this coupon.");
  });
});
