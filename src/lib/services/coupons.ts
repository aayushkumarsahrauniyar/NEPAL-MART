"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { validateCoupon } from "@/lib/cart-pricing";
import type { Coupon } from "@/lib/types";

const COUPONS = "coupons";

export async function findCouponByCode(code: string): Promise<Coupon | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const snap = await getDocs(query(collection(getDb(), COUPONS), where("code", "==", normalized), limit(1)));
  const first = snap.docs[0];
  return first ? ({ ...(first.data() as object), id: first.id } as Coupon) : null;
}

export async function getCoupons(): Promise<Coupon[]> {
  const snap = await getDocs(collection(getDb(), COUPONS));
  return snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as Coupon);
}

/**
 * Client-side pre-check only — the Cloud Function re-validates every coupon
 * against the cart when the order is created.
 */
export async function previewCoupon(code: string, subtotalPaisa: number): Promise<{ coupon: Coupon | null; error: string | null }> {
  try {
    const coupon = await findCouponByCode(code);
    const error = validateCoupon(coupon, subtotalPaisa);
    return { coupon: error ? null : coupon, error };
  } catch {
    return { coupon: null, error: "Could not check this coupon right now." };
  }
}

export async function upsertCoupon(input: Partial<Coupon> & { code: string }): Promise<string> {
  const payload = { ...input, code: input.code.trim().toUpperCase(), updatedAt: serverTimestamp() };
  if (input.id) {
    await updateDoc(doc(getDb(), COUPONS, input.id), payload);
    return input.id;
  }
  const ref = await addDoc(collection(getDb(), COUPONS), { ...payload, createdAt: serverTimestamp(), usedCount: 0 });
  return ref.id;
}

export async function deleteCoupon(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), COUPONS, id));
}
