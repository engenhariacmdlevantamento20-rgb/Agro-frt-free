"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapPoint = { lat: number; lng: number; color?: string; title?: string; draggable?: boolean };

type Props = {
  points?: MapPoint[];
  line?: [number, number][] | null;
  onMapClick?: (lng: number, lat: number) => void;
  onDrag?: (idx: number, lng: number, lat: number) => void;
  onPointClick?: (idx: number) => void;
  focus?: { lat: number; lng: number } | null;
  height?: number;
};

type Tipo = "mapa" | "satelite" | "hibrido";
const TIPOS: [Tipo, string][] = [["hibrido", "Híbrido"], ["satelite", "Satélite"], ["mapa", "Mapa"]];
const KEY = "fr_map_type";

// Mapa de ruas (OpenStreetMap). Para divulgar o app, troque por um servidor próprio em NEXT_PUBLIC_MAP_TILES_URL.
const TILES = process.env.NEXT_PUBLIC_MAP_TILES_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// Imagem de satélite + camadas de estradas e nomes de lugares (Esri). Para uso comercial em escala, troque por um
// provedor com chave (MapTiler, Mapbox...) em NEXT_PUBLIC_SATELLITE_TILES_URL.
const ESRI = "https://services.arcgisonline.com/ArcGIS/rest/services";
const SAT = process.env.NEXT_PUBLIC_SATELLITE_TILES_URL || `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`;
const ROADS = `${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`;
const PLACES = `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`;
const CENTER: [number, number] = [-52, -14]; // centro do Brasil

function lerTipo(): Tipo {
  try { const v = localStorage.getItem(KEY); if (v === "mapa" || v === "satelite" || v === "hibrido") return v; } catch { /* sem armazenamento: usa o padrão */ }
  return "hibrido";
}
const visivel = (t: Tipo, camada: "osm" | "sat" | "roads" | "places") =>
  camada === "osm" ? t === "mapa" : camada === "sat" ? t !== "mapa" : t === "hibrido";

export default function MapView({ points = [], line, onMapClick, onDrag, onPointClick, focus, height = 320 }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const cb = useRef({ onMapClick, onDrag, onPointClick });
  cb.current = { onMapClick, onDrag, onPointClick };
  const fitted = useRef(false);
  const [tipo, setTipo] = useState<Tipo>("hibrido");
  const tipoRef = useRef<Tipo>("hibrido");

  useEffect(() => {
    if (!box.current) return;
    const t0 = lerTipo();
    tipoRef.current = t0; setTipo(t0);
    const vis = (c: "osm" | "sat" | "roads" | "places") => ({ visibility: visivel(t0, c) ? ("visible" as const) : ("none" as const) });
    const esri = "Imagens © Esri, Maxar, Earthstar Geographics";
    const m = new maplibregl.Map({
      container: box.current,
      style: {
        version: 8,
        sources: {
          osm: { type: "raster", tiles: [TILES], tileSize: 256, attribution: "© OpenStreetMap" },
          sat: { type: "raster", tiles: [SAT], tileSize: 256, maxzoom: 18, attribution: esri },
          roads: { type: "raster", tiles: [ROADS], tileSize: 256, maxzoom: 15 },
          places: { type: "raster", tiles: [PLACES], tileSize: 256, maxzoom: 15 },
        },
        layers: [
          { id: "osm", type: "raster", source: "osm", layout: vis("osm") },
          { id: "sat", type: "raster", source: "sat", layout: vis("sat") },
          { id: "roads", type: "raster", source: "roads", layout: vis("roads") },
          { id: "places", type: "raster", source: "places", layout: vis("places") },
        ],
      },
      center: CENTER, zoom: 4,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    m.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    m.on("click", (e) => {
      const alvo = e.originalEvent?.target as HTMLElement | null;
      if (alvo?.closest?.(".maplibregl-marker")) return; // toque num marcador não marca ponto novo
      cb.current.onMapClick?.(e.lngLat.lng, e.lngLat.lat);
    });
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  function escolher(t: Tipo) {
    setTipo(t); tipoRef.current = t;
    try { localStorage.setItem(KEY, t); } catch { /* ok */ }
    const m = map.current; if (!m) return;
    (["osm", "sat", "roads", "places"] as const).forEach((c) => { if (m.getLayer(c)) m.setLayoutProperty(c, "visibility", visivel(t, c) ? "visible" : "none"); });
  }

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((k) => k.remove());
    markers.current = points.map((p, i) => {
      const k = new maplibregl.Marker({ color: p.color ?? "#1E3B2A", draggable: !!p.draggable }).setLngLat([p.lng, p.lat]);
      if (p.title) {
        // Texto montado por nós (sem innerHTML): a primeira linha vai em negrito, as demais em linhas separadas.
        const [primeira, ...resto] = p.title.split("\n");
        const no = document.createElement("div");
        const b = document.createElement("b"); b.textContent = primeira; no.appendChild(b);
        resto.filter(Boolean).forEach((l) => { const d = document.createElement("div"); d.textContent = l; no.appendChild(d); });
        k.setPopup(new maplibregl.Popup({ offset: 24, maxWidth: "260px" }).setDOMContent(no));
      }
      if (p.draggable) k.on("dragend", () => { const ll = k.getLngLat(); cb.current.onDrag?.(i, ll.lng, ll.lat); });
      k.getElement().addEventListener("click", () => cb.current.onPointClick?.(i));
      return k.addTo(m);
    });
    if (!fitted.current && points.length) {
      fitted.current = true;
      if (points.length === 1) m.jumpTo({ center: [points[0].lng, points[0].lat], zoom: 12 });
      else {
        const b = new maplibregl.LngLatBounds();
        points.forEach((p) => b.extend([p.lng, p.lat]));
        m.fitBounds(b, { padding: 40, maxZoom: 13, duration: 0 });
      }
    }
  }, [points]);

  useEffect(() => {
    if (focus && map.current) map.current.flyTo({ center: [focus.lng, focus.lat], zoom: Math.max(map.current.getZoom(), 13), duration: 600 });
  }, [focus]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const draw = () => {
      const data = { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: line ?? [] } };
      const src = m.getSource("rota") as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(data);
      else {
        m.addSource("rota", { type: "geojson", data });
        // contorno branco para a rota aparecer bem sobre a imagem de satélite
        m.addLayer({ id: "rota-contorno", type: "line", source: "rota", paint: { "line-color": "#FFFFFF", "line-width": 9, "line-opacity": 0.9 } });
        m.addLayer({ id: "rota", type: "line", source: "rota", paint: { "line-color": "#1E6FD9", "line-width": 5 } });
      }
      if (line && line.length > 1) {
        const b = new maplibregl.LngLatBounds();
        line.forEach((c) => b.extend(c));
        m.fitBounds(b, { padding: 40, duration: 0 });
      }
    };
    if (m.isStyleLoaded()) draw(); else m.once("load", draw);
  }, [line]);

  return (
    <div style={{ position: "relative", width: "100%", height, borderRadius: 12, overflow: "hidden" }}>
      <div ref={box} style={{ width: "100%", height: "100%" }} />
      <div role="group" aria-label="Tipo de mapa" style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, zIndex: 2 }}>
        {TIPOS.map(([k, nome]) => (
          <button key={k} type="button" aria-pressed={tipo === k} onClick={() => escolher(k)}
            style={{ font: "inherit", fontSize: ".8rem", fontWeight: 700, padding: "6px 10px", minHeight: 34, borderRadius: 8, cursor: "pointer",
              border: "2px solid #1E3B2A", background: tipo === k ? "#1E3B2A" : "#fff", color: tipo === k ? "#fff" : "#1E3B2A" }}>{nome}</button>
        ))}
      </div>
    </div>
  );
}
