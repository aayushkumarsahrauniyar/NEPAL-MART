"use client";

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { MAX_CART_QUANTITY } from "@/lib/constants";
import type { CartItem } from "@/lib/types";

const CARTS = "carts";

export function cartDocRef(uid: string) {
  return doc(getDb(), CARTS, uid);
}

export async function getCart(uid: string): Promise<CartItem[]> {
  const snap = await getDoc(cartDocRef(uid));
  return snap.exists() ? ((snap.data().items as CartItem[]) ?? []) : [];
}

export function subscribeToCart(uid: string, cb: (items: CartItem[]) => void) {
  return onSnapshot(cartDocRef(uid), (snap) => {
    cb(snap.exists() ? ((snap.data().items as CartItem[]) ?? []) : []);
  });
}

export async function saveCart(uid: string, items: CartItem[]): Promise<void> {
  await setDoc(
    cartDocRef(uid),
    { userId: uid, items, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
    { merge: true }
  );
}

/** Pure cart reducer helpers — unit tested in src/lib/__tests__/cart.test.ts */
export function addItem(items: CartItem[], item: CartItem): CartItem[] {
  const key = lineKey(item);
  const existing = items.find((i) => lineKey(i) === key);
  if (existing) {
    return items.map((i) =>
      lineKey(i) === key
        ? { ...i, quantity: Math.min(MAX_CART_QUANTITY, i.quantity + item.quantity) }
        : i
    );
  }
  return [...items, { ...item, quantity: Math.min(MAX_CART_QUANTITY, Math.max(1, item.quantity)) }];
}

export function updateQuantity(items: CartItem[], item: CartItem, quantity: number): CartItem[] {
  const key = lineKey(item);
  if (quantity <= 0) return removeItem(items, item);
  return items.map((i) =>
    lineKey(i) === key ? { ...i, quantity: Math.min(MAX_CART_QUANTITY, quantity) } : i
  );
}

export function removeItem(items: CartItem[], item: CartItem): CartItem[] {
  const key = lineKey(item);
  return items.filter((i) => lineKey(i) !== key);
}

export function lineKey(item: Pick<CartItem, "productId" | "variantId">): string {
  return `${item.productId}::${item.variantId ?? ""}`;
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}
