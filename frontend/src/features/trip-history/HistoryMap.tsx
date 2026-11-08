import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

import type { HistoryPoint } from "./historyApi";

import "leaflet/dist/leaflet.css";
import "./historyMap.css";

const activePointIcon = L.divIcon({
  className: "history-map-marker",
  html: "<span></span>",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

interface HistoryMapProps {
  points: HistoryPoint[];
  activeIndex: number;
}

export function HistoryMap({ points, activeIndex }: HistoryMapProps) {
  const positions = useMemo(
    () => points.map((point) => [point.latitude, point.longitude] as [number, number]),
    [points],
  );
  const activePoint = points[Math.min(activeIndex, points.length - 1)];

  return (
    <section aria-label="Mapa del recorrido" className="overflow-hidden rounded-card border border-slate-200 bg-white">
      <MapContainer
        aria-label="Recorrido del vehículo seleccionado"
        center={[4.711, -74.0721]}
        className="history-map"
        scrollWheelZoom
        zoom={11}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport positions={positions} />
        {positions.length > 1 ? (
          <Polyline pathOptions={{ color: "#a81a2b", opacity: 0.8, weight: 4 }} positions={positions} />
        ) : null}
        {activePoint ? <Marker icon={activePointIcon} position={[activePoint.latitude, activePoint.longitude]} title="Posición actual del recorrido" /> : null}
      </MapContainer>
      <p className="border-t border-slate-200 px-4 py-2 text-xs text-muted">
        {points.length} puntos válidos · Línea de recorrido y posición actual
      </p>
    </section>
  );
}

function MapViewport({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 15);
      return;
    }
    map.fitBounds(positions, { padding: [30, 30], maxZoom: 15 });
  }, [map, positions]);

  return null;
}
