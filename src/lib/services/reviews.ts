"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { Review } from "@/lib/types";

const REVIEWS = "reviews";

export async function getProductReviews(productId: string, onlyApproved = true): Promise<Review[]> {
  const constraints = [where("productId", "==", productId)];
  const snap = await getDocs(query(collection(getDb(), REVIEWS), ...constraints));
  const reviews = snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as Review);
  return (onlyApproved ? reviews.filter((r) => r.approved) : reviews).sort(
    (a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
  );
}

export async function createReview(input: {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
}): Promise<string> {
  if (input.rating < 1 || input.rating > 5) throw new Error("Rating must be between 1 and 5");
  const ref = await addDoc(collection(getDb(), REVIEWS), {
    ...input,
    approved: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getAllReviews(): Promise<Review[]> {
  const snap = await getDocs(collection(getDb(), REVIEWS));
  return snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as Review);
}

export async function setReviewApproved(id: string, approved: boolean): Promise<void> {
  await updateDoc(doc(getDb(), REVIEWS, id), { approved, moderatedAt: serverTimestamp() });
}

export async function deleteReview(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), REVIEWS, id));
}

export function averageRating(reviews: { rating: number }[]): number {
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}
