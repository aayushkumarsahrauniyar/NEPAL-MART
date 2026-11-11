"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { slugify } from "@/lib/validation";
import type { Category, Product } from "@/lib/types";

const PRODUCTS = "products";
const CATEGORIES = "categories";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "rating" | "popular";

export interface ProductQuery {
  categoryId?: string;
  subcategoryId?: string;
  search?: string;
  featured?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  trending?: boolean;
  onSale?: boolean;
  minPricePaisa?: number;
  maxPricePaisa?: number;
  inStock?: boolean;
  sort?: ProductSort;
  pageSize?: number;
}

function mapDocs<T extends { id: string }>(docs: { id: string; data: () => DocumentData }[]): T[] {
  return docs.map((d) => ({ ...(d.data() as object), id: d.id }) as T);
}

/** Client-side filtering/sorting keeps Firestore reads cheap and avoids composite index sprawl. */
export function applyProductFilters(products: Product[], opts: ProductQuery): Product[] {
  let list = [...products];
  const search = opts.search?.trim().toLowerCase();
  if (search) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search) ||
        p.brand?.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search) ||
        p.tags?.some((t) => t.toLowerCase().includes(search))
    );
  }
  if (opts.categoryId) list = list.filter((p) => p.categoryId === opts.categoryId);
  if (opts.subcategoryId) list = list.filter((p) => p.subcategoryId === opts.subcategoryId);
  if (opts.featured) list = list.filter((p) => p.isFeatured);
  if (opts.bestSeller) list = list.filter((p) => p.isBestSeller);
  if (opts.newArrival) list = list.filter((p) => p.isNewArrival);
  if (opts.trending) list = list.filter((p) => p.isTrending);
  if (opts.onSale) list = list.filter((p) => typeof p.compareAtPricePaisa === "number" && p.compareAtPricePaisa! > p.pricePaisa);
  if (typeof opts.minPricePaisa === "number") list = list.filter((p) => p.pricePaisa >= opts.minPricePaisa!);
  if (typeof opts.maxPricePaisa === "number") list = list.filter((p) => p.pricePaisa <= opts.maxPricePaisa!);
  if (opts.inStock) list = list.filter((p) => (p.stock ?? 0) > 0);

  switch (opts.sort) {
    case "price_asc":
      list.sort((a, b) => a.pricePaisa - b.pricePaisa);
      break;
    case "price_desc":
      list.sort((a, b) => b.pricePaisa - a.pricePaisa);
      break;
    case "rating":
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case "popular":
      list.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
      break;
    default:
      list.sort((a, b) => (b.createdAt?.toString() ?? "").localeCompare(a.createdAt?.toString() ?? ""));
  }
  return list;
}

export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; totalPages: number; total: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    totalPages,
    total,
  };
}

export async function getActiveProducts(): Promise<Product[]> {
  const snap = await getDocs(query(collection(getDb(), PRODUCTS), where("active", "==", true)));
  return mapDocs<Product>(snap.docs);
}

/** Admin-only read (security rules restrict drafts to admins). */
export async function getAllProducts(): Promise<Product[]> {
  const snap = await getDocs(query(collection(getDb(), PRODUCTS)));
  return mapDocs<Product>(snap.docs);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const q = query(collection(getDb(), PRODUCTS), where("slug", "==", slug), fbLimit(1));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? ({ ...(first.data() as object), id: first.id } as Product) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(getDb(), PRODUCTS, id));
  return snap.exists() ? ({ ...(snap.data() as object), id: snap.id } as Product) : null;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const results = await Promise.all(ids.slice(0, 20).map((id) => getProductById(id)));
  return results.filter((p): p is Product => !!p);
}

export async function getCategories(): Promise<Category[]> {
  const snap = await getDocs(query(collection(getDb(), CATEGORIES), orderBy("order", "asc")));
  return mapDocs<Category>(snap.docs).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const q = query(collection(getDb(), CATEGORIES), where("slug", "==", slug), fbLimit(1));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? ({ ...(first.data() as object), id: first.id } as Category) : null;
}

export function buildProductQuery(constraints: QueryConstraint[] = []) {
  return query(collection(getDb(), PRODUCTS), ...constraints);
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

export async function createProduct(input: ProductInput): Promise<string> {
  const ref = await addDoc(collection(getDb(), PRODUCTS), {
    ...input,
    slug: input.slug || slugify(input.name),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<void> {
  await updateDoc(doc(getDb(), PRODUCTS, id), {
    ...input,
    ...(input.name && !input.slug ? { slug: slugify(input.name) } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), PRODUCTS, id));
}
