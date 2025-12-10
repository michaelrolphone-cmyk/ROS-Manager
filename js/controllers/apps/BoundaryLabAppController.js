import MiniAppController from "./MiniAppController.js";

const sanitizeNumber = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const lineIntersection = (p1, p2, p3, p4) => {
  const denominator =
    (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denominator) < 1e-9) return null;

  const det1 = p1.x * p2.y - p1.y * p2.x;
  const det2 = p3.x * p4.y - p3.y * p4.x;
  const x =
    (det1 * (p3.x - p4.x) - (p1.x - p2.x) * det2) / denominator;
  const y =
    (det1 * (p3.y - p4.y) - (p1.y - p2.y) * det2) / denominator;

  return { x, y };
};

const offsetSegment = (start, end, distance) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = (-dy / length) * distance;
  const ny = (dx / length) * distance;
  return {
    start: { x: start.x + nx, y: start.y + ny },
    end: { x: end.x + nx, y: end.y + ny },
  };
};

export default class BoundaryLabAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.elements = options.elements || {};
    this.getProjects = options.getProjects || (() => ({}));
    this.getCurrentProjectId = options.getCurrentProjectId || (() => null);
    this.getCurrentRecordId = options.getCurrentRecordId || (() => null);
    this.computeTraversePointsForRecord =
      options.computeTraversePointsForRecord || (() => null);
    this.fitCanvasToDisplaySize = options.fitCanvasToDisplaySize || (() => {});
    this.escapeHtml = options.escapeHtml || ((text) => text ?? "");
    this.saveProjects = options.saveProjects || (() => {});
    this.loadRecord = options.loadRecord || (() => {});

    this.bindEvents();
  }

  handleActivate() {
    super.handleActivate();
    this.renderRecordOptions();
    this.renderProcedure();
  }

  get currentProject() {
    const id = this.getCurrentProjectId();
    return this.getProjects?.()[id] || null;
  }

  get selectedRecordId() {
    return this.elements.boundaryRecordSelect?.value || this.getCurrentRecordId();
  }

  get selectedRecord() {
    const recordId = this.selectedRecordId;
    const project = this.currentProject;
    return project?.records?.[recordId] || null;
  }

  bindEvents() {
    this.elements.boundaryRecordSelect?.addEventListener("change", () => {
      const recordId = this.elements.boundaryRecordSelect.value;
      if (recordId && recordId !== this.getCurrentRecordId()) {
        this.loadRecord(recordId);
      }
      this.renderProcedure();
    });

    this.elements.boundaryGenerateStandard?.addEventListener("click", () =>
      this.generateStandardProcedure()
    );

    this.elements.boundaryAddStepButton?.addEventListener("click", () =>
      this.addStepFromForm()
    );

    this.elements.boundaryStepList?.addEventListener("input", (evt) => {
      const container = evt.target.closest("[data-step-id]");
      if (!container) return;
      const stepId = container.dataset.stepId;
      const field = evt.target.dataset.field;
      if (!stepId || !field) return;
      this.updateStepField(stepId, field, evt.target.value);
    });

    this.elements.boundaryStepList?.addEventListener("click", (evt) => {
      const moveUp = evt.target.closest('[data-move="up"]');
      const moveDown = evt.target.closest('[data-move="down"]');
      const remove = evt.target.closest("[data-remove-step]");
      const container = evt.target.closest("[data-step-id]");
      if (!container) return;
      const stepId = container.dataset.stepId;
      if (moveUp) return this.reorderStep(stepId, -1);
      if (moveDown) return this.reorderStep(stepId, 1);
      if (remove) return this.deleteStep(stepId);
    });
  }

  renderRecordOptions() {
    const select = this.elements.boundaryRecordSelect;
    if (!select) return;
    select.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Use active traverse";
    select.appendChild(placeholder);

    const project = this.currentProject;
    const records = project?.records || {};
    Object.entries(records).forEach(([id, record]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = record.name || `Record ${id}`;
      select.appendChild(opt);
    });

    const currentId = this.getCurrentRecordId();
    if (currentId && select.querySelector(`option[value="${currentId}"]`)) {
      select.value = currentId;
    } else {
      select.value = "";
    }
  }

  generateStandardProcedure() {
    const record = this.selectedRecord;
    if (!record) {
      alert("Select a traverse record first.");
      return;
    }

    const offset = sanitizeNumber(
      this.elements.boundaryStandardOffset?.value,
      25
    );

    const steps = [
      this.createStep({
        type: "offset",
        distance: offset,
        direction: "left",
        label: "Offset controlling boundary (left)",
      }),
      this.createStep({
        type: "offset",
        distance: offset,
        direction: "right",
        label: "Offset controlling boundary (right)",
      }),
      this.createStep({
        type: "extend",
        label: "Extend/trim offsets to intersections",
      }),
    ];

    this.storeSteps(record, steps);
    this.renderProcedure();
  }

  addStepFromForm() {
    const record = this.selectedRecord;
    if (!record) return alert("Select a traverse record first.");

    const type = this.elements.boundaryStepType?.value || "offset";
    const distance = this.elements.boundaryStepDistance?.value || "";
    const direction = this.elements.boundaryStepDirection?.value || "left";
    const perSegment = this.elements.boundarySegmentOffsets?.value || "";
    const label = this.elements.boundaryStepLabel?.value || "";

    const step = this.createStep({
      type,
      distance: type === "offset" ? sanitizeNumber(distance, 0) : "",
      direction,
      segmentOffsets: perSegment,
      label,
    });

    const procedure = this.getProcedure(record);
    procedure.steps.push(step);
    record.boundaryProcedure = procedure;
    this.saveProjects();
    this.renderProcedure();

    [
      this.elements.boundaryStepDistance,
      this.elements.boundarySegmentOffsets,
      this.elements.boundaryStepLabel,
    ].forEach((el) => {
      if (el) el.value = "";
    });
  }

  createStep({
    type = "offset",
    distance = "",
    direction = "left",
    segmentOffsets = "",
    label = "",
  } = {}) {
    return {
      id: `boundary-step-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      distance,
      direction,
      segmentOffsets,
      label,
    };
  }

  updateStepField(stepId, field, value) {
    const record = this.selectedRecord;
    if (!record) return;
    const procedure = this.getProcedure(record);
    const idx = procedure.steps.findIndex((step) => step.id === stepId);
    if (idx === -1) return;
    const next = { ...procedure.steps[idx] };
    if (field === "distance") {
      next.distance = value === "" ? "" : sanitizeNumber(value, 0);
    } else {
      next[field] = value;
    }
    procedure.steps[idx] = next;
    record.boundaryProcedure = procedure;
    this.saveProjects();
    this.renderProcedure();
  }

  reorderStep(stepId, delta) {
    const record = this.selectedRecord;
    if (!record) return;
    const procedure = this.getProcedure(record);
    const idx = procedure.steps.findIndex((step) => step.id === stepId);
    if (idx === -1) return;
    const swapWith = idx + delta;
    if (swapWith < 0 || swapWith >= procedure.steps.length) return;
    const swapped = [...procedure.steps];
    [swapped[idx], swapped[swapWith]] = [
      swapped[swapWith],
      swapped[idx],
    ];
    procedure.steps = swapped;
    record.boundaryProcedure = procedure;
    this.saveProjects();
    this.renderProcedure();
  }

  deleteStep(stepId) {
    const record = this.selectedRecord;
    if (!record) return;
    const procedure = this.getProcedure(record);
    procedure.steps = procedure.steps.filter((step) => step.id !== stepId);
    record.boundaryProcedure = procedure;
    this.saveProjects();
    this.renderProcedure();
  }

  storeSteps(record, steps = []) {
    record.boundaryProcedure = {
      ...this.getProcedure(record),
      steps,
    };
    this.saveProjects();
  }

  getProcedure(record) {
    if (!record.boundaryProcedure || typeof record.boundaryProcedure !== "object") {
      record.boundaryProcedure = { steps: [] };
    }
    return record.boundaryProcedure;
  }

  renderProcedure() {
    const record = this.selectedRecord;
    if (!record) {
      this.renderStepList([]);
      this.renderPreview(null, null);
      this.setStatus("Select a traverse to design offsets.");
      return;
    }

    this.setStatus("");
    const procedure = this.getProcedure(record);
    this.renderStepList(procedure.steps || []);
    const base = this.getBasePolyline(record);
    const result = this.applyProcedure(procedure.steps || [], base);
    this.renderPreview(base, result?.polyline || null);
    this.renderSummary(base, result);
  }

  renderStepList(steps = []) {
    const container = this.elements.boundaryStepList;
    if (!container) return;
    container.innerHTML = "";

    if (!steps.length) {
      const empty = document.createElement("p");
      empty.className = "mini-note";
      empty.textContent = "No steps yet. Generate a standard procedure or add one manually.";
      container.appendChild(empty);
      return;
    }

    steps.forEach((step, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "procedure-step";
      wrapper.dataset.stepId = step.id;

      const header = document.createElement("div");
      header.className = "procedure-step-header";
      const title = document.createElement("div");
      title.innerHTML = `<strong>Step ${idx + 1}:</strong> ${
        this.escapeHtml(step.label || this.describeStep(step))
      }`;
      const controls = document.createElement("div");
      controls.className = "procedure-step-controls";
      controls.innerHTML = `
        <button type="button" data-move="up" aria-label="Move step up">▲</button>
        <button type="button" data-move="down" aria-label="Move step down">▼</button>
        <button type="button" data-remove-step aria-label="Remove step" class="danger">✕</button>
      `;
      header.appendChild(title);
      header.appendChild(controls);

      const body = document.createElement("div");
      body.className = "procedure-step-body";
      body.innerHTML = `
        <label>Type
          <select data-field="type">
            <option value="offset" ${step.type === "offset" ? "selected" : ""}>Offset</option>
            <option value="extend" ${step.type === "extend" ? "selected" : ""}>Extend to intersect</option>
            <option value="trim" ${step.type === "trim" ? "selected" : ""}>Trim to intersect</option>
          </select>
        </label>
        <label>Distance (ft)
          <input type="number" data-field="distance" value="${
            step.distance ?? ""
          }" ${step.type === "offset" ? "" : "disabled"} step="0.01" />
        </label>
        <label>Direction
          <select data-field="direction" ${
            step.type === "offset" ? "" : "disabled"
          }>
            <option value="left" ${step.direction === "left" ? "selected" : ""}>Left</option>
            <option value="right" ${step.direction === "right" ? "selected" : ""}>Right</option>
          </select>
        </label>
        <label>Variable offsets (comma-separated)
          <input type="text" data-field="segmentOffsets" value="${
            step.segmentOffsets || ""
          }" placeholder="e.g., 25,25,22 for call-specific offsets" />
        </label>
        <label>Notes
          <input type="text" data-field="label" value="${step.label || ""}" placeholder="Describe this step" />
        </label>
      `;

      container.appendChild(wrapper);
      wrapper.appendChild(header);
      wrapper.appendChild(body);
    });
  }

  describeStep(step) {
    if (step.type === "offset") {
      const distanceLabel = step.segmentOffsets
        ? `${step.direction || "left"} (variable)`
        : `${step.distance || 0} ft ${step.direction || "left"}`;
      return `Offset ${distanceLabel}`;
    }
    if (step.type === "extend") return "Extend lines to intersect neighbors";
    if (step.type === "trim") return "Trim intersections to remove overlaps";
    return "Custom step";
  }

  getBasePolyline(record) {
    const projectId = this.getCurrentProjectId();
    if (!projectId || !record) return null;
    const geometry = this.computeTraversePointsForRecord(projectId, record.id);
    const mainLine = geometry?.polylines?.[0] || null;
    if (!mainLine || mainLine.length < 2) return null;
    return mainLine;
  }

  applyProcedure(steps = [], basePolyline = null) {
    if (!basePolyline || !basePolyline.length) return null;

    let current = basePolyline.map((pt) => ({ ...pt }));
    const warnings = [];

    steps.forEach((step) => {
      if (!step) return;
      if (step.type === "offset") {
        const perSegmentOffsets = (step.segmentOffsets || "")
          .split(",")
          .map((value) => sanitizeNumber(value, NaN))
          .filter((value) => Number.isFinite(value));

        current = this.applyOffset(
          current,
          sanitizeNumber(step.distance, 0),
          step.direction === "right" ? -1 : 1,
          perSegmentOffsets
        );
        return;
      }

      if (step.type === "extend" || step.type === "trim") {
        current = this.cleanupIntersections(current);
      }
    });

    const gapLength = this.computeGapLength(current);
    if (gapLength > 0.01) {
      warnings.push(
        `Found ${gapLength.toFixed(2)} feet of gaps between successive offsets.`
      );
    }

    return { polyline: current, warnings };
  }

  applyOffset(polyline, distance, directionSign = 1, perSegment = []) {
    if (!polyline || polyline.length < 2) return polyline;

    const segments = [];
    for (let i = 0; i < polyline.length - 1; i += 1) {
      const segmentDistance = Number.isFinite(perSegment[i])
        ? perSegment[i]
        : distance;
      segments.push(
        offsetSegment(polyline[i], polyline[i + 1], segmentDistance * directionSign)
      );
    }

    const result = [];
    segments.forEach((segment, idx) => {
      if (idx === 0) {
        result.push(segment.start);
      }

      if (idx > 0) {
        const previous = segments[idx - 1];
        const join = lineIntersection(
          previous.start,
          previous.end,
          segment.start,
          segment.end
        );
        if (join) {
          result[result.length - 1] = join;
          result.push(join);
        }
      }

      result.push(segment.end);
    });

    return result;
  }

  cleanupIntersections(polyline = []) {
    if (polyline.length < 3) return polyline;
    const cleaned = [polyline[0]];

    for (let i = 1; i < polyline.length - 1; i += 1) {
      const prev = polyline[i - 1];
      const current = polyline[i];
      const next = polyline[i + 1];
      const intersection = lineIntersection(prev, current, current, next);
      cleaned.push(intersection || current);
    }

    cleaned.push(polyline[polyline.length - 1]);
    return cleaned;
  }

  computeGapLength(polyline = []) {
    if (polyline.length < 2) return 0;
    let gap = 0;
    for (let i = 0; i < polyline.length - 1; i += 1) {
      const start = polyline[i];
      const end = polyline[i + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 0.001) {
        gap += 0.001;
      }
    }
    return gap;
  }

  renderPreview(basePolyline, resultPolyline) {
    const canvas = this.elements.boundaryPreviewCanvas;
    if (!canvas) return;
    this.fitCanvasToDisplaySize(canvas);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!basePolyline || !basePolyline.length) {
      this.setStatus("No traverse geometry to preview yet.");
      return;
    }

    const allPoints = [...basePolyline, ...(resultPolyline || [])];
    const xs = allPoints.map((pt) => pt.x);
    const ys = allPoints.map((pt) => pt.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const padding = 20;
    const scaleX = (canvas.width - 2 * padding) / Math.max(maxX - minX, 1);
    const scaleY = (canvas.height - 2 * padding) / Math.max(maxY - minY, 1);
    const scale = Math.min(scaleX, scaleY);

    const project = (pt) => ({
      x: padding + (pt.x - minX) * scale,
      y: canvas.height - (padding + (pt.y - minY) * scale),
    });

    const drawLine = (polyline, color, width = 2, dash = []) => {
      if (!polyline || polyline.length < 2) return;
      ctx.beginPath();
      const start = project(polyline[0]);
      ctx.moveTo(start.x, start.y);
      polyline.slice(1).forEach((pt) => {
        const p = project(pt);
        ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawLine(basePolyline, "#9ca3af", 2, [6, 4]);
    drawLine(resultPolyline || basePolyline, "#2563eb", 3);
  }

  renderSummary(basePolyline, result) {
    const summary = this.elements.boundaryProcedureSummary;
    if (!summary) return;

    if (!basePolyline) {
      summary.textContent = "Select a traverse to see offsets and intersections.";
      return;
    }

    const stepCount = this.getProcedure(this.selectedRecord).steps.length;
    const warnings = result?.warnings || [];
    const baseLength = this.getPolylineLength(basePolyline);
    const resultLength = this.getPolylineLength(result?.polyline || basePolyline);

    const parts = [
      `${stepCount} step${stepCount === 1 ? "" : "s"} configured`,
      `Base length: ${baseLength.toFixed(2)} ft`,
      `Result length: ${resultLength.toFixed(2)} ft`,
    ];

    summary.innerHTML = `${parts
      .map((part) => `<span class="pill">${this.escapeHtml(part)}</span>`)
      .join(" ")}${
      warnings.length
        ? `<div class="warning-note">${warnings.map((w) => this.escapeHtml(w)).join("<br />")}</div>`
        : ""
    }`;
  }

  getPolylineLength(polyline = []) {
    if (!polyline.length) return 0;
    let length = 0;
    for (let i = 0; i < polyline.length - 1; i += 1) {
      const dx = polyline[i + 1].x - polyline[i].x;
      const dy = polyline[i + 1].y - polyline[i].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }

  setStatus(message) {
    if (this.elements.boundaryStatus) {
      this.elements.boundaryStatus.textContent = message || "";
    }
  }
}
