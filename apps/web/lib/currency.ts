// Mirrors services/api/src/money.rs so product-page prices match the cart exactly.
export type Currency = { code: string; symbol: string; step: number; charm: number };

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", step: 1, charm: 0 },
  { code: "EUR", symbol: "€", step: 1, charm: 0 },
  { code: "GBP", symbol: "£", step: 1, charm: 0 },
  { code: "CAD", symbol: "CA$", step: 1, charm: 0 },
  { code: "AUD", symbol: "A$", step: 1, charm: 0 },
  { code: "AED", symbol: "AED ", step: 5, charm: 1 },
  { code: "KES", symbol: "KSh ", step: 100, charm: 1 },
  { code: "NGN", symbol: "₦", step: 500, charm: 0 },
  { code: "ZAR", symbol: "R", step: 10, charm: 1 },
  { code: "INR", symbol: "₹", step: 100, charm: 1 },
  { code: "JPY", symbol: "¥", step: 100, charm: 0 },
];

export const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.37, AUD: 1.52, AED: 3.67, KES: 129, NGN: 1550, ZAR: 18.2, INR: 84, JPY: 150,
};

const EUR = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ");

export function currencyForCountry(cc: string): string {
  const c = cc.toUpperCase();
  if (EUR.includes(c)) return "EUR";
  return (
    { US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", AE: "AED", KE: "KES", NG: "NGN", ZA: "ZAR", IN: "INR", JP: "JPY" } as Record<string, string>
  )[c] ?? "USD";
}

export const currency = (code: string) => CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

export function convert(usd: number, code: string, rates: Record<string, number>) {
  const cur = currency(code);
  if (cur.code === "USD") return usd;
  const raw = usd * (rates[cur.code] ?? FALLBACK_RATES[cur.code] ?? 1);
  return Math.max(Math.round(raw / cur.step) * cur.step - cur.charm, cur.step - cur.charm);
}

export function format(amount: number, code: string) {
  const cur = currency(code);
  const whole = Number.isInteger(amount);
  const n = amount.toLocaleString("en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
  return `${cur.symbol}${n}`;
}
