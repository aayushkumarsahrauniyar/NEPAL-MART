import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";

/** Generic Firestore converter that guarantees an `id` field and ISO-ish timestamps. */
export function withId<T extends { id: string }>() {
  return {
    toFirestore: (data: T): DocumentData => {
      const { id: _ignored, ...rest } = data;
      return rest as DocumentData;
    },
    fromFirestore: (snap: QueryDocumentSnapshot<DocumentData>, options?: { serverTimestamps?: "estimate" | "previous" | "none" }): T => {
      const data = snap.data(options);
      return { ...data, id: snap.id } as T;
    },
  };
}

export function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    return (value as { seconds: number }).seconds * 1000;
  }
  return null;
}


