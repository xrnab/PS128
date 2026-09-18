"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  DistrictMapLayersData,
} from "@/lib/authority/metrics";
import { isValidCoordinate } from "./mapUtils";
import { formatDate } from "@/lib/utils";

export interface MapLayerVisibility {
  heatmap: boolean;
  farms: boolean;
  cases: boolean;
  vets: boolean;
  agents: boolean;
  visits: boolean;
  alerts: boolean;
}

interface SurveillanceHeatmapInternalProps {
  mapLayers: DistrictMapLayersData;
  layerVisibility: MapLayerVisibility;
  userGpsLocation?: { lat: number; lng: number } | null;
  focusCoord?: { lat: number; lng: number } | null;
  searchQuery?: string;
  onSelectEntity?: (type: string, entity: unknown) => void;
}

export default function SurveillanceHeatmapInternal({
  mapLayers,
  layerVisibility,
  userGpsLocation,
  focusCoord,
  searchQuery = "",
  onSelectEntity,
}: SurveillanceHeatmapInternalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<{
    heatmap: L.LayerGroup;
    farms: L.LayerGroup;
    cases: L.LayerGroup;
    vets: L.LayerGroup;
    agents: L.LayerGroup;
    visits: L.LayerGroup;
    alerts: L.LayerGroup;
    userGps: L.LayerGroup;
  } | null>(null);

  // 1. Initialize Map Instance and OpenStreetMap Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Find initial center from valid coordinates if available
      let initialCenter: [number, number] = [20.5937, 78.9629]; // Geographic centroid of India
      const allCoords: [number, number][] = [];

      mapLayers.farms.forEach((f) => {
        if (isValidCoordinate(f.lat, f.lng)) allCoords.push([f.lat, f.lng]);
      });
      mapLayers.cases.forEach((c) => {
        if (isValidCoordinate(c.lat, c.lng)) allCoords.push([c.lat, c.lng]);
      });

      if (allCoords.length > 0) {
        initialCenter = allCoords[0];
      }

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: allCoords.length > 0 ? 11 : 5,
        zoomControl: true,
        attributionControl: true,
      });

      const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      const osmTileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        minZoom: 3,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      });
      osmTileLayer.addTo(map);

      const layerGroups = {
        heatmap: L.layerGroup().addTo(map),
        farms: L.layerGroup().addTo(map),
        cases: L.layerGroup().addTo(map),
        vets: L.layerGroup().addTo(map),
        agents: L.layerGroup().addTo(map),
        visits: L.layerGroup().addTo(map),
        alerts: L.layerGroup().addTo(map),
        userGps: L.layerGroup().addTo(map),
      };

      layerGroupsRef.current = layerGroups;
      mapInstanceRef.current = map;

      const t1 = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 100);
      const t2 = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 300);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    const map = mapInstanceRef.current;
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Render Real Database Layers and Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const groups = layerGroupsRef.current;
    if (!map || !groups) return;

    // Clear all layer groups
    groups.heatmap.clearLayers();
    groups.farms.clearLayers();
    groups.cases.clearLayers();
    groups.vets.clearLayers();
    groups.agents.clearLayers();
    groups.visits.clearLayers();
    groups.alerts.clearLayers();
    groups.userGps.clearLayers();

    const bounds = L.latLngBounds([]);
    const q = searchQuery.toLowerCase().trim();

    // LAYER: User GPS Location Pin
    if (userGpsLocation && isValidCoordinate(userGpsLocation.lat, userGpsLocation.lng)) {
      const userMarker = L.circleMarker([userGpsLocation.lat, userGpsLocation.lng], {
        radius: 10,
        fillColor: "#2563EB",
        color: "#FFFFFF",
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
      });

      const pulseRing = L.circle([userGpsLocation.lat, userGpsLocation.lng], {
        radius: 300,
        fillColor: "#3B82F6",
        color: "#2563EB",
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.15,
      });

      userMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; font-size: 12px; padding: 4px;">
          <div style="font-weight: 700; color: #1E40AF; font-size: 13px;">📍 You Are Here</div>
          <div style="color: #64748B; font-size: 11px; margin-top: 2px;">
            Browser GPS Location: ${userGpsLocation.lat.toFixed(5)}, ${userGpsLocation.lng.toFixed(5)}
          </div>
        </div>
      `);

      groups.userGps.addLayer(pulseRing);
      groups.userGps.addLayer(userMarker);
      bounds.extend([userGpsLocation.lat, userGpsLocation.lng]);
    }

    // LAYER 1: Health-Risk Heatmap Intensity Circles
    if (layerVisibility.heatmap) {
      mapLayers.heatmapPoints.forEach((hp) => {
        if (!isValidCoordinate(hp.lat, hp.lng)) return;
        if (q && !hp.locationName.toLowerCase().includes(q)) return;

        bounds.extend([hp.lat, hp.lng]);

        const color =
          hp.weight >= 8
            ? "#DC2626"
            : hp.weight >= 5
            ? "#EA580C"
            : hp.weight >= 3
            ? "#F59E0B"
            : "#059669";

        const radius = Math.min(30, Math.max(12, hp.weight * 4));

        const heatCircle = L.circleMarker([hp.lat, hp.lng], {
          radius,
          fillColor: color,
          color: color,
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.35,
          className: "leaflet-heatmap-pulse",
        });

        heatCircle.bindTooltip(`
          <div style="font-size: 11px; font-weight: bold; color: #191F1C;">
            ${hp.locationName} • Risk Weight: ${hp.weight.toFixed(1)}
          </div>
        `);

        groups.heatmap.addLayer(heatCircle);
      });
    }

    // LAYER 2: Farms
    if (layerVisibility.farms) {
      mapLayers.farms.forEach((farm) => {
        if (!isValidCoordinate(farm.lat, farm.lng)) return;
        if (
          q &&
          !farm.name.toLowerCase().includes(q) &&
          !farm.villageName.toLowerCase().includes(q) &&
          !farm.farmerName.toLowerCase().includes(q)
        )
          return;

        bounds.extend([farm.lat, farm.lng]);

        const farmMarker = L.circleMarker([farm.lat, farm.lng], {
          radius: 7,
          fillColor: "#059669",
          color: "#FFFFFF",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        farmMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #191F1C; padding: 4px; min-width: 180px;">
            <div style="font-weight: 700; font-size: 13px; color: #065F46;">🏡 ${farm.name}</div>
            <div style="font-size: 11px; color: #78716C; margin-bottom: 6px;">
              Village: ${farm.villageName} • ${farm.blockName}
            </div>
            <div style="border-top: 1px solid #E5E0D8; padding-top: 4px; font-size: 11px;">
              <div>Farmer: <strong>${farm.farmerName}</strong></div>
              <div>Registered Animals: <strong>${farm.animalCount}</strong></div>
              <div>Active Cases: <strong style="color: ${farm.activeCaseCount > 0 ? '#DC2626' : '#059669'};">${farm.activeCaseCount}</strong></div>
            </div>
          </div>
        `);

        farmMarker.on("click", () => {
          if (onSelectEntity) onSelectEntity("FARM", farm);
        });

        groups.farms.addLayer(farmMarker);
      });
    }

    // LAYER 3: Active Cases
    if (layerVisibility.cases) {
      mapLayers.cases.forEach((c) => {
        if (!isValidCoordinate(c.lat, c.lng)) return;
        if (
          q &&
          !c.caseNumber.toLowerCase().includes(q) &&
          !c.species.toLowerCase().includes(q) &&
          !c.villageName.toLowerCase().includes(q)
        )
          return;

        bounds.extend([c.lat, c.lng]);

        const color =
          c.riskLevel === "CRITICAL"
            ? "#DC2626"
            : c.riskLevel === "HIGH"
            ? "#EA580C"
            : c.riskLevel === "ELEVATED"
            ? "#F59E0B"
            : "#0284C7";

        const caseMarker = L.circleMarker([c.lat, c.lng], {
          radius: 8,
          fillColor: color,
          color: "#FFFFFF",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.95,
        });

        caseMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #191F1C; padding: 4px; min-width: 200px;">
            <div style="font-weight: 700; font-size: 13px; color: ${color};">
              📋 Case #${c.caseNumber}
            </div>
            <div style="font-size: 11px; color: #78716C; margin-bottom: 6px;">
              ${c.species} (${c.animalTag}) • ${c.villageName}
            </div>
            <div style="margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: 700; background: ${color}20; color: ${color}; padding: 2px 6px; border-radius: 4px;">
                ${c.status} • Risk: ${c.riskLevel}
              </span>
            </div>
            <div style="border-top: 1px solid #E5E0D8; padding-top: 4px; font-size: 11px;">
              <div>Farm: <strong>${c.farmName}</strong></div>
              <div>Farmer: <strong>${c.farmerName}</strong></div>
              <div>Reported: <strong>${formatDate(c.reportedAt, true)}</strong></div>
              ${c.diagnosis ? `<div style="margin-top: 4px; color: #065F46;">Diagnosis: <strong>${c.diagnosis}</strong></div>` : ""}
            </div>
          </div>
        `);

        caseMarker.on("click", () => {
          if (onSelectEntity) onSelectEntity("CASE", c);
        });

        groups.cases.addLayer(caseMarker);
      });
    }

    // LAYER 4: Veterinarians
    if (layerVisibility.vets) {
      mapLayers.veterinarians.forEach((vet) => {
        if (!isValidCoordinate(vet.lat, vet.lng)) return;
        if (q && !vet.name.toLowerCase().includes(q) && !vet.serviceArea.toLowerCase().includes(q)) return;

        bounds.extend([vet.lat, vet.lng]);

        const vetMarker = L.circleMarker([vet.lat, vet.lng], {
          radius: 9,
          fillColor: "#7C3AED",
          color: "#FFFFFF",
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.95,
        });

        vetMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #191F1C; padding: 4px; min-width: 190px;">
            <div style="font-weight: 700; font-size: 13px; color: #6D28D9;">🩺 Dr. ${vet.name}</div>
            <div style="font-size: 11px; color: #78716C; margin-bottom: 6px;">Area: ${vet.serviceArea}</div>
            <div style="border-top: 1px solid #E5E0D8; padding-top: 4px; font-size: 11px;">
              <div>Phone: <strong>${vet.phone}</strong></div>
              <div>Active Cases Under Care: <strong>${vet.activeCasesCount}</strong></div>
              <div>Pending Reviews: <strong>${vet.pendingReviewsCount}</strong></div>
            </div>
          </div>
        `);

        groups.vets.addLayer(vetMarker);
      });
    }

    // LAYER 5: Field Agents
    if (layerVisibility.agents) {
      mapLayers.fieldAgents.forEach((agent) => {
        if (!isValidCoordinate(agent.lat, agent.lng)) return;
        if (q && !agent.name.toLowerCase().includes(q) && !agent.serviceArea.toLowerCase().includes(q)) return;

        bounds.extend([agent.lat, agent.lng]);

        const agentMarker = L.circleMarker([agent.lat, agent.lng], {
          radius: 9,
          fillColor: "#2563EB",
          color: "#FFFFFF",
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.95,
        });

        agentMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #191F1C; padding: 4px; min-width: 190px;">
            <div style="font-weight: 700; font-size: 13px; color: #1D4ED8;">🛡️ ${agent.name} (Field Agent)</div>
            <div style="font-size: 11px; color: #78716C; margin-bottom: 6px;">Area: ${agent.serviceArea}</div>
            <div style="border-top: 1px solid #E5E0D8; padding-top: 4px; font-size: 11px;">
              <div>Phone: <strong>${agent.phone}</strong></div>
              <div>Open Requests: <strong>${agent.openRequestsCount}</strong></div>
              <div>Completed Visits: <strong>${agent.completedVisitsCount}</strong></div>
            </div>
          </div>
        `);

        groups.agents.addLayer(agentMarker);
      });
    }

    // LAYER 6: Field Visits
    if (layerVisibility.visits) {
      mapLayers.fieldVisits.forEach((visit) => {
        if (!isValidCoordinate(visit.lat, visit.lng)) return;
        if (q && !visit.agentName.toLowerCase().includes(q) && !visit.farmName.toLowerCase().includes(q)) return;

        bounds.extend([visit.lat, visit.lng]);

        const visitMarker = L.circleMarker([visit.lat, visit.lng], {
          radius: 7,
          fillColor: "#0D9488",
          color: "#FFFFFF",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });

        visitMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #191F1C; padding: 4px; min-width: 190px;">
            <div style="font-weight: 700; font-size: 13px; color: #0F766E;">🚶 Field Visit (${visit.status})</div>
            <div style="font-size: 11px; color: #78716C; margin-bottom: 6px;">
              ${visit.farmName} • ${visit.villageName}
            </div>
            <div style="border-top: 1px solid #E5E0D8; padding-top: 4px; font-size: 11px;">
              <div>Agent: <strong>${visit.agentName}</strong></div>
              <div>Date: <strong>${formatDate(visit.visitDate, true)}</strong></div>
              ${visit.observations ? `<div style="margin-top: 4px;">Notes: <em>${visit.observations}</em></div>` : ""}
            </div>
          </div>
        `);

        groups.visits.addLayer(visitMarker);
      });
    }

    // LAYER 7: Outbreak Alerts
    if (layerVisibility.alerts) {
      mapLayers.alerts.forEach((alert) => {
        if (!isValidCoordinate(alert.lat, alert.lng)) return;
        if (q && !alert.diseaseName.toLowerCase().includes(q) && !alert.villageName.toLowerCase().includes(q)) return;

        bounds.extend([alert.lat, alert.lng]);

        const alertMarker = L.circleMarker([alert.lat, alert.lng], {
          radius: 12,
          fillColor: "#DC2626",
          color: "#FFFFFF",
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9,
          className: "leaflet-alert-pulse",
        });

        alertMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #191F1C; padding: 4px; min-width: 200px;">
            <div style="font-weight: 700; font-size: 13px; color: #991B1B;">🚨 ACTIVE OUTBREAK ALERT</div>
            <div style="font-size: 11px; color: #78716C; margin-bottom: 6px;">
              ${alert.villageName} (${alert.blockName})
            </div>
            <div style="border-top: 1px solid #E5E0D8; padding-top: 4px; font-size: 11px;">
              <div>Suspected Disease: <strong style="color: #DC2626;">${alert.diseaseName}</strong></div>
              <div>Cluster Case Count: <strong>${alert.caseCount}</strong></div>
              <div>Window: <strong>${formatDate(alert.windowStart, true)} – ${formatDate(alert.windowEnd, true)}</strong></div>
            </div>
          </div>
        `);

        groups.alerts.addLayer(alertMarker);
      });
    }

    // Fit map bounds to encompass all valid plotted records
    if (bounds.isValid() && !focusCoord) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [mapLayers, layerVisibility, userGpsLocation, searchQuery, focusCoord, onSelectEntity]);

  // 3. Handle explicit focus requests
  useEffect(() => {
    if (!focusCoord || !mapInstanceRef.current) return;
    if (isValidCoordinate(focusCoord.lat, focusCoord.lng)) {
      mapInstanceRef.current.flyTo([focusCoord.lat, focusCoord.lng], 13, { duration: 0.6 });
    }
  }, [focusCoord]);

  return (
    <div className="w-full h-full relative min-h-[340px] sm:min-h-[480px]">
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[340px] sm:min-h-[480px] rounded-xl sm:rounded-2xl z-0"
        style={{ height: "100%" }}
      />
    </div>
  );
}
