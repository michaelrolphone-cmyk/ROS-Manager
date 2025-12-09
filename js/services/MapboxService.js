const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoibWljaGFlbC1yb2wiLCJhIjoiY21peGFzeDRuMDJjNDNmb2twaWU3YXJpbyJ9.Kqm0O9xcqzwPUoyve0yJXQ";
const DEFAULT_STYLE = "mapbox/light-v11";
const DEFAULT_MARKER_COLOR = "3b82f6";
const MAX_DIMENSION = 1280;

const clampDimension = (value, fallback) => {
  const numeric = Number.isFinite(value) ? value : fallback;
  const rounded = Math.round(numeric);
  return Math.max(1, Math.min(MAX_DIMENSION, rounded));
};

export const buildMapboxStaticUrl = (
  lat,
  lon,
  { zoom = 22, width = 800, height = 600, markerColor = DEFAULT_MARKER_COLOR } = {}
) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const centerLat = lat.toFixed(6);
  const centerLon = lon.toFixed(6);
  const clampedWidth = clampDimension(width, 800);
  const clampedHeight = clampDimension(height, 600);
  const marker = `pin-s+${markerColor}(${centerLon},${centerLat})`;
  const center = `${centerLon},${centerLat},${zoom}`;

  return `https://api.mapbox.com/styles/v1/${DEFAULT_STYLE}/static/${marker}/${center}/${clampedWidth}x${clampedHeight}?access_token=${MAPBOX_ACCESS_TOKEN}`;
};

export const getMapboxToken = () => MAPBOX_ACCESS_TOKEN;
