"use client";

import React, { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const DynamicLocationMiniMap = dynamic(
  () => import("./LocationMiniMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400 text-xs gap-2">
        <div className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading map...</span>
      </div>
    ),
  }
);
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  searchLocationsAction,
  reverseGeocodeLocationAction,
  resolveLocationHierarchyAction,
  GeocodedLocationResult,
  ResolvedLocationHierarchy,
  UserGpsCoordinates,
} from "@/lib/actions/geo";
import { useTranslations } from "next-intl";

export type SelectedLocationData = ResolvedLocationHierarchy;

interface LocationSearchProps {
  value?: SelectedLocationData | null;
  initialQuery?: string;
  onLocationSelect: (location: SelectedLocationData) => void;
  onClear?: () => void;
  label?: string;
  title?: string;
  required?: boolean;
  disabled?: boolean;
  showMapPreview?: boolean;
  className?: string;
}

type LocationMode = "landing" | "search" | "gps_detecting" | "gps_denied" | "gps_error";

export function LocationSearch({
  value,
  initialQuery = "",
  onLocationSelect,
  onClear,
  label = "Where is the animal/farm located?",
  title,
  required = false,
  disabled = false,
  showMapPreview = true,
  className = "",
}: LocationSearchProps) {
  const t = useTranslations("geo");
  const [internalSelectedLocation, setInternalSelectedLocation] = useState<SelectedLocationData | null>(value ?? null);
  const selectedLocation = value !== undefined ? value : internalSelectedLocation;

  const [mode, setMode] = useState<LocationMode>("landing");
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GeocodedLocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [userGps, setUserGps] = useState<UserGpsCoordinates | null>(null);
  const [isGpsOrigin, setIsGpsOrigin] = useState(false);
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Stale request counter to cancel out-of-order search responses
  const searchRequestIdRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Search execution with request-id sequencing
  const executeSearch = useCallback(
    async (searchTerm: string, gpsCoords: UserGpsCoordinates | null) => {
      const trimmed = searchTerm.trim();
      if (trimmed.length < 3) {
        setResults([]);
        setIsSearching(false);
        setHasSearched(false);
        setSearchError(null);
        return;
      }

      const currentRequestId = ++searchRequestIdRef.current;
      setIsSearching(true);
      setSearchError(null);

      try {
        const searchResults = await searchLocationsAction(trimmed, gpsCoords);

        // Discard stale responses if user continued typing
        if (currentRequestId === searchRequestIdRef.current) {
          setResults(searchResults);
          setHasSearched(true);
        }
      } catch (err: unknown) {
        if (currentRequestId === searchRequestIdRef.current) {
          setSearchError(err instanceof Error ? err.message : "Unable to search locations.");
          setResults([]);
          setHasSearched(true);
        }
      } finally {
        if (currentRequestId === searchRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 3) {
      setResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val, userGps);
    }, 350);
  };

  // Explicit user selection (never silent auto-select)
  const handleSelectResult = async (item: GeocodedLocationResult, isGps = false) => {
    setIsResolving(true);
    setSearchError(null);

    try {
      const hierarchy = await resolveLocationHierarchyAction({
        latitude: item.latitude,
        longitude: item.longitude,
        placeName: item.placeName,
        districtName: item.district,
        blockName: item.subdistrict,
      });

      const selected: SelectedLocationData = {
        ...hierarchy,
        displayName: item.displayName,
      };

      setInternalSelectedLocation(selected);
      setIsGpsOrigin(isGps);
      setResults([]);
      setQuery("");
      setHasSearched(false);
      setMode("landing");
      onLocationSelect(selected);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Failed to resolve location hierarchy.");
    } finally {
      setIsResolving(false);
    }
  };

  // Option B: Explicit "Use my current location"
  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setMode("gps_error");
      setGpsErrorMessage("Geolocation is not supported by your browser or device.");
      return;
    }

    setMode("gps_detecting");
    setSearchError(null);
    setGpsErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (process.env.NODE_ENV !== "production") {
          console.log(`GPS SUCCESS\nlatitude=${lat}\nlongitude=${lng}`);
        }

        const coords: UserGpsCoordinates = { lat, lng };
        setUserGps(coords);

        try {
          const reverseRes = await reverseGeocodeLocationAction(lat, lng);
          if (reverseRes) {
            await handleSelectResult(reverseRes, true);
          } else {
            // Even if reverse geocoding has no place name, use actual coordinates
            const directHierarchy = await resolveLocationHierarchyAction({
              latitude: lat,
              longitude: lng,
              placeName: `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            });
            const selected: SelectedLocationData = {
              ...directHierarchy,
              displayName: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            };
            setInternalSelectedLocation(selected);
            setIsGpsOrigin(true);
            setMode("landing");
            onLocationSelect(selected);
          }
        } catch (err: unknown) {
          setSearchError(err instanceof Error ? err.message : "Unable to process GPS location.");
          setMode("gps_error");
          setGpsErrorMessage("Failed to resolve current GPS location. Please search manually.");
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setMode("gps_denied");
        } else {
          setMode("gps_error");
          setGpsErrorMessage("GPS signal unavailable or timed out. Please search for your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleClearSelection = () => {
    setInternalSelectedLocation(null);
    setIsGpsOrigin(false);
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
    setGpsErrorMessage(null);
    setMode("landing");
    if (onClear) onClear();
  };

  const headingText = title || label || t("whereLocated");

  // 1. SELECTED STATE: Display chosen location card
  if (selectedLocation) {
    const hasCoordinates =
      selectedLocation.latitude !== null &&
      selectedLocation.longitude !== null &&
      !isNaN(selectedLocation.latitude) &&
      !isNaN(selectedLocation.longitude);

    return (
      <div className={`space-y-3 text-[#191F1C] ${className}`}>
        {headingText && (
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            <span>
              {headingText} {required && <span className="text-red-500">*</span>}
            </span>
          </label>
        )}

        <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/50 space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span className="font-bold text-sm text-stone-900">
                  {selectedLocation.displayName || selectedLocation.villageName || selectedLocation.districtName}
                </span>
                {selectedLocation.isUrban && (
                  <Badge className="bg-stone-200 text-stone-700 border-stone-300 text-[10px]">
                    {t("urbanTown")}
                  </Badge>
                )}
                {isGpsOrigin && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                    {t("gpsSource")}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] text-stone-600 pt-0.5">
                {selectedLocation.villageName && (
                  <span className="bg-white/80 px-2 py-0.5 rounded-md border border-[#E5E0D8]">
                    {t("village")} <strong className="text-stone-800">{selectedLocation.villageName}</strong>
                  </span>
                )}
                {selectedLocation.blockName && (
                  <span className="bg-white/80 px-2 py-0.5 rounded-md border border-[#E5E0D8]">
                    {t("block")} <strong className="text-stone-800">{selectedLocation.blockName}</strong>
                  </span>
                )}
                {selectedLocation.districtName && (
                  <span className="bg-white/80 px-2 py-0.5 rounded-md border border-[#E5E0D8]">
                    {t("district")} <strong className="text-stone-800">{selectedLocation.districtName}</strong>
                  </span>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              disabled={disabled}
              className="h-8 px-2.5 text-xs text-stone-700 border-[#D9D3C7] hover:bg-white rounded-xl shadow-xs"
            >
              Change location
            </Button>
          </div>

          {/* Map Preview ONLY if valid coordinates exist */}
          {showMapPreview && hasCoordinates && selectedLocation.latitude !== null && selectedLocation.longitude !== null && (
            <div
              title="Selected Location Map Preview"
              className="relative w-full h-36 rounded-xl overflow-hidden border border-emerald-200 bg-stone-100 shadow-2xs"
            >
              <DynamicLocationMiniMap
                latitude={selectedLocation.latitude}
                longitude={selectedLocation.longitude}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. GPS DETECTING STATE: Spinner with pulse animation
  if (mode === "gps_detecting") {
    return (
      <div className={`space-y-3 text-[#191F1C] ${className}`}>
        {headingText && (
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            <span>
              {headingText} {required && <span className="text-red-500">*</span>}
            </span>
          </label>
        )}

        <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin text-amber-700" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-900">{t("detectingLocation")}</h4>
            <p className="text-xs text-stone-600 mt-1">
              Please allow GPS access if prompted by your browser.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMode("landing")}
            className="text-xs text-stone-600 hover:text-stone-900"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // 3. GPS DENIED STATE: Non-blocking warning banner with Search button
  if (mode === "gps_denied") {
    return (
      <div className={`space-y-3 text-[#191F1C] ${className}`}>
        {headingText && (
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            <span>
              {headingText} {required && <span className="text-red-500">*</span>}
            </span>
          </label>
        )}

        <div className="p-4 rounded-2xl bg-stone-50 border border-[#E5E0D8] space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-stone-800">{t("locationNotGranted")}</p>
              <p className="text-xs text-stone-600 mt-0.5">{t("searchInstead")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setMode("search")}
              className="flex-1 min-h-[40px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl gap-2"
            >
              <Search className="h-4 w-4" />
              <span>{t("searchBtn")}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("landing")}
              className="min-h-[40px] text-xs text-stone-700 border-[#D9D3C7] rounded-xl"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. GPS ERROR STATE: Error notice with Search button
  if (mode === "gps_error") {
    return (
      <div className={`space-y-3 text-[#191F1C] ${className}`}>
        {headingText && (
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            <span>
              {headingText} {required && <span className="text-red-500">*</span>}
            </span>
          </label>
        )}

        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-900">{t("gpsUnavailable")}</p>
              <p className="text-xs text-red-700 mt-0.5">{gpsErrorMessage || "Search for a location instead."}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setMode("search")}
              className="flex-1 min-h-[40px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl gap-2"
            >
              <Search className="h-4 w-4" />
              <span>{t("searchBtn")}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("landing")}
              className="min-h-[40px] text-xs text-stone-700 border-[#D9D3C7] rounded-xl"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 5. SEARCH STATE: Input with debouncing, autocomplete, and explicit click selection
  if (mode === "search") {
    return (
      <div className={`space-y-3 text-[#191F1C] ${className}`}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-emerald-700" />
            <span>{t("searchVillageTown")}</span>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setMode("landing");
              setQuery("");
              setResults([]);
              setHasSearched(false);
            }}
            className="h-7 px-2 text-xs text-stone-600 hover:text-stone-900 gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t("back")}</span>
          </Button>
        </div>

        <div className="relative">
          <Input
            value={query}
            onChange={handleInputChange}
            placeholder={t("searchPlaceholder")}
            disabled={disabled || isResolving}
            autoFocus
            className="pl-9 pr-10 min-h-[44px] text-xs bg-white border-[#D9D3C7] rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-xs"
          />
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-stone-400 pointer-events-none" />

          {isSearching && (
            <div className="absolute right-3 top-3.5">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            </div>
          )}

          {!isSearching && query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setHasSearched(false);
              }}
              className="absolute right-3 top-3.5 text-stone-400 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {searchError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {/* Results List: Explicit tap/click required */}
        {results.length > 0 && (
          <div className="rounded-2xl border border-[#E5E0D8] bg-white divide-y divide-stone-100 shadow-md overflow-hidden max-h-64 overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectResult(item, false)}
                disabled={isResolving}
                className="w-full text-left p-3.5 hover:bg-emerald-50/60 transition-colors flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-stone-100 text-stone-600 group-hover:bg-emerald-100 group-hover:text-emerald-800 shrink-0 mt-0.5 transition-colors">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-stone-900 group-hover:text-emerald-950 truncate">
                      {item.placeName}
                    </p>
                    {item.distanceKm !== null && typeof item.distanceKm === "number" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-800 border-emerald-200 shrink-0">
                        {t("kmAway", { dist: item.distanceKm < 1 ? "<1" : item.distanceKm.toFixed(0) })}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 truncate mt-0.5">
                    {[item.subdistrict, item.district, item.state].filter(Boolean).join(", ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {hasSearched && results.length === 0 && !isSearching && query.trim().length >= 3 && (
          <div className="p-4 text-center rounded-xl bg-stone-50 border border-[#E5E0D8] text-xs text-stone-500">
            {t("noMatchingLocations", { query })}
          </div>
        )}

        {isResolving && (
          <div className="p-3 text-center rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
            <span>{t("resolvingLocation")}</span>
          </div>
        )}
      </div>
    );
  }

  // 6. LANDING STATE: Two large explicit user choices (Default)
  return (
    <div className={`space-y-3 text-[#191F1C] ${className}`}>
      {headingText && (
        <label className="text-xs font-bold text-stone-700 uppercase tracking-wide flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-emerald-700" />
          <span>
            {headingText} {required && <span className="text-red-500">*</span>}
          </span>
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Choice 1: Search for a location */}
        <button
          type="button"
          onClick={() => setMode("search")}
          disabled={disabled}
          className="flex items-center gap-3 p-4 rounded-2xl border-2 border-[#E5E0D8] bg-white hover:border-emerald-600 hover:bg-emerald-50/40 text-left transition-all group shadow-xs cursor-pointer min-h-[64px]"
        >
          <div className="h-10 w-10 rounded-xl bg-stone-100 group-hover:bg-emerald-100 text-stone-700 group-hover:text-emerald-800 flex items-center justify-center shrink-0 transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900 group-hover:text-emerald-950">
              Search for a location
            </h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Type village, town, or area name
            </p>
          </div>
        </button>

        {/* Choice 2: Use my current location */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={disabled}
          className="flex items-center gap-3 p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 hover:border-emerald-600 hover:bg-emerald-100/50 text-left transition-all group shadow-xs cursor-pointer min-h-[64px]"
        >
          <div className="h-10 w-10 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 transition-colors">
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-950">
              Use my current location
            </h4>
            <p className="text-[11px] text-emerald-800/80 mt-0.5">
              Acquire current GPS coordinates
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
