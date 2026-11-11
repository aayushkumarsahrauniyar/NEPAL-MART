import { describe, expect, it } from "vitest";

import {
  PAISA_PER_RUPEE,
  discountPercent,
  formatNPR,
  paisaToRupees,
  rupeesToPaisa,
  sumLineTotals,
} from "@/lib/money";

describe("PAISA_PER_RUPEE", () => {
  it("is 100 (1 NPR = 100 paisa)", () => {
    expect(PAISA_PER_RUPEE).toBe(100);
  });
});

describe("rupeesToPaisa", () => {
  it.each([
    ["whole rupees", 1, 100],
    ["zero", 0, 0],
    ["decimal rupees", 1250.5, 125050],
    ["negative amount (refund)", -42.25, -4225],
    ["large amount", 100000, 10000000],
  ])("converts %s", (_case, input, expected) => {
    expect(rupeesToPaisa(input)).toBe(expected);
  });

  it("rounds to the nearest paisa to avoid floating point drift", () => {
    expect(rupeesToPaisa(0.1 + 0.2)).toBe(30);
    expect(rupeesToPaisa(19.99)).toBe(1999);
    expect(rupeesToPaisa(1.005)).toBe(101);
  });

  it("always returns an integer", () => {
    expect(Number.isInteger(rupeesToPaisa(33.333))).toBe(true);
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("throws a TypeError for %s", (_case, value) => {
    expect(() => rupeesToPaisa(value)).toThrow(TypeError);
    expect(() => rupeesToPaisa(value)).toThrow("rupeesToPaisa expects a finite number");
  });
});

describe("paisaToRupees", () => {
  it.each([
    ["whole amount", 125050, 1250.5],
    ["zero", 0, 0],
    ["single paisa", 1, 0.01],
    ["negative amount", -4225, -42.25],
  ])("converts %s", (_case, input, expected) => {
    expect(paisaToRupees(input)).toBe(expected);
  });

  it("is the inverse of rupeesToPaisa for two-decimal amounts", () => {
    expect(paisaToRupees(rupeesToPaisa(2499.99))).toBe(2499.99);
  });

  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("throws a TypeError for %s", (_case, value) => {
    expect(() => paisaToRupees(value)).toThrow(TypeError);
    expect(() => paisaToRupees(value)).toThrow("paisaToRupees expects a finite number");
  });
});

describe("formatNPR", () => {
  it("formats paisa as rupees with the Rs symbol", () => {
    expect(formatNPR(123456)).toBe("Rs 1,234.56");
  });

  it("formats zero with two decimals", () => {
    expect(formatNPR(0)).toBe("Rs 0.00");
  });

  it("uses the en-IN lakh grouping convention", () => {
    expect(formatNPR(10000000)).toBe("Rs 1,00,000.00");
  });

  it("supports omitting the symbol", () => {
    expect(formatNPR(123456, { withSymbol: false })).toBe("1,234.56");
  });

  it("supports zero decimals", () => {
    expect(formatNPR(123456, { decimals: 0 })).toBe("Rs 1,235");
  });

  it("supports a single decimal", () => {
    expect(formatNPR(123456, { decimals: 1 })).toBe("Rs 1,234.6");
  });

  it("formats negative amounts", () => {
    expect(formatNPR(-123456)).toBe("Rs -1,234.56");
  });

  it("falls back to zero for non-finite input instead of throwing", () => {
    expect(formatNPR(Number.NaN)).toBe("Rs 0.00");
    expect(formatNPR(Number.POSITIVE_INFINITY)).toBe("Rs 0.00");
  });
});

describe("discountPercent", () => {
  it("computes the percentage off the compare-at price", () => {
    expect(discountPercent(80000, 100000)).toBe(20);
  });

  it("rounds to the nearest integer", () => {
    // (100000 - 66666) / 100000 = 33.334% -> 33
    expect(discountPercent(66666, 100000)).toBe(33);
    // (100000 - 66400) / 100000 = 33.6% -> 34
    expect(discountPercent(66400, 100000)).toBe(34);
  });

  it("returns 0 when there is no compare-at price", () => {
    expect(discountPercent(80000, undefined)).toBe(0);
    expect(discountPercent(80000, null)).toBe(0);
    expect(discountPercent(80000, 0)).toBe(0);
  });

  it("returns 0 when the price is not below the compare-at price", () => {
    expect(discountPercent(100000, 100000)).toBe(0);
    expect(discountPercent(120000, 100000)).toBe(0);
  });

  it("returns 0 for a negative compare-at price", () => {
    expect(discountPercent(100, -500)).toBe(0);
  });

  it("returns 100 when the price is free", () => {
    expect(discountPercent(0, 100000)).toBe(100);
  });
});

describe("sumLineTotals", () => {
  it("sums unit price times quantity", () => {
    expect(
      sumLineTotals([
        { unitPricePaisa: 25000, quantity: 2 },
        { unitPricePaisa: 10000, quantity: 1 },
      ])
    ).toBe(60000);
  });

  it("returns 0 for an empty list", () => {
    expect(sumLineTotals([])).toBe(0);
  });

  it("ignores the order of the items", () => {
    const items = [
      { unitPricePaisa: 1, quantity: 1000 },
      { unitPricePaisa: 500, quantity: 2 },
    ];
    expect(sumLineTotals(items)).toBe(2000);
    expect(sumLineTotals([...items].reverse())).toBe(2000);
  });

  it("handles zero quantity lines", () => {
    expect(sumLineTotals([{ unitPricePaisa: 9999, quantity: 0 }])).toBe(0);
  });
});
