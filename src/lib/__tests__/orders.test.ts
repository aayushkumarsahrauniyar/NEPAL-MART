import { describe, expect, it } from "vitest";

import { ORDER_STATUS_TRANSITIONS } from "@/lib/constants";
import type { OrderStatus } from "@/lib/types";
import {
  assertTransition,
  canTransition,
  customerCanCancel,
  customerCanReturn,
  generateInvoiceNumber,
  generateOrderNumber,
  isTerminalStatus,
  shouldRestock,
} from "@/lib/orders";

const ALL_STATUSES = Object.keys(ORDER_STATUS_TRANSITIONS) as OrderStatus[];

/** Deterministic pseudo random generator so generated order numbers are reproducible. */
function seededRandom(seed = 1): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const fixedDate = new Date(2026, 10, 11); // 11 Nov 2026 (month is 0-based)

describe("canTransition", () => {
  it.each([
    ["pending -> confirmed", "pending", "confirmed"],
    ["pending -> cancelled", "pending", "cancelled"],
    ["confirmed -> processing", "confirmed", "processing"],
    ["processing -> shipped", "processing", "shipped"],
    ["shipped -> out_for_delivery", "shipped", "out_for_delivery"],
    ["out_for_delivery -> delivered", "out_for_delivery", "delivered"],
    ["delivered -> returned", "delivered", "returned"],
    ["delivered -> refunded", "delivered", "refunded"],
    ["returned -> refunded", "returned", "refunded"],
  ] as [string, OrderStatus, OrderStatus][])("allows %s", (_case, from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["pending -> shipped (skips steps)", "pending", "shipped"],
    ["pending -> delivered", "pending", "delivered"],
    ["confirmed -> shipped", "confirmed", "shipped"],
    ["shipped -> delivered (skips courier)", "shipped", "delivered"],
    ["delivered -> cancelled", "delivered", "cancelled"],
    ["refunded -> pending", "refunded", "pending"],
    ["cancelled -> confirmed", "cancelled", "confirmed"],
    ["returned -> delivered", "returned", "delivered"],
  ] as [string, OrderStatus, OrderStatus][])("rejects %s", (_case, from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it.each(ALL_STATUSES)("rejects a transition to the same status (%s)", (status) => {
    expect(canTransition(status, status)).toBe(false);
  });

  it("returns false for an unknown source status", () => {
    expect(canTransition("bogus" as OrderStatus, "confirmed")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("does not throw for a valid transition", () => {
    expect(() => assertTransition("pending", "confirmed")).not.toThrow();
  });

  it("throws an Error that names both statuses for an invalid transition", () => {
    expect(() => assertTransition("pending", "delivered")).toThrow(
      "Invalid order status transition: pending -> delivered"
    );
  });

  it("throws for a same-status transition", () => {
    expect(() => assertTransition("shipped", "shipped")).toThrow(Error);
  });
});

describe("isTerminalStatus", () => {
  it.each<OrderStatus>(["cancelled", "refunded"])("treats %s as terminal", (status) => {
    expect(isTerminalStatus(status)).toBe(true);
  });

  it.each<OrderStatus>([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "out_for_delivery",
    "delivered",
    "returned",
  ])("treats %s as non-terminal", (status) => {
    expect(isTerminalStatus(status)).toBe(false);
  });

  it("treats an unknown status as terminal", () => {
    expect(isTerminalStatus("unknown" as OrderStatus)).toBe(true);
  });
});

describe("shouldRestock", () => {
  it.each([
    ["confirmed -> cancelled", "confirmed", "cancelled"],
    ["processing -> cancelled", "processing", "cancelled"],
    ["shipped -> returned", "shipped", "returned"],
    ["delivered -> refunded", "delivered", "refunded"],
    ["out_for_delivery -> returned", "out_for_delivery", "returned"],
  ] as [string, OrderStatus, OrderStatus][])("restocks on %s", (_case, from, to) => {
    expect(shouldRestock(from, to)).toBe(true);
  });

  it.each([
    ["pending -> cancelled (stock not yet committed)", "pending", "cancelled"],
    ["confirmed -> processing", "confirmed", "processing"],
    ["returned -> refunded (already restocked)", "returned", "refunded"],
    ["pending -> confirmed", "pending", "confirmed"],
  ] as [string, OrderStatus, OrderStatus][])("does not restock on %s", (_case, from, to) => {
    expect(shouldRestock(from, to)).toBe(false);
  });
});

describe("generateOrderNumber", () => {
  it("builds the NM-YYYYMMDD-XXXXXX format", () => {
    const orderNumber = generateOrderNumber(fixedDate, seededRandom(42));
    expect(orderNumber).toMatch(/^NM-\d{8}-[A-HJ-NP-Z2-9]{6}$/);
  });

  it("uses the provided date, zero padded", () => {
    const january = generateOrderNumber(new Date(2026, 0, 5), seededRandom(1));
    expect(january.startsWith("NM-20260105-")).toBe(true);
  });

  it("is deterministic for a given random source", () => {
    const first = generateOrderNumber(fixedDate, seededRandom(7));
    const second = generateOrderNumber(fixedDate, seededRandom(7));
    if (first !== second) {
      throw new Error(`Expected deterministic order numbers to match: ${first} !== ${second}`);
    }
  });

  it("uses the alphabet cyclically for a constant random source", () => {
    // floor(0 * 32) selects "A"; floor(0.999999 * 32) selects "9".
    expect(generateOrderNumber(fixedDate, () => 0)).toBe("NM-20261111-AAAAAA");
  });

  it("never contains ambiguous characters (I, O, 0, 1)", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const suffix = generateOrderNumber(fixedDate, seededRandom(seed)).split("-")[2];
      expect(suffix).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(suffix).not.toMatch(/[IO01]/);
    }
  });

  it("defaults to today's date when no date is provided", () => {
    const today = new Date();
    const prefix = `NM-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(
      today.getDate()
    ).padStart(2, "0")}-`;
    expect(generateOrderNumber()).toMatch(new RegExp(`^${prefix}[A-HJ-NP-Z2-9]{6}$`));
  });

  it("uses the last character of the alphabet when random() returns ~1", () => {
    const orderNumber = generateOrderNumber(fixedDate, () => 0.999999);
    expect(orderNumber.endsWith("9")).toBe(true);
  });
});

describe("generateInvoiceNumber", () => {
  it("replaces the NM- prefix with INV-", () => {
    expect(generateInvoiceNumber("NM-20261111-8F3K2Q")).toBe("INV-20261111-8F3K2Q");
  });

  it("only strips a leading NM- prefix", () => {
    expect(generateInvoiceNumber("20261111-8F3K2Q")).toBe("INV-20261111-8F3K2Q");
  });

  it("does not strip an NM- that appears in the middle", () => {
    expect(generateInvoiceNumber("XX-NM-123")).toBe("INV-XX-NM-123");
  });

  it("handles an empty order number", () => {
    expect(generateInvoiceNumber("")).toBe("INV-");
  });
});

describe("customerCanCancel", () => {
  it.each<OrderStatus>(["pending", "confirmed"])("allows cancelling a %s order", (status) => {
    expect(customerCanCancel(status)).toBe(true);
  });

  it.each<OrderStatus>([
    "processing",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "returned",
    "refunded",
  ])("does not allow cancelling a %s order", (status) => {
    expect(customerCanCancel(status)).toBe(false);
  });
});

describe("customerCanReturn", () => {
  it("allows returning only delivered orders", () => {
    expect(customerCanReturn("delivered")).toBe(true);
  });

  it.each<OrderStatus>([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "out_for_delivery",
    "cancelled",
    "returned",
    "refunded",
  ])("does not allow returning a %s order", (status) => {
    expect(customerCanReturn(status)).toBe(false);
  });
});
