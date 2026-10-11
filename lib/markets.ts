export type Market = {
  name: string;
  ticker: string;
  price: number | null;
  source?: string | null;
  updatedAt?: string | null;
};
export const DEFAULT_MARKETS: Market[] = [
  { name: "Apple", ticker: "AAPLx", price: null },
  { name: "NVIDIA", ticker: "NVDAx", price: null },
  { name: "Tesla", ticker: "TSLAx", price: null },
  { name: "Amazon", ticker: "AMZNx", price: null },
  { name: "Microsoft", ticker: "MSFTx", price: null },
  { name: "Meta", ticker: "METAx", price: null },
  { name: "Netflix", ticker: "NFLXx", price: null },
  { name: "Coinbase", ticker: "COINx", price: null },
];
export const AVAILABLE_STOCKS = DEFAULT_MARKETS.map(({ name, ticker }) => ({
  name,
  ticker,
}));
export function formatPrice(price: number | null) {
  return price === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(price);
}
export function formatUnits(value: number | null) {
  return value === null ? "—" : value.toFixed(value >= 1 ? 4 : 6);
}
