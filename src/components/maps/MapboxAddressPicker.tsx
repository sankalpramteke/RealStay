import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  value: string;
  lat: string;
  lng: string;
  onChange: (v: { address: string; lat: string; lng: string }) => void;
  mapToken?: string; // optional override; otherwise read from localStorage
}

const debounce = (fn: (...args: any[]) => void, ms = 300) => {
  let t: number | undefined;
  return (...args: any[]) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
};

const MapboxAddressPicker: React.FC<Props> = ({ value, lat, lng, onChange, mapToken }) => {
  const accessToken = useMemo(() => mapToken || localStorage.getItem('MAPBOX_PUBLIC_TOKEN') || '', [mapToken]);
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const center = useMemo(() => {
    const lon = parseFloat(lng);
    const la = parseFloat(lat);
    if (!isNaN(lon) && !isNaN(la)) return [lon, la] as [number, number];
    return [77.2090, 28.6139] as [number, number]; // Default: New Delhi-ish
  }, [lat, lng]);

  useEffect(() => {
    if (!mapRef.current || !accessToken) return;
    if (map.current) return; // init once
    mapboxgl.accessToken = accessToken;
    map.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom: 12,
    });

    marker.current = new mapboxgl.Marker({ draggable: true })
      .setLngLat(center)
      .addTo(map.current);

    marker.current.on('dragend', () => {
      const pos = marker.current!.getLngLat();
      onChange({ address: query || value, lat: String(pos.lat), lng: String(pos.lng) });
    });

    map.current.on('click', (e) => {
      marker.current?.setLngLat(e.lngLat);
      onChange({ address: query || value, lat: String(e.lngLat.lat), lng: String(e.lngLat.lng) });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [accessToken]);

  useEffect(() => {
    if (map.current) {
      map.current.setCenter(center);
      marker.current?.setLngLat(center);
    }
  }, [center[0], center[1]]);

  const doSearch = useCallback(
    debounce(async (q: string) => {
      if (!accessToken || !q || q.length < 3) { setSuggestions([]); return; }
      try {
        const resp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?autocomplete=true&limit=5&access_token=${accessToken}`
        );
        const data = await resp.json();
        setSuggestions(data?.features || []);
        setOpen(true);
      } catch (e) {
        setSuggestions([]);
        setOpen(false);
      }
    }, 350),
    [accessToken]
  );

  useEffect(() => {
    doSearch(query);
  }, [query, doSearch]);

  const selectSuggestion = (feat: any) => {
    const [lon, la] = feat.center;
    const address = feat.place_name as string;
    onChange({ address, lat: String(la), lng: String(lon) });
    setQuery(address);
    setOpen(false);
    if (map.current) {
      map.current.flyTo({ center: [lon, la], zoom: 13 });
      marker.current?.setLngLat([lon, la]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <div className="relative">
          <Label htmlFor="address-input">Address</Label>
          <Input
            id="address-input"
            placeholder={accessToken ? 'Start typing your address' : 'Add your Mapbox public token to enable search'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-autocomplete="list"
            aria-controls="address-suggestions"
            aria-expanded={open}
          />
          {open && suggestions.length > 0 && (
            <ul
              id="address-suggestions"
              role="listbox"
              className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s.id || i}
                  role="option"
                  className="px-3 py-2 cursor-pointer hover:bg-accent"
                  onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                >
                  {s.place_name}
                </li>
              ))}
            </ul>
          )}
          {!accessToken && (
            <p className="text-xs text-muted-foreground mt-1">Enter your Mapbox public token via the secure form in chat, or store it in localStorage under MAPBOX_PUBLIC_TOKEN for testing.</p>
          )}
        </div>
      </div>
      <div>
        <Label>Latitude</Label>
        <Input
          placeholder="e.g., 28.6139"
          value={lat}
          onChange={(e) => onChange({ address: query || value, lat: e.target.value, lng })}
        />
      </div>
      <div>
        <Label>Longitude</Label>
        <Input
          placeholder="e.g., 77.2090"
          value={lng}
          onChange={(e) => onChange({ address: query || value, lat, lng: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <div ref={mapRef} className="mt-2 w-full h-64 rounded-md border" aria-label="Map preview" />
      </div>
    </div>
  );
};

export default MapboxAddressPicker;
