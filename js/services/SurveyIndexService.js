export function normalizeTrsComponent(value = "", padLength = 2) {
  const digits = (value.match(/\d+/g) || []).join("");
  if (!digits) return "";
  return padLength > 0 ? digits.padStart(padLength, "0") : digits;
}

export function normalizeBookOrPage(value = "") {
  return (value.match(/\d+/g) || []).join("");
}

export function aliquotToCode(value = "") {
  const map = { NE: "1", SE: "2", SW: "3", NW: "4" };
  return map[value.toUpperCase?.() || ""] || "0";
}

export function buildAliquotCodes(aliquots = []) {
  const codes = aliquots.slice(0, 3).map((entry) => aliquotToCode(entry));
  while (codes.length < 3) codes.push("0");
  return codes.join("");
}

export function buildSurveyIndexNumber(project) {
  if (!project) return "";
  const township = normalizeTrsComponent(project.townships?.[0], 0) || "0";
  const range = normalizeTrsComponent(project.ranges?.[0], 0) || "0";
  const section = normalizeTrsComponent(project.sections?.[0]) || "00";
  const quadrant = aliquotToCode(project.sectionQuadrant) || "0";
  const aliquotCodes = buildAliquotCodes(project.aliquots) || "000";
  const book = normalizeBookOrPage(project.platBook) || "0";
  const pageStart = normalizeBookOrPage(project.platPageStart) || "0";
  const pageEnd = normalizeBookOrPage(project.platPageEnd) || "";

  const base = `${township}${range}${quadrant}-${section}-${aliquotCodes}-${book}-${pageStart}`;
  return pageEnd ? `${base}-${pageEnd || "0"}` : base;
}

export default {
  aliquotToCode,
  buildAliquotCodes,
  buildSurveyIndexNumber,
  normalizeBookOrPage,
  normalizeTrsComponent,
};
