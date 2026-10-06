"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { api, post } from "@/lib/client";

export default function Caminhoes() {
  const [list, setList] = useState<any[]>([]);
  const [novo, setNovo] = useState(false);
  const [erro, setErro] = useState("");
  const [cargoTypes, setCargoTypes] = useState<any[]>([]);
  useEffect(() => { api("/api/cargo-types").then((r) => r.ok && setCargoTypes(r.data)); }, []);
  const load = async () => { const r = await api("/api/trucks"); if (r.ok) setList(r.data); };
  useEffect(() => { load(); }, []);

  async function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    const f: any = Object.fromEntries(fd);
    f.cargo_types = fd.getAll("cargo");
    const r = await post("/api/trucks", f);
    if (!r.ok) return setErro(r.error ?? "Erro ao salvar.");
    setNovo(false); load();
  }
  return (
    <main>
      <h1>Meus caminhões</h1>
      {!novo && <button className="btn sol" onClick={() => setNovo(true)}>Cadastrar caminhão</button>}
      {novo && (
        <form onSubmit={salvar}>
          <label htmlFor="plate">Placa</label><input id="plate" name="plate" required autoCapitalize="characters" />
          <div className="linha2">
            <div><label htmlFor="brand">Marca</label><input id="brand" name="brand" /></div>
            <div><label htmlFor="model">Modelo</label><input id="model" name="model" /></div>
            <div><label htmlFor="year">Ano</label><input id="year" name="year" type="number" inputMode="numeric" /></div>
            <div><label htmlFor="type">Tipo</label><select id="type" name="type"><option value="toco">Toco</option><option value="truck">Truck</option><option value="carreta">Carreta</option><option value="bitrem">Bitrem</option><option value="graneleiro">Graneleiro</option><option value="basculante">Basculante / caçamba</option><option value="prancha">Prancha</option><option value="bau">Baú</option><option value="outro">Outro</option></select></div>
            <div><label htmlFor="cap">Capacidade (cabeças de gado)</label><input id="cap" name="capacity_heads" type="number" inputMode="numeric" /></div>
            <div><label htmlFor="tons">Capacidade (toneladas)</label><input id="tons" name="capacity_tons" type="number" step="0.1" inputMode="decimal" /></div>
            <div><label htmlFor="comp">Compartimentos</label><input id="comp" name="compartments" type="number" inputMode="numeric" /></div>
          </div>
          <label htmlFor="kml">Consumo: quantos km faz por litro de diesel (opcional)</label><input id="kml" name="km_per_liter" inputMode="decimal" placeholder="ex.: 2,5" />
          <label>Que cargas este caminhão leva?</label>
          {(cargoTypes.length ? cargoTypes : [{ code: "bovinos", name: "Bovinos" }]).map((c) => (
            <label key={c.code} className="check" style={{ margin: "8px 0" }}><input type="checkbox" name="cargo" value={c.code} defaultChecked={c.code === "bovinos"} /><span>{c.name}</span></label>
          ))}
          <label htmlFor="body_type">Carroceria</label><input id="body_type" name="body_type" placeholder="ex.: boiadeira de alumínio" />
          <label htmlFor="notes">Observações</label><textarea id="notes" name="notes" />
          {erro && <div className="aviso erro" role="alert" style={{ marginTop: 14 }}>{erro}</div>}
          <button className="btn" type="submit" style={{ marginTop: 16 }}>Salvar caminhão</button>
          <button className="btn sec" type="button" onClick={() => setNovo(false)}>Cancelar</button>
        </form>
      )}
      {!novo && list.length === 0 && <p>Nenhum caminhão cadastrado. Cadastre um para enviar propostas.</p>}
      {!novo && list.map((t) => <div key={t.id} className="item"><b>{t.plate}</b>{[t.brand, t.model, t.year].filter(Boolean).join(" ")} · {t.type} · {[t.capacity_heads && `${t.capacity_heads} cabeças`, t.capacity_tons && `${Number(t.capacity_tons)} t`, t.km_per_liter && `${Number(t.km_per_liter)} km/l`].filter(Boolean).join(" · ")}</div>)}
    </main>
  );
}
