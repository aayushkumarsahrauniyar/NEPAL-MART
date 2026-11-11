/**
 * Money helpers. Every amount in Nepal Mart is an integer number of paisa
 * (1 NPR = 100 paisa). Never do arithmetic on formatted strings.
 */

export const PAISA_PER_RUPEE = 100;

/** Convert a rupee amount (e.g. 1250.5) to integer paisa. */
export function rupeesToPaisa(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new TypeError("rupeesToPaisa expects a finite number");
  return Math.round(rupees * PAISA_PER_RUPEE);
}

/** Convert integer paisa to a rupee number (may contain decimals). */
export function paisaToRupees(paisa: number): number {
  if (!Number.isFinite(paisa)) throw new TypeError("paisaToRupees expects a finite number");
  return paisa / PAISA_PER_RUPEE;
}

/**
 * Format paisa as a Nepalese Rupee string, e.g. 123456 -> "Rs 1,234.56".
 * Uses the en-IN grouping convention (lakh/crore) which Nepal also uses.
 */
export function formatNPR(paisa: number, options: { withSymbol?: boolean; decimals?: number } = {}): string {
  const { withSymbol = true, decimals = 2 } = options;
  const safe = Number.isFinite(paisa) ? paisa : 0;
  const rupees = safe / PAISA_PER_RUPEE;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rupees);
  return withSymbol ? `Rs ${formatted}` : formatted;
}

/** Percentage discount of a product, rounded to the nearest integer. */
export function discountPercent(pricePaisa: number, compareAtPaisa?: number | null): number {
  if (!compareAtPaisa || compareAtPaisa <= 0 || pricePaisa >= compareAtPaisa) return 0;
  return Math.round(((compareAtPaisa - pricePaisa) / compareAtPaisa) * 100);
}

/** Sum of line totals for a list of { unitPricePaisa, quantity }. */
export function sumLineTotals(items: { unitPricePaisa: number; quantity: number }[]): number {
  return items.reduce((total, item) => total + item.unitPricePaisa * item.quantity, 0);
}
