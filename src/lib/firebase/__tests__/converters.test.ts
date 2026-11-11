import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { describe, expect, it, vi } from "vitest";

import { toMillis, withId } from "@/lib/firebase/converters";

interface Doc {
  id: string;
  name: string;
  pricePaisa: number;
}

/** Minimal stand-in for a Firestore QueryDocumentSnapshot. */
function fakeSnapshot(id: string, data: DocumentData, options?: unknown): QueryDocumentSnapshot<DocumentData> {
  return {
    id,
    data: vi.fn(() => data),
    get: vi.fn(() => options),
  } as unknown as QueryDocumentSnapshot<DocumentData>;
}

describe("withId", () => {
  const converter = withId<Doc>();

  describe("toFirestore", () => {
    it("removes the id field from the written document", () => {
      const result = converter.toFirestore({ id: "abc", name: "Rice", pricePaisa: 25000 });
      expect(result).toEqual({ name: "Rice", pricePaisa: 25000 });
      expect(result).not.toHaveProperty("id");
    });

    it("keeps all other fields, including falsy values", () => {
      const result = converter.toFirestore({
        id: "x",
        name: "",
        pricePaisa: 0,
        active: false,
        tags: [],
      } as unknown as Doc);
      expect(result).toEqual({ name: "", pricePaisa: 0, active: false, tags: [] });
    });

    it("does not mutate the input object", () => {
      const input: Doc = { id: "abc", name: "Rice", pricePaisa: 25000 };
      converter.toFirestore(input);
      expect(input).toEqual({ id: "abc", name: "Rice", pricePaisa: 25000 });
    });

    it("returns an empty object for an object containing only an id", () => {
      expect(converter.toFirestore({ id: "only" } as Doc)).toEqual({});
    });
  });

  describe("fromFirestore", () => {
    it("attaches the document id to the data", () => {
      const snap = fakeSnapshot("doc-1", { name: "Rice", pricePaisa: 25000 });
      expect(converter.fromFirestore(snap)).toEqual({ id: "doc-1", name: "Rice", pricePaisa: 25000 });
    });

    it("lets the snapshot id win over a stored id", () => {
      const snap = fakeSnapshot("real-id", { id: "stale-id", name: "Rice", pricePaisa: 1 });
      expect(converter.fromFirestore(snap).id).toBe("real-id");
    });

    it("reads the document data through the snapshot", () => {
      const snap = fakeSnapshot("doc-2", { name: "Rice", pricePaisa: 1 });
      converter.fromFirestore(snap);
      expect(snap.data).toHaveBeenCalledTimes(1);
    });

    it("works with an empty document", () => {
      const snap = fakeSnapshot("empty", {});
      expect(converter.fromFirestore(snap)).toEqual({ id: "empty" });
    });

    it("round-trips through toFirestore without duplicating the id", () => {
      const original: Doc = { id: "rt", name: "Salt", pricePaisa: 5000 };
      const written = converter.toFirestore(original);
      const snap = fakeSnapshot("rt", written);
      expect(converter.fromFirestore(snap)).toEqual(original);
    });
  });
});

describe("toMillis", () => {
  it("returns null for missing values", () => {
    expect(toMillis(null)).toBeNull();
    expect(toMillis(undefined)).toBeNull();
    expect(toMillis("")).toBeNull();
    expect(toMillis(0)).toBeNull();
  });

  it("reads a Firestore Timestamp", () => {
    const timestamp = Timestamp.fromMillis(1_760_000_000_000);
    expect(toMillis(timestamp)).toBe(1_760_000_000_000);
  });

  it("returns numbers unchanged", () => {
    expect(toMillis(1234567890)).toBe(1234567890);
  });

  it("parses an ISO date string", () => {
    expect(toMillis("2026-11-11T00:00:00.000Z")).toBe(Date.UTC(2026, 10, 11));
  });

  it("returns null for an unparseable date string", () => {
    expect(toMillis("not a date")).toBeNull();
  });

  it("converts a plain { seconds } object", () => {
    expect(toMillis({ seconds: 1760000000 })).toBe(1_760_000_000_000);
  });

  it("resolves a { seconds: 0 } object to the Unix epoch", () => {
    expect(toMillis({ seconds: 0 })).toBe(0);
  });

  it("returns null for objects without a seconds field", () => {
    expect(toMillis({ nanoseconds: 500 })).toBeNull();
    expect(toMillis([])).toBeNull();
  });

  it("uses the seconds field for Timestamp-like objects that are not real Timestamps", () => {
    const duck = { toDate: () => new Date(0), seconds: 100, nanoseconds: 0 };
    expect(toMillis(duck)).toBe(100_000);
  });
});
