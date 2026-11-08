import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { LatLngBoundsExpression, LeafletMouseEvent } from "leaflet";

import type { Vehicle, VehicleStatus } from "./vehiclesApi";

import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import "./vehiclesMap.css";

const statusLabels: Record<VehicleStatus, string> = {
  moving: "En movimiento",
  stopped: "Detenido",
  no_signal: "Sin señal",
};

const icons: Record<VehicleStatus, L.DivIcon> = {
  moving: L.divIcon({ className: "vehicle-map-marker vehicle-map-marker--moving", html: "<span></span>", iconSize: [28, 36], iconAnchor: [14, 30] }),
  stopped: L.divIcon({ className: "vehicle-map-marker vehicle-map-marker--stopped", html: "<span></span>", iconSize: [28, 36], iconAnchor: [14, 30] }),
  no_signal: L.divIcon({ className: "vehicle-map-marker vehicle-map-marker--no-signal", html: "<span></span>", iconSize: [28, 36], iconAnchor: [14, 30] }),
};

const selectedIcons: Record<VehicleStatus, L.DivIcon> = {
  moving: L.divIcon({ className: "vehicle-map-marker vehicle-map-marker--moving is-selected", html: "<span></span>", iconSize: [34, 42], iconAnchor: [17, 35] }),
  stopped: L.divIcon({ className: "vehicle-map-marker vehicle-map-marker--stopped is-selected", html: "<span></span>", iconSize: [34, 42], iconAnchor: [17, 35] }),
  no_signal: L.divIcon({ className: "vehicle-map-marker vehicle-map-marker--no-signal is-selected", html: "<span></span>", iconSize: [34, 42], iconAnchor: [17, 35] }),
};

const bogotaDate = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

interface FleetMapProps {
  vehicles: Vehicle[];
  selectedVehicleId: number | null;
  onSelectVehicle: (vehicleId: number) => void;
}

export function FleetMap({ vehicles, selectedVehicleId, onSelectVehicle }: FleetMapProps) {
  const positionedVehicles = vehicles.filter(
    (vehicle) => vehicle.latitude !== null && vehicle.longitude !== null,
  );
  const bounds: LatLngBoundsExpression | null = positionedVehicles.length
    ? positionedVehicles.map((vehicle) => [vehicle.latitude!, vehicle.longitude!] as [number, number])
    : null;

  return (
    <section aria-label="Mapa de vehículos" className="overflow-hidden rounded-card border border-slate-200 bg-white">
      <MapContainer
        aria-label="Mapa de posiciones de la flota"
        className="fleet-map"
        center={[4.711, -74.0721]}
        scrollWheelZoom
        zoom={11}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          referrerPolicy="strict-origin-when-cross-origin"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport bounds={bounds} selectedVehicle={positionedVehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null} />
        <MarkerClusterGroup chunkedLoading>
          {positionedVehicles.map((vehicle) => (
            <Marker
              eventHandlers={{ click: (_event: LeafletMouseEvent) => onSelectVehicle(vehicle.id) }}
              icon={vehicle.id === selectedVehicleId ? selectedIcons[vehicle.status] : icons[vehicle.status]}
              key={vehicle.id}
              position={[vehicle.latitude!, vehicle.longitude!]}
              title={vehicle.name}
            >
              <Popup>
                <div className="grid gap-1">
                  <strong>{vehicle.name}</strong>
                  <span>{statusLabels[vehicle.status]}</span>
                  <span>{vehicle.speed_kmh === null ? "Velocidad sin dato" : `${vehicle.speed_kmh} km/h`}</span>
                  <span>{vehicle.direction ? `Rumbo ${vehicle.direction}` : "Rumbo sin dato"}</span>
                  <span>{vehicle.last_communication ? bogotaDate.format(new Date(vehicle.last_communication)) : "Sin comunicación registrada"}</span>
                  <button className="vehicle-map-popup-action" onClick={() => onSelectVehicle(vehicle.id)} type="button">Ver en la lista</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      <p className="border-t border-slate-200 px-4 py-2 text-xs text-muted">
        {positionedVehicles.length} posiciones válidas · Actualización automática cada 30 segundos
      </p>
    </section>
  );
}

function MapViewport({
  bounds,
  selectedVehicle,
}: {
  bounds: LatLngBoundsExpression | null;
  selectedVehicle: Vehicle | null;
}) {
  const map = useMap();
  const hasFittedInitialBounds = useRef(false);

  useEffect(() => {
    if (selectedVehicle?.latitude !== null && selectedVehicle?.latitude !== undefined &&
      selectedVehicle.longitude !== null && selectedVehicle.longitude !== undefined) {
      map.setView([selectedVehicle.latitude, selectedVehicle.longitude], Math.max(map.getZoom(), 14));
      return;
    }
    if (bounds && !hasFittedInitialBounds.current) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
      hasFittedInitialBounds.current = true;
    }
  }, [bounds, map, selectedVehicle]);

  return null;
}
