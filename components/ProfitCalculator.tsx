"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { api, put, brl } from "@/lib/client";
import { calcProfit, toNum } from "@/lib/profit";

type Legs = { empty: number; loaded: number; back: number };
type Props = { legs?: Legs | null; initialFreight?: number; onUsePrice?: (valor: number) => void };
type Gasto = { name: string; value: string };

const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const km1 = (n: number) => (Math.round(n * 10) / 10).toString().replace(".", ",");
const reais = (n: number) => brl(Math.round(n * 100));
const campo: React.CSSProperties = { margin: 0 };
const lin: React.CSSProperties = { display: "block", margin: "2px 0" };

/** Calculadora de lucro do transporte: diesel, consumo, preço por km, impostos e outras despesas. */
export default function ProfitCalculator({ legs, initialFreight, onUsePrice }: Props) {
  const [kmEmpty, setKmEmpty] = useState(""); const [kmLoaded, setKmLoaded] = useState(""); const [kmBack, setKmBack] = useState("");
  const [diesel, setDiesel] = useState(""); const [kml, setKml] = useState(""); const [rate, setRate] = useState("");
  const [basis, setBasis] = useState<"total" | "loaded">("total");
  const [mode, setMode] = useState<"km" | "fixed">(initialFreight ? "fixed" : "km");
  const [fixed, setFixed] = useState(initialFreight ? String(initialFreight) : "");
  const [tax, setTax] = useState(""); const [outros, setOutros] = useState("");
  const [gastos, setGastos] = useState<Gasto[]>([{ name: "Pedágio", value: "" }]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/trucks").then((r) => r.ok && setTrucks(r.data));
    api("/api/driver/costs").then((r) => {
      const d: any = r.data; if (!r.ok || !d) return;
      const s = (v: any) => (v == null ? "" : String(v).replace(".", ","));
      setDiesel(s(d.diesel_price)); setKml(s(d.km_per_liter)); setRate(s(d.rate_per_km)); setTax(s(d.tax_pct)); setOutros(s(d.other_pct));
      if (d.rate_basis === "loaded") setBasis("loaded");
      if (Array.isArray(d.expenses) && d.expenses.length) setGastos(d.expenses.map((e: any) => ({ name: e.name, value: s(e.value) })));
    });
  }, []);
  useEffect(() => {
    if (!legs) return;
    setKmEmpty(km1(legs.empty)); setKmLoaded(km1(legs.loaded)); setKmBack(legs.back ? km1(legs.back) : "");
  }, [legs?.empty, legs?.loaded, legs?.back]); // eslint-disable-line react-hooks/exhaustive-deps

  const r = useMemo(() => calcProfit({
    km_empty: toNum(kmEmpty), km_loaded: toNum(kmLoaded), km_back: toNum(kmBack),
    diesel_price: toNum(diesel), km_per_liter: toNum(kml), mode, rate_per_km: toNum(rate), rate_basis: basis, fixed_price: toNum(fixed),
    tax_pct: toNum(tax), other_pct: toNum(outros), expenses: gastos.map((g) => toNum(g.value)),
  }), [kmEmpty, kmLoaded, kmBack, diesel, kml, mode, rate, basis, fixed, tax, outros, gastos]);

  async function salvar() {
    const res = await put("/api/driver/costs", {
      diesel_price: toNum(diesel) || "", km_per_liter: toNum(kml) || "", rate_per_km: toNum(rate) || "", tax_pct: tax === "" ? "" : toNum(tax),
      other_pct: outros === "" ? "" : toNum(outros), rate_basis: basis, expenses: gastos.filter((g) => g.name || toNum(g.value)).map((g) => ({ name: g.name, value: toNum(g.value) })),
    });
    setMsg(res.ok ? "Valores salvos. Na próxima vez já aparecem preenchidos." : res.error ?? "Erro ao salvar.");
  }
  const upd = (i: number, k: keyof Gasto, v: string) => setGastos(gastos.map((g, j) => (j === i ? { ...g, [k]: v } : g)));
  const positivo = r.profit >= 0;
  const temKm = r.km_total > 0;

  return (
    <div style={{ borderTop: "2px solid var(--linha)", marginTop: 14, paddingTop: 4 }}>
      <h2 style={{ marginTop: 14 }}>Quanto vou lucrar</h2>

      <div className="linha2">
        <label style={campo}>Km até o embarque (vazio)<input inputMode="decimal" value={kmEmpty} onChange={(e) => setKmEmpty(e.target.value)} placeholder="0" /></label>
        <label style={campo}>Km do embarque ao desembarque<input inputMode="decimal" value={kmLoaded} onChange={(e) => setKmLoaded(e.target.value)} placeholder="0" /></label>
      </div>
      <label>Km de volta, vazio (opcional)<input inputMode="decimal" value={kmBack} onChange={(e) => setKmBack(e.target.value)} placeholder="0" /></label>

      <div className="linha2">
        <label style={{ margin: "16px 0 0" }}>Diesel (R$ por litro)<input inputMode="decimal" value={diesel} onChange={(e) => setDiesel(e.target.value)} placeholder="6,29" /></label>
        <label style={{ margin: "16px 0 0" }}>Consumo (km por litro)<input inputMode="decimal" value={kml} onChange={(e) => setKml(e.target.value)} placeholder="2,5" /></label>
      </div>
      {trucks.some((t) => t.km_per_liter) && (
        <select aria-label="Usar o consumo de um caminhão cadastrado" value="" onChange={(e) => { const t = trucks.find((x) => x.id === e.target.value); if (t) setKml(String(Number(t.km_per_liter)).replace(".", ",")); }} style={{ marginTop: 8 }}>
          <option value="">Usar o consumo de um caminhão cadastrado</option>
          {trucks.filter((t) => t.km_per_liter).map((t) => <option key={t.id} value={t.id}>{t.plate} — {Number(t.km_per_liter)} km/l</option>)}
        </select>
      )}

      <div className="papeis" style={{ marginTop: 16 }}>
        <button type="button" className="papel" aria-pressed={mode === "km"} onClick={() => setMode("km")}>Cobro por km</button>
        <button type="button" className="papel" aria-pressed={mode === "fixed"} onClick={() => setMode("fixed")}>Valor fechado</button>
      </div>
      {mode === "km" ? (
        <div className="linha2">
          <label>Valor que cobro por km (R$)<input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="5,00" /></label>
          <label>Cobrar sobre<select value={basis} onChange={(e) => setBasis(e.target.value as any)}><option value="total">Todos os km (com o vazio)</option><option value="loaded">Só os km carregado</option></select></label>
        </div>
      ) : (
        <label>Valor do frete (R$)<input inputMode="decimal" value={fixed} onChange={(e) => setFixed(e.target.value)} placeholder="2.500,00" /></label>
      )}

      <div className="linha2">
        <label>Impostos (% do frete)<input inputMode="decimal" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="ex.: 6" /></label>
        <label>Outros (% do frete)<input inputMode="decimal" value={outros} onChange={(e) => setOutros(e.target.value)} placeholder="ex.: 2 (comissão, seguro)" /></label>
      </div>

      <label>Outras despesas (R$)</label>
      {gastos.map((g, i) => (
        <div key={i} className="linha2" style={{ marginBottom: 8 }}>
          <input aria-label="Nome da despesa" placeholder="ex.: Pedágio, ajudante, alimentação" value={g.name} onChange={(e) => upd(i, "name", e.target.value)} />
          <input aria-label="Valor da despesa em reais" inputMode="decimal" placeholder="0,00" value={g.value} onChange={(e) => upd(i, "value", e.target.value)} />
        </div>
      ))}
      <button type="button" className="btn sec peq" onClick={() => setGastos([...gastos, { name: "", value: "" }])}>+ Outra despesa</button>
      {gastos.length > 1 && <button type="button" className="btn sec peq" onClick={() => setGastos(gastos.slice(0, -1))}>Remover última</button>}

      <div className={`lucro ${positivo ? "ok" : "neg"}`} aria-live="polite">
        <small>{positivo ? "Lucro do transporte" : "Prejuízo do transporte"}</small>
        <b>{reais(r.profit)}</b>
        {r.margin_pct != null && <small>{fmt(r.margin_pct)}% do frete{r.profit_per_km != null ? ` · ${reais(r.profit_per_km)} por km rodado` : ""}</small>}
      </div>
      {r.missing_consumption && <div className="aviso">Informe quantos km o caminhão faz por litro para o diesel entrar na conta.</div>}
      <div className="resumo"><div><b>{fmt(r.km_total)} km</b>rodados</div><div><b>{fmt(r.liters)} L</b>de diesel</div><div><b>{reais(r.revenue)}</b>frete</div></div>
      <div className="item" style={{ marginBottom: 0 }}>
        <span className="pequeno" style={lin}>Frete: {reais(r.revenue)}</span>
        <span className="pequeno" style={lin}>− Impostos ({fmt(toNum(tax))}%): {reais(r.tax)}</span>
        <span className="pequeno" style={lin}>− Outros ({fmt(toNum(outros))}%): {reais(r.other)}</span>
        <span className="pequeno" style={lin}>− Diesel: {reais(r.diesel_cost)}</span>
        <span className="pequeno" style={lin}>− Outras despesas: {reais(r.expenses_total)}</span>
        <b style={{ marginTop: 6 }}>= {positivo ? "Lucro" : "Prejuízo"}: {reais(r.profit)}</b>
      </div>
      {temKm && r.breakeven_price != null && (
        <p className="pequeno" style={{ marginTop: 10 }}>Para não ficar no prejuízo, o frete precisa ser de pelo menos <b>{reais(r.breakeven_price)}</b>{r.breakeven_per_km != null ? ` (${reais(r.breakeven_per_km)} por km ${basis === "loaded" && mode === "km" ? "carregado" : "rodado"})` : ""}. O custo por km rodado é de {r.cost_per_km != null ? reais(r.cost_per_km) : "—"}.</p>
      )}
      <p className="pequeno">Conta de apoio: confira os valores com a sua realidade (pneus, manutenção e depreciação não entram a menos que você some em outras despesas).</p>
      {onUsePrice && mode === "km" && r.revenue > 0 && <button type="button" className="btn sol peq" onClick={() => onUsePrice(Math.round(r.revenue * 100) / 100)}>Usar {reais(r.revenue)} na minha proposta</button>}
      <button type="button" className="btn sec peq" onClick={salvar}>Salvar meus valores</button>
      {msg && <p className="pequeno" role="status">{msg}</p>}
    </div>
  );
}
