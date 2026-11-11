"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getDb, getFunctionsClient } from "@/lib/firebase/client";
import type { Order, OrderStatus } from "@/lib/types";

const ORDERS = "orders";

export interface CheckoutPayload {
  items: { productId: string; variantId?: string | null; quantity: number }[];
  shippingAddress: Record<string, unknown>;
  billingAddress?: Record<string, unknown> | null;
  shippingMethod: string;
  couponCode?: string | null;
  paymentMethod: "cod" | "stripe";
  notes?: string;
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  totalPaisa: number;
  clientSecret?: string | null;
}

/**
 * Orders are created by a Cloud Function which re-reads prices, validates
 * coupons/stock and decrements inventory inside a transaction.
 */
export async function createOrder(payload: CheckoutPayload): Promise<CreateOrderResult> {
  const callable = httpsCallable<CheckoutPayload, CreateOrderResult>(getFunctionsClient(), "createOrder");
  const result = await callable(payload);
  return result.data;
}

export async function getMyOrders(uid: string): Promise<Order[]> {
  const snap = await getDocs(query(collection(getDb(), ORDERS), where("userId", "==", uid)));
  return snap.docs
    .map((d) => ({ ...(d.data() as object), id: d.id }) as Order)
    .sort((a, b) => b.orderNumber.localeCompare(a.orderNumber));
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(getDb(), ORDERS, orderId));
  return snap.exists() ? ({ ...(snap.data() as object), id: snap.id } as Order) : null;
}

export function subscribeToOrder(orderId: string, cb: (order: Order | null) => void) {
  return onSnapshot(doc(getDb(), ORDERS, orderId), (snap) => {
    cb(snap.exists() ? ({ ...(snap.data() as object), id: snap.id } as Order) : null);
  });
}

export async function getAllOrders(max = 200): Promise<Order[]> {
  const snap = await getDocs(query(collection(getDb(), ORDERS), orderBy("createdAt", "desc")));
  return snap.docs.slice(0, max).map((d) => ({ ...(d.data() as object), id: d.id }) as Order);
}

export async function cancelMyOrder(orderId: string): Promise<void> {
  const callable = httpsCallable<{ orderId: string }, { ok: boolean }>(getFunctionsClient(), "cancelOrder");
  await callable({ orderId });
}

export async function requestReturn(orderId: string, reason: string): Promise<void> {
  const callable = httpsCallable<{ orderId: string; reason: string }, { ok: boolean }>(
    getFunctionsClient(),
    "requestReturn"
  );
  await callable({ orderId, reason });
}

export interface UpdateStatusPayload {
  orderId: string;
  status: OrderStatus;
  trackingNumber?: string;
}

/** Admin-only; enforced server side plus rules. */
export async function adminUpdateOrderStatus(payload: UpdateStatusPayload): Promise<void> {
  const callable = httpsCallable<UpdateStatusPayload, { ok: boolean }>(getFunctionsClient(), "adminUpdateOrderStatus");
  await callable(payload);
}
