const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoibWljaGFlbC1yb2wiLCJhIjoiY21peGFzeDRuMDJjNDNmb2twaWU3YXJpbyJ9.Kqm0O9xcqzwPUoyve0yJXQ";
const DEFAULT_STYLE = "mapbox/light-v11";
const DEFAULT_MARKER_COLOR = "3b82f6";
const MAX_DIMENSION = 1280;
const MAKI_ICON_BASE = "https://raw.githubusercontent.com/mapbox/maki/main/icons";

const clampDimension = (value, fallback) => {
  const numeric = Number.isFinite(value) ? value : fallback;
  const rounded = Math.round(numeric);
  return Math.max(1, Math.min(MAX_DIMENSION, rounded));
};

export const getMakiIconUrl = (name = "") =>
  name ? `${MAKI_ICON_BASE}/${name}.svg` : "";

const buildMarkerOverlay = ({
  lat,
  lon,
  color = DEFAULT_MARKER_COLOR,
  size = "s",
  symbol = "",
  iconUrl = "",
} = {}) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const clampedSize = ["s", "m", "l"].includes(size) ? size : "s";
  const normalizedColor = (color || DEFAULT_MARKER_COLOR)
    .toString()
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 6) || DEFAULT_MARKER_COLOR;
  const latStr = lat.toFixed(6);
  const lonStr = lon.toFixed(6);

  if (iconUrl) {
    return `url-${encodeURIComponent(iconUrl)}(${lonStr},${latStr})`;
  }

  const symbolPart = symbol ? `-${symbol}` : "";
  return `pin-${clampedSize}${symbolPart}+${normalizedColor}(${lonStr},${latStr})`;
};

export const buildMapboxStaticUrl = (
  lat,
  lon,
  {
    zoom = 19,
    width = 800,
    height = 600,
    markerColor = DEFAULT_MARKER_COLOR,
    markers = [],
    centerMarker = true,
  } = {}
) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const centerLat = lat.toFixed(6);
  const centerLon = lon.toFixed(6);
  const clampedWidth = clampDimension(width, 800);
  const clampedHeight = clampDimension(height, 600);
  const overlays = [];

  if (centerMarker) {
    const overlay = buildMarkerOverlay({
      lat,
      lon,
      color: markerColor,
      size: "s",
    });
    if (overlay) overlays.push(overlay);
  }

  (markers || []).forEach((marker) => {
    const overlay = buildMarkerOverlay(marker);
    if (overlay) overlays.push(overlay);
  });

  const center = `${centerLon},${centerLat},${zoom}`;
  const overlaySegment = overlays.length ? `${overlays.join(",")}/` : "";

  return `https://api.mapbox.com/styles/v1/${DEFAULT_STYLE}/static/${overlaySegment}${center}/${clampedWidth}x${clampedHeight}?access_token=${MAPBOX_ACCESS_TOKEN}`;
};

export const getMapboxToken = () => MAPBOX_ACCESS_TOKEN;
