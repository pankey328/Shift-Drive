"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MapPin,
  Search,
  Crosshair,
  Loader2,
  CheckCircle2,
  Navigation,
} from "lucide-react";

const MAPBOX_TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapboxPinPicker({
  initialLat = 26.9124,
  initialLng = 75.7873,
  onLocationSelect,
  addressQuery = "",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [coords, setCoords] = useState({
    lat: initialLat,
    lng: initialLng,
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState("");

  // Reverse geocode lat,lng to get address
  const reverseGeocode = useCallback(
    async (lng, lat) => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
        );
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const place = data.features[0];
          const text = place.place_name || "";
          let detectedCity = "";
          const cityContext = place.context?.find(
            (c) => c.id.startsWith("place") || c.id.startsWith("district")
          );
          if (cityContext) {
            detectedCity = cityContext.text;
          }
          setResolvedAddress(text);
          if (onLocationSelect) {
            onLocationSelect({
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lng.toFixed(6)),
              formattedAddress: text,
              city: detectedCity,
            });
          }
        } else {
          if (onLocationSelect) {
            onLocationSelect({
              latitude: Number(lat.toFixed(6)),
              longitude: Number(lng.toFixed(6)),
            });
          }
        }
      } catch (err) {
        console.error("Reverse geocoding error:", err);
      }
    },
    [onLocationSelect]
  );

  // Initialize Mapbox map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [coords.lng, coords.lat],
        zoom: 13,
      });

      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      // Custom marker element
      const el = document.createElement("div");
      el.className = "station-pin-marker";
      el.innerHTML = `
        <div style="position: relative; cursor: grab;">
          <div style="width: 38px; height: 38px; background: linear-gradient(135deg, #a855f7, #6366f1); border: 3px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 10px 20px rgba(168, 85, 247, 0.5); display: flex; align-items: center; justify-content: center;">
            <div style="width: 12px; height: 12px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker({
        element: el,
        draggable: true,
      })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);

      // Handle marker drag
      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        setCoords({ lat: lngLat.lat, lng: lngLat.lng });
        reverseGeocode(lngLat.lng, lngLat.lat);
      });

      // Handle map click
      map.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        marker.setLngLat([lng, lat]);
        setCoords({ lat, lng });
        reverseGeocode(lng, lat);
      });

      map.on("load", () => {
        if (isMounted) {
          mapRef.current = map;
          markerRef.current = marker;
          setMapLoaded(true);
        }
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map when addressQuery prop changes (if provided)
  const handleSearchAddress = async (queryToSearch) => {
    const q = queryToSearch || searchQuery;
    if (!q || !q.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          q
        )}.json?access_token=${MAPBOX_TOKEN}&country=IN&limit=5`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        setSearchResults(data.features);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Geocoding search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (feature) => {
    const [lng, lat] = feature.center;
    setCoords({ lat, lng });
    setSearchResults([]);
    setSearchQuery(feature.place_name);
    setResolvedAddress(feature.place_name);

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
      mapRef.current.flyTo({ center: [lng, lat], zoom: 15, essential: true });
    }

    let detectedCity = "";
    const cityContext = feature.context?.find(
      (c) => c.id.startsWith("place") || c.id.startsWith("district")
    );
    if (cityContext) {
      detectedCity = cityContext.text;
    }

    if (onLocationSelect) {
      onLocationSelect({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        formattedAddress: feature.place_name,
        city: detectedCity,
      });
    }
  };

  // Center on current device location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocatingUser(false);

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLngLat([longitude, latitude]);
          mapRef.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            essential: true,
          });
        }
        reverseGeocode(longitude, latitude);
      },
      (err) => {
        setLocatingUser(false);
        console.warn("Could not get current location:", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-purple-400" />
          Interactive Hub Location Pinning
        </span>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locatingUser}
          className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
        >
          {locatingUser ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Crosshair className="w-3 h-3" />
          )}
          <span>Locate My GPS</span>
        </button>
      </div>

      {/* Geocoding Search Box with auto fly-to */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearchAddress();
                }
              }}
              placeholder="Search landmark, colony or address on Mapbox..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
          </div>
          <button
            type="button"
            onClick={() => handleSearchAddress()}
            disabled={searching}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
          >
            {searching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : (
              <span>Search</span>
            )}
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-neutral-800 text-xs">
            {searchResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSearchResult(item)}
                className="w-full text-left p-2.5 hover:bg-neutral-800/70 text-neutral-300 hover:text-white flex items-start gap-2 transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-white">{item.text}</p>
                  <p className="text-[10px] text-neutral-400 line-clamp-1">
                    {item.place_name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950">
        <div
          ref={mapContainerRef}
          className="w-full h-56 rounded-2xl"
          style={{ minHeight: "220px" }}
        />

        {/* Live Coordinates Pill Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-700/60 px-2.5 py-1 rounded-lg text-[11px] text-neutral-200 flex items-center gap-1.5 shadow-lg">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-mono text-purple-300 font-bold">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 bg-neutral-900/80 backdrop-blur-sm px-2 py-0.5 rounded-md border border-neutral-800">
            Click map or drag pin
          </span>
        </div>
      </div>

      {resolvedAddress && (
        <p className="text-[10px] text-neutral-400 truncate flex items-center gap-1">
          <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
          <span>{resolvedAddress}</span>
        </p>
      )}
    </div>
  );
}
