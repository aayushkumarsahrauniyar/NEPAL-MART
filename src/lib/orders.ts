import { ORDER_STATUS_TRANSITIONS } from "./constants";
import type { OrderStatus } from "./types";

/** Can an order move from `from` to `to`? */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return (ORDER_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order status transition: ${from} -> ${to}`);
  }
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return (ORDER_STATUS_TRANSITIONS[status] ?? []).length === 0;
}

/** Statuses in which stock has been committed and must be restored on cancel. */
export function shouldRestock(from: OrderStatus, to: OrderStatus): boolean {
  const committed: OrderStatus[] = ["confirmed", "processing", "shipped", "out_for_delivery", "delivered"];
  const released: OrderStatus[] = ["cancelled", "returned", "refunded"];
  return committed.includes(from) && released.includes(to);
}

/** Human friendly order number, e.g. NM-20261111-8F3K2Q. */
export function generateOrderNumber(date: Date = new Date(), random: () => number = Math.random): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(random() * alphabet.length)];
  }
  return `NM-${y}${m}${d}-${suffix}`;
}

export function generateInvoiceNumber(orderNumber: string): string {
  return `INV-${orderNumber.replace(/^NM-/, "")}`;
}

/** Customers may cancel only while the order has not been handed to a courier. */
export function customerCanCancel(status: OrderStatus): boolean {
  return status === "pending" || status === "confirmed";
}

export function customerCanReturn(status: OrderStatus): boolean {
  return status === "delivered";
}
