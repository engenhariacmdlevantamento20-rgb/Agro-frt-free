export function toNum(value: unknown): number {
  const text = String(value ?? "").trim();
  const number = Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

type ProfitInput = {
  km_empty: number; km_loaded: number; km_back: number; diesel_price: number; km_per_liter: number;
  mode: "km" | "fixed"; rate_per_km: number; rate_basis: "loaded" | "total"; fixed_price: number;
  tax_pct: number; other_pct: number; expenses: number[];
};

export function calcProfit(input: ProfitInput) {
  const total = input.km_empty + input.km_loaded + input.km_back;
  const charged = input.mode === "km" && input.rate_basis === "loaded" ? input.km_loaded : total;
  const revenue = input.mode === "fixed" ? input.fixed_price : input.rate_per_km * charged;
  const liters = input.km_per_liter > 0 ? total / input.km_per_liter : 0;
  const diesel = liters * input.diesel_price, expenses = input.expenses.reduce((sum, value) => sum + value, 0);
  const tax = revenue * input.tax_pct / 100, other = revenue * input.other_pct / 100;
  const cost = diesel + expenses + tax + other, profit = revenue - cost;
  const retained = 1 - (input.tax_pct + input.other_pct) / 100;
  const breakeven = retained > 0 ? (diesel + expenses) / retained : null;
  return {
    km_total: total, revenue, liters, diesel_cost: diesel, expenses_total: expenses, tax, other, profit,
    margin_pct: revenue > 0 ? profit / revenue * 100 : null, profit_per_km: total > 0 ? profit / total : null,
    cost_per_km: total > 0 ? cost / total : null, breakeven_price: breakeven,
    breakeven_per_km: charged > 0 && breakeven !== null ? breakeven / charged : null, missing_consumption: total > 0 && input.km_per_liter <= 0,
  };
}
