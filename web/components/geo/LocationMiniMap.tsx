"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationMiniMapProps {
  latitude: number;
  longitude: number;
  className?: string;
}

export default function LocationMiniMap({
  latitude,
  longitude,
  className = "",
}: LocationMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // If map already exists, update center
    if (mapRef.current) {
      mapRef.current.setView([latitude, longitude], 15);
      return;
    }

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Custom pulsing pin marker
    const customIcon = L.divIcon({
      className: "custom-map-pin",
      html: `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <span style="position: absolute; width: 22px; height: 22px; background: rgba(5, 150, 105, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
          <span style="position: relative; width: 12px; height: 12px; background: #047857; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.35);"></span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    L.marker([latitude, longitude], { icon: customIcon }).addTo(map);

    mapRef.current = map;

    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timeout);
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-stone-600 font-medium border border-stone-200 shadow-2xs z-[1000] pointer-events-none">
        OpenStreetMap
      </div>
    </div>
  );
}
