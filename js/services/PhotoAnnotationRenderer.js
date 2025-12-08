const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatPoint = (x = 0, y = 0) => `${(x * 100).toFixed(3)},${(y * 100).toFixed(3)}`;

const buildArrow = (annotation) => {
  const x1 = annotation.x1 ?? 0;
  const y1 = annotation.y1 ?? 0;
  const x2 = annotation.x2 ?? 0;
  const y2 = annotation.y2 ?? 0;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const size = 2.6;
  const normX = dx / length;
  const normY = dy / length;
  const baseX = x2 - normX * (size / 100);
  const baseY = y2 - normY * (size / 100);
  const perpX = -normY;
  const perpY = normX;

  const tip = formatPoint(x2, y2);
  const left = formatPoint(
    baseX + perpX * (size / 100),
    baseY + perpY * (size / 100)
  );
  const right = formatPoint(
    baseX - perpX * (size / 100),
    baseY - perpY * (size / 100)
  );

  return `
    <g class="annotation-arrow">
      <line x1="${(x1 * 100).toFixed(3)}" y1="${(y1 * 100).toFixed(3)}" x2="${(x2 * 100).toFixed(3)}" y2="${(y2 * 100).toFixed(3)}" />
      <polygon points="${tip} ${left} ${right}" />
    </g>`;
};

const buildCircle = (annotation) =>
  `<circle cx="${(annotation.x * 100).toFixed(3)}" cy="${(annotation.y * 100).toFixed(3)}" r="${
    (annotation.radius * 100).toFixed(3)
  }" />`;

const buildText = (annotation) =>
  `<text x="${(annotation.x * 100).toFixed(3)}" y="${(annotation.y * 100).toFixed(3)}" dy="-2" font-size="7" font-weight="600">${escapeHtml(
    annotation.text || ""
  )}</text>`;

export const buildAnnotationSvg = (annotations = []) => {
  if (!annotations?.length) return "";

  const shapes = annotations
    .map((ann) => {
      if (ann.type === "arrow") return buildArrow(ann);
      if (ann.type === "circle") return buildCircle(ann);
      if (ann.type === "text") return buildText(ann);
      return "";
    })
    .join("");

  if (!shapes) return "";

  return `<svg class="annotation-overlay" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${shapes}</svg>`;
};

export const buildAnnotatedPhotoHtml = ({
  photo = null,
  annotations = [],
  metadata = null,
  maxWidth = "100%",
} = {}) => {
  if (!photo) return "";

  const overlay = buildAnnotationSvg(annotations);
  const metadataParts = [];
  if (metadata?.capturedAt)
    metadataParts.push(`Captured ${new Date(metadata.capturedAt).toLocaleString()}`);
  if (metadata?.trs) metadataParts.push(metadata.trs);
  if (metadata?.pointLabel) metadataParts.push(`Point: ${metadata.pointLabel}`);
  const metadataLine = metadataParts.join(" · ");

  return `<div class="annotated-photo" style="max-width:${escapeHtml(maxWidth)};">
    <img src="${photo}" alt="Evidence photo" loading="lazy" />
    ${overlay}
    ${
      metadataLine
        ? `<div class="annotation-meta">${escapeHtml(metadataLine)}</div>`
        : ""
    }
  </div>`;
};

export default buildAnnotatedPhotoHtml;
