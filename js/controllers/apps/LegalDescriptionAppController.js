import MiniAppController from "./MiniAppController.js";

export default class LegalDescriptionAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.elements = options.elements || {};
    this.getProjects = options.getProjects;
    this.getCurrentProjectId = options.getCurrentProjectId;
    this.getCurrentRecordId = options.getCurrentRecordId;
    this.createRecordFromCalls = options.createRecordFromCalls;
    this.formatRatio = options.formatRatio;
    this.clauseBoundaryRegex =
      /(including|also including|together with|parcel|lot|block|except|excluding|less|save and except|reserving)/i;

    this.elements.generateButton?.addEventListener("click", () =>
      this.generateDescription()
    );
    this.elements.copyButton?.addEventListener("click", () =>
      this.copyDescription()
    );
    this.elements.importButton?.addEventListener("click", () =>
      this.convertDescriptionToTraverse()
    );
    this.elements.traverseSelect?.addEventListener("change", () =>
      this.generateDescription()
    );
    this.elements.includeBasis?.addEventListener("change", () =>
      this.generateDescription()
    );
    this.elements.includeClosure?.addEventListener("change", () =>
      this.generateDescription()
    );
    this.elements.preambleInput?.addEventListener("input", () =>
      this.generateDescription()
    );
  }

  handleActivate() {
    super.handleActivate();
    this.renderTraverseOptions();
    this.generateDescription();
  }

  getActiveProject() {
    const projects =
      typeof this.getProjects === "function" ? this.getProjects() : {};
    const projectId =
      typeof this.getCurrentProjectId === "function"
        ? this.getCurrentProjectId()
        : null;
    if (!projectId || !projects[projectId]) return null;
    return projects[projectId];
  }

  getRecordById(recordId) {
    const project = this.getActiveProject();
    if (!project || !recordId) return null;
    return project.records?.[recordId] || null;
  }

  renderTraverseOptions(preferredId = null) {
    const select = this.elements.traverseSelect;
    if (!select) return;
    const project = this.getActiveProject();

    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = project
      ? "Select a traverse record"
      : "Create or open a project to begin";
    select.appendChild(placeholder);

    if (!project) {
      this.setStatus("Choose a project to build a legal description.");
      return;
    }

    const records = project.records || {};
    Object.entries(records).forEach(([id, record]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = record.name || `Record ${id}`;
      select.appendChild(opt);
    });

    const fallbackId =
      preferredId || (typeof this.getCurrentRecordId === "function"
        ? this.getCurrentRecordId()
        : "");
    if (fallbackId && records[fallbackId]) {
      select.value = fallbackId;
    }

    this.setStatus(
      Object.keys(records).length
        ? "Pick a traverse and generate the narrative."
        : "Add traverse calls to a record first."
    );
  }

  selectRecord(recordId) {
    const select = this.elements.traverseSelect;
    if (!select) return;
    select.value = recordId;
    this.generateDescription();
  }

  generateDescription() {
    const output = this.elements.output;
    const project = this.getActiveProject();
    const select = this.elements.traverseSelect;
    if (!output) return;

    if (!project) {
      output.value = "";
      this.setStatus("No active project.");
      return;
    }

    const recordId = select?.value || this.getCurrentRecordId?.();
    const record = this.getRecordById(recordId);
    if (!record) {
      output.value = "";
      this.setStatus("Select a traverse record to describe.");
      return;
    }

    const description = this.buildDescription(project, record);
    output.value = description;
    this.setStatus(
      `Drafted description for ${record.name || "traverse"} at ${new Date().toLocaleTimeString()}`
    );
  }

  buildDescription(project, record) {
    const sections = [];
    const preamble = (this.elements.preambleInput?.value || "").trim();
    const includeBasis = this.elements.includeBasis?.checked !== false;
    const includeClosure = this.elements.includeClosure?.checked !== false;

    if (preamble) {
      sections.push(preamble);
    } else {
      const projectName = project?.name ? ` for ${project.name}` : "";
      sections.push(
        `A legal description derived from traverse "${record.name || "Traverse"}"${projectName}.`
      );
    }

    if (includeBasis && record.basis) {
      sections.push(`Basis of bearing: ${record.basis}.`);
    }

    sections.push(this.describeCalls(record.calls || []));

    if (includeClosure && record.expectedToClose !== false) {
      const closureLabel =
        record.closurePointNumber || record.startPtNum || "the point of beginning";
      sections.push(`Said courses return to ${closureLabel}, closing the traverse.`);
    }

    return sections.filter(Boolean).join("\n\n");
  }

  describeCalls(calls = [], depth = 0) {
    if (!calls.length) return "No traverse calls have been recorded.";
    const lines = [];
    calls.forEach((call, idx) => {
      lines.push(this.describeCall(call, idx, depth));
    });
    return lines.join("\n");
  }

  describeCall(call = {}, idx = 0, depth = 0) {
    const indent = "  ".repeat(depth);
    const isFirst = depth === 0 && idx === 0;
    const prefix = isFirst ? "Beginning" : "Thence";
    const parts = [];

    const bearing = (call.curveDirection ? call.curveChordBearing : call.bearing) || "";
    const distanceDescription = call.curveDirection
      ? this.describeCurve(call)
      : this.describeDistance(call.distance);

    if (bearing.trim()) parts.push(bearing.trim());
    if (distanceDescription) parts.push(distanceDescription);

    const offset = this.describeOffset(call);
    if (offset) parts.push(offset);

    let line = `${indent}${prefix} ${parts.join(", ")}`.trim();
    if (!line.endsWith(".")) line += ".";

    const branchLines = [];
    (call.branches || []).forEach((branch, branchIdx) => {
      if (!branch || !branch.length) return;
      branchLines.push(`${indent}  Branch ${branchIdx + 1}:`);
      branch.forEach((branchCall, branchCallIdx) => {
        branchLines.push(this.describeCall(branchCall, branchCallIdx, depth + 1));
      });
    });

    if (branchLines.length) {
      line += `\n${branchLines.join("\n")}`;
    }

    return line;
  }

  describeDistance(distance) {
    const formatted = this.formatDistance(distance);
    if (!formatted) return "";
    return `a distance of ${formatted} feet`;
  }

  describeCurve(call = {}) {
    const direction = (call.curveDirection || "").toLowerCase();
    const pieces = [];
    if (direction) pieces.push(`along a curve to the ${direction}`);

    const radius = this.formatDistance(call.curveRadius);
    if (radius) pieces.push(`with a radius of ${radius} feet`);

    const arc = this.formatDistance(call.curveArcLength);
    if (arc) pieces.push(`an arc length of ${arc} feet`);

    const chord = this.formatDistance(call.curveChordLength);
    const chordBearing = (call.curveChordBearing || "").trim();
    if (chord || chordBearing) {
      const chordParts = [];
      if (chord) chordParts.push(`${chord} feet`);
      if (chordBearing) chordParts.push(`bearing ${chordBearing}`);
      pieces.push(`chord ${chordParts.join(" at ")}`);
    }

    const delta = this.formatDistance(call.curveDeltaAngle);
    if (delta) pieces.push(`delta angle ${delta}`);

    const tangent = this.formatDistance(call.curveTangent);
    if (tangent) pieces.push(`tangent length ${tangent} feet`);

    return pieces.join(", ");
  }

  describeOffset(call = {}) {
    const reference = (call.offsetReference || "").trim();
    const distance = this.formatDistance(call.offsetDistance);
    const direction = (call.offsetDirection || "").trim();
    if (!reference && !distance && !direction) return "";
    const parts = [];
    if (distance) parts.push(`${distance} feet`);
    if (direction) parts.push(direction);
    if (reference) parts.push(`of ${reference}`);
    return `offset ${parts.join(" ")}`;
  }

  parseQuadrantBearing(bearing = "") {
    const match = bearing.match(
      /([NS])\s*([0-9]{1,3})(?:[^0-9]+([0-9]{1,2}))?(?:[^0-9]+([0-9]{1,2}))?\s*([EW])/i
    );
    if (!match) return null;
    const [, quad1, deg, min = "0", sec = "0", quad2] = match;
    const degrees =
      parseFloat(deg) + parseFloat(min) / 60 + parseFloat(sec) / 3600 || 0;
    let az = degrees;
    const upper1 = quad1.toUpperCase();
    const upper2 = quad2.toUpperCase();
    if (upper1 === "S") az = 180 - az;
    if (upper2 === "W") az = 360 - az;
    return { degrees: this.normalizeDegrees(az), radians: (az * Math.PI) / 180 };
  }

  normalizeDegrees(value) {
    let normalized = value % 360;
    if (normalized < 0) normalized += 360;
    return normalized;
  }

  parseDescriptionToTraverse(text = "") {
    const clauses = this.splitIntoClauses(text);
    const notes = [];
    const flattenedCalls = [];

    const parsedClauses = clauses.map((clause, idx) => {
      const parsedCalls = [];
      const clauseNotes = [];
      const labeledClause = {
        ...clause,
        label: this.extractClauseLabel(clause.text, idx),
      };

      clause.lines.forEach((line) => {
        const segments = this.splitLineSegments(line);
        segments.forEach((segment) => {
          const call = this.parseLineToCall(segment);
          if (call) {
            parsedCalls.push(call);
            flattenedCalls.push({ ...call, clauseType: clause.type });
          } else {
            clauseNotes.push(`Skipped: ${segment}`);
          }
        });
      });

      const closure = this.computeClosure(parsedCalls);
      return { ...labeledClause, calls: parsedCalls, closure, notes: clauseNotes };
    });

    parsedClauses.forEach((clause) => {
      if (clause.notes?.length) notes.push(...clause.notes);
    });

    const netClosure = this.computeCompositeClosure(parsedClauses);
    return { calls: flattenedCalls, closure: netClosure, notes, clauses: parsedClauses };
  }

  computeClosure(calls = []) {
    let x = 0;
    let y = 0;
    let total = 0;
    calls.forEach((call) => {
      const bearing = this.parseQuadrantBearing(call.bearing || "");
      const distance = parseFloat(call.distance);
      if (!bearing || !Number.isFinite(distance)) return;
      const rad = bearing.radians;
      x += Math.sin(rad) * distance;
      y += Math.cos(rad) * distance;
      total += distance;
    });

    const misclosure = Math.hypot(x, y);
    const closes = misclosure <= 0.01 && total > 0;
    const ratio =
      typeof this.formatRatio === "function"
        ? this.formatRatio(misclosure, total)
        : null;
    return { misclosure, total, closes, ratio, deltaX: x, deltaY: y };
  }

  computeCompositeClosure(clauses = []) {
    let x = 0;
    let y = 0;
    let total = 0;
    clauses.forEach((clause) => {
      const sign = clause.type === "exclude" ? -1 : 1;
      const deltaX = clause.closure?.deltaX || 0;
      const deltaY = clause.closure?.deltaY || 0;
      const distance = clause.closure?.total || 0;
      x += sign * deltaX;
      y += sign * deltaY;
      total += distance;
    });

    const misclosure = Math.hypot(x, y);
    const closes = misclosure <= 0.01 && total > 0;
    const ratio =
      typeof this.formatRatio === "function"
        ? this.formatRatio(misclosure, total)
        : null;
    return { misclosure, total, closes, ratio, deltaX: x, deltaY: y };
  }

  splitIntoClauses(text = "") {
    const lines = (text || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return [];

    const clauses = [];
    let current = { lines: [], text: "", type: "include" };

    lines.forEach((line, idx) => {
      const isBoundary = idx > 0 && this.clauseBoundaryRegex.test(line);
      if (isBoundary && current.lines.length) {
        current.text = current.lines.join(" ");
        current.type = this.detectClauseType(current.text, clauses.length);
        clauses.push(current);
        current = { lines: [line], text: "", type: "include" };
      } else {
        current.lines.push(line);
      }
    });

    if (current.lines.length) {
      current.text = current.lines.join(" ");
      current.type = this.detectClauseType(current.text, clauses.length);
      clauses.push(current);
    }

    return clauses;
  }

  detectClauseType(text = "", clauseIndex = 0) {
    const lower = text.toLowerCase();
    if (/\b(except|excluding|less|save and except|reserving)\b/.test(lower)) {
      return "exclude";
    }
    if (/\b(include|including|together with|also including)\b/.test(lower)) {
      return "include";
    }
    // Assume the first clause is the primary inclusion, with later clauses defaulting to additive
    if (clauseIndex === 0) return "include";
    if (/\b(parcel|lot|block)\b/.test(lower)) return "include";
    return "include";
  }

  extractClauseLabel(text = "", clauseIndex = 0) {
    const parcelMatch = text.match(/parcel\s+([a-z0-9]+)/i);
    if (parcelMatch) return `Parcel ${parcelMatch[1].toUpperCase()}`;
    const lotBlockMatch = text.match(/lot\s+([a-z0-9]+)\s*(?:,?\s*block\s+([a-z0-9]+))?/i);
    if (lotBlockMatch) {
      const lot = lotBlockMatch[1].toUpperCase();
      const block = lotBlockMatch[2]?.toUpperCase();
      return block ? `Lot ${lot}, Block ${block}` : `Lot ${lot}`;
    }
    return clauseIndex === 0 ? "Primary tract" : `Clause ${clauseIndex + 1}`;
  }

  splitLineSegments(line = "") {
    return line
      .split(/(?:;|\.)+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  parseLineToCall(line = "") {
    const bearingMatch = line.match(
      /([NS]\s*[0-9]{1,3}(?:[^0-9]+[0-9]{1,2}){0,2}\s*[EW])/i
    );
    const distanceMatch = line.match(/(\d+(?:\.\d+)?)\s*(feet|ft|')/i);
    const bearing = bearingMatch ? bearingMatch[1].trim() : "";
    const distance = distanceMatch ? parseFloat(distanceMatch[1]) : null;
    if (!bearing && distance === null) return null;
    return { bearing, distance: distance ?? "" };
  }

  renderClosureChip(closure) {
    const chip = this.elements.closureChip;
    if (!chip) return;
    const { misclosure, closes, ratio } = closure || {};
    chip.className = "status-chip";
    if (!closure || !Number.isFinite(misclosure)) {
      chip.textContent = "No traverse parsed";
      return;
    }
    chip.classList.add(closes ? "qc-pass" : "qc-warning");
    chip.textContent = closes
      ? "Net closure: closes (misclosure < 0.01 ft)"
      : `Net open: misclosure ${this.formatDistance(misclosure)} ft${
          ratio ? ` · Ratio ${ratio}` : ""
        }`;
  }

  renderParsedTraversePreview(parsed) {
    const target = this.elements.importPreview;
    if (!target) return;
    if (!parsed || !parsed.calls.length) {
      target.textContent = "No calls parsed yet.";
      this.renderClosureChip(null);
      return;
    }

    const lines = [];

    (parsed.clauses || []).forEach((clause, idx) => {
      const badge = clause.type === "exclude" ? "Exclusion" : "Inclusion";
      const header = `${clause.label} (${badge})`;
      lines.push(header);

      const closureSummary = this.describeClosureSummary(
        clause.closure,
        clause.type === "exclude"
      );
      if (closureSummary) lines.push(`  ${closureSummary}`);

      clause.calls.forEach((call, callIdx) => {
        const label = callIdx === 0 ? "Beginning" : "Thence";
        const parts = [];
        if (call.bearing) parts.push(call.bearing);
        if (call.distance)
          parts.push(`${this.formatDistance(call.distance)} feet`);
        lines.push(`  ${label}: ${parts.join(", ")}`);
      });

      if (clause.notes?.length) {
        clause.notes.forEach((note) => lines.push(`  Note: ${note}`));
      }
      lines.push("");
    });

    if (parsed.closure) {
      const netSummary = this.describeClosureSummary(parsed.closure, false, true);
      if (netSummary) lines.push(`Net: ${netSummary}`);
    }

    if (parsed.notes.length) {
      lines.push("", "Notes:", ...parsed.notes.map((note) => `- ${note}`));
    }

    target.textContent = lines.join("\n");
    this.renderClosureChip(parsed.closure);
  }

  convertDescriptionToTraverse() {
    const text = this.elements.importInput?.value || "";
    const parsed = this.parseDescriptionToTraverse(text);
    this.renderParsedTraversePreview(parsed);

    if (!parsed.calls.length) {
      this.setStatus("No traverse calls found in the description.");
      return;
    }

    const name = (this.elements.importName?.value || "Imported description").trim();
    if (typeof this.createRecordFromCalls === "function") {
      const record = this.createRecordFromCalls(parsed.calls, {
        name,
        expectedToClose: parsed.closure?.closes !== false,
      });
      if (record) {
        const closureNote = parsed.closure?.closes
          ? " (net closure computed as closed)"
          : " (net closure open)";
        this.setStatus(`Created traverse "${record.name}"${closureNote}`);
      }
    }
  }

  describeClosureSummary(closure, isExclusion = false, isNet = false) {
    if (!closure) return "";
    const magnitude = this.formatDistance(closure.misclosure);
    const role = isNet ? "layered" : isExclusion ? "subtractive" : "additive";
    const ratioText =
      closure.total > 0 && closure.ratio ? ` · Ratio ${closure.ratio}` : "";
    const closesText = closure.closes
      ? `Closes (${role})`
      : `Open (${role})`;
    return `${closesText}: misclosure ${magnitude} ft${ratioText}`;
  }

  formatDistance(value) {
    if (value === null || value === undefined) return "";
    const str = value.toString().trim();
    if (!str) return "";
    const num = parseFloat(str);
    if (Number.isFinite(num)) return num.toFixed(2);
    return str;
  }

  async copyDescription() {
    const output = this.elements.output;
    if (!output) return;
    const text = output.value || "";
    if (!navigator.clipboard) {
      this.setStatus("Clipboard not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.setStatus("Copied description to clipboard.");
    } catch (err) {
      console.error("Copy failed", err);
      this.setStatus("Unable to copy to clipboard.");
    }
  }

  setStatus(message = "") {
    if (this.elements.status) {
      this.elements.status.textContent = message;
    }
  }
}
