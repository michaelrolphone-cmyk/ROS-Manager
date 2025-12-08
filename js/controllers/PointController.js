import Point from "../models/Point.js";
import PointFile from "../models/PointFile.js";

export default class PointController {
  constructor({ elements = {}, getCurrentProject, saveProjects }) {
    this.elements = elements;
    this.getCurrentProject = getCurrentProject;
    this.saveProjects = saveProjects;
    this.viewMode = "adjusted";

    this.bindEvents();
  }

  bindEvents() {
    this.elements.pointImportButton?.addEventListener("click", () =>
      this.triggerPointsImport()
    );

    this.elements.pointsFileInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) this.handlePointsFile(file);
    });

    this.elements.addPointRowButton?.addEventListener("click", () =>
      this.addPointRow()
    );

    this.elements.pointFileSelect?.addEventListener("change", (e) => {
      this.setActivePointFile(e.target.value);
    });

    this.elements.newPointFileButton?.addEventListener("click", () =>
      this.createPointFile()
    );

    this.elements.renamePointFileButton?.addEventListener("click", () =>
      this.renameActivePointFile()
    );

    this.elements.downloadPointsButton?.addEventListener("click", () =>
      this.downloadActivePointFile()
    );

    this.elements.pointViewModeSelect?.addEventListener("change", (e) => {
      this.viewMode = e.target.value === "raw" ? "raw" : "adjusted";
      this.renderPointsTable();
    });

    this.elements.adjustmentSaveButton?.addEventListener("click", () =>
      this.captureAdjustmentRecord()
    );
  }

  captureAdjustmentRecord() {
    const pointFile = this.getActivePointFile();
    if (!pointFile) {
      alert("No point file selected to annotate.");
      return;
    }

    pointFile.adjustmentMeta.algorithm =
      this.elements.adjustmentAlgorithm?.value || "";
    pointFile.adjustmentMeta.notes =
      this.elements.adjustmentNotes?.value?.trim() || "";
    pointFile.adjustmentMeta.lastAdjustedAt = new Date().toISOString();
    this.updateAdjustmentDeltas(pointFile);
    this.saveProjects();
    this.renderPointsTable();
  }

  triggerPointsImport() {
    if (!this.getCurrentProject()) return alert("Select a project first");
    if (this.elements.pointsFileInput) {
      this.elements.pointsFileInput.value = "";
      this.elements.pointsFileInput.click();
    }
  }

  handlePointsFile(file) {
    const project = this.getCurrentProject();
    if (!project || !file) return alert("Create or select a project first");

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result || "";
      const parsed = this.parsePointCsv(text);
      if (!parsed.length) {
        alert("No points found in CSV. Ensure columns are present.");
        return;
      }
      const processed = this.applyPointRenumbering(parsed);
      const pointFiles = this.ensureProjectPointFiles(project);
      const existing = pointFiles.find(
        (pf) => pf.name.toLowerCase() === file.name.toLowerCase()
      );
      if (existing) {
        const confirmed = confirm(
          `Replace existing point file "${existing.name}" with this upload?`
        );
        if (!confirmed) return;
        existing.points = processed.map((pt) => Point.fromObject(pt));
        existing.resetOriginals();
        project.activePointFileId = existing.id;
      } else {
        const newPointFile = new PointFile({
          name: file.name,
          points: processed,
        });
        newPointFile.resetOriginals();
        pointFiles.push(newPointFile);
        project.activePointFileId = newPointFile.id;
      }
      this.saveProjects();
      this.renderPointsTable();
      alert(`Imported ${processed.length} point(s).`);
    };
    reader.readAsText(file);
  }

  parsePointCsv(text) {
    const lines = (text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const points = [];
    lines.forEach((line) => {
      const cells = line
        .split(",")
        .map((c) => c.trim().replace(/^\"|\"$/g, ""));
      if (cells.length < 4) return;
      const [pointNumber = "", x = "", y = "", elevation = ""] = cells;
      const code = cells[4] || "";
      const description =
        cells.length > 5 ? cells.slice(5).join(",") : cells[4] || "";
      points.push(
        new Point({
          pointNumber,
          x,
          y,
          elevation,
          code,
          description,
        })
      );
    });
    return points;
  }

  applyPointRenumbering(points) {
    const hasTextPointNums = points.filter((p) => p.hasAlphaNumericNumber());
    if (!hasTextPointNums.length) return points;

    const confirmed = confirm(
      "Some point numbers contain letters. Renumber sequentially and append original labels to descriptions?"
    );
    if (!confirmed) return points;

    const numericMax = points.reduce((max, p) => {
      if (p.hasAlphaNumericNumber()) return max;
      const val = parseInt(p.pointNumber, 10);
      return Number.isFinite(val) && val > max ? val : max;
    }, 0);

    let nextNum = numericMax > 0 ? numericMax + 1 : 1;
    return points.map((p) => {
      if (!p.hasAlphaNumericNumber()) return p;
      const updated = Point.fromObject(p.toObject());
      const originalLabel = (p.pointNumber || "").trim();
      updated.pointNumber = (nextNum++).toString();
      if (originalLabel) {
        const note = `Orig: ${originalLabel}`;
        updated.description = updated.description
          ? `${updated.description} (${note})`
          : note;
      }
      return updated;
    });
  }

  ensureProjectPointFiles(project) {
    if (!project) return [];
    if (!Array.isArray(project.pointFiles)) project.pointFiles = [];
    project.pointFiles = project.pointFiles.map((pf) =>
      pf instanceof PointFile ? pf : PointFile.fromObject(pf)
    );
    if (!project.activePointFileId && project.pointFiles[0]) {
      project.activePointFileId = project.pointFiles[0].id;
    }
    return project.pointFiles;
  }

  setActivePointFile(id) {
    const project = this.getCurrentProject();
    if (!project) return;
    this.ensureProjectPointFiles(project);
    project.activePointFileId = id;
    this.saveProjects();
    this.renderPointsTable();
  }

  getActivePointFile() {
    const project = this.getCurrentProject();
    if (!project) return null;
    const files = this.ensureProjectPointFiles(project);
    if (!files.length) return null;
    const selected = files.find((pf) => pf.id === project.activePointFileId);
    return selected || files[0];
  }

  renderPointFileOptions() {
    const select = this.elements.pointFileSelect;
    if (!select) return;
    const project = this.getCurrentProject();
    select.innerHTML = "";
    if (!project) {
      const opt = document.createElement("option");
      opt.textContent = "No project";
      opt.value = "";
      select.appendChild(opt);
      select.disabled = true;
      return;
    }
    const files = this.ensureProjectPointFiles(project);
    if (!files.length) {
      const opt = document.createElement("option");
      opt.textContent = "No point files";
      opt.value = "";
      select.appendChild(opt);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    files.forEach((pf) => {
      const opt = document.createElement("option");
      opt.value = pf.id;
      opt.textContent = pf.name;
      if (pf.id === project.activePointFileId) opt.selected = true;
      select.appendChild(opt);
    });
  }

  renderPointsTable() {
    const tbody = this.elements.pointsTableBody;
    if (!tbody) return;
    tbody.innerHTML = "";
    this.renderPointFileOptions();

    const project = this.getCurrentProject();
    if (!project) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 10;
      cell.textContent = "Create or select a project to manage points.";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    const pointFile = this.getActivePointFile();
    if (!pointFile) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 10;
      cell.textContent = "No point files yet. Import or create one.";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    this.updateAdjustmentDeltas(pointFile);
    const isRawView = this.viewMode === "raw";
    const points = isRawView ? pointFile.originalPoints : pointFile.points;
    const deltaByIndex = this.getDeltaLookup(pointFile);

    this.renderAdjustmentMeta(pointFile);
    if (!points.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 10;
      cell.textContent = "No points loaded yet. Import a CSV or add rows.";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    points.forEach((pt, idx) => {
      const tr = document.createElement("tr");
      if (this.isPointModified(pointFile, idx)) {
        tr.classList.add("row-modified");
      }

      const fields = ["pointNumber", "x", "y", "elevation", "code", "description"];
      fields.forEach((field) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.type = "text";
        input.value = pt[field] || "";
        input.dataset.index = idx.toString();
        input.dataset.field = field;
        if (isRawView) {
          input.readOnly = true;
          input.classList.add("readonly");
          input.title = "Raw coordinates are read-only";
        } else {
          input.addEventListener("input", (e) =>
            this.updatePointField(idx, field, e.target.value, e.target)
          );
        }
        td.appendChild(input);
        tr.appendChild(td);
      });

      const actionsTd = document.createElement("td");

      if (!isRawView) {
        const revertBtn = document.createElement("button");
        revertBtn.type = "button";
        revertBtn.textContent = "Revert";
        revertBtn.className = "secondary";
        revertBtn.disabled = !this.isPointModified(pointFile, idx);
        revertBtn.addEventListener("click", () => this.revertPointRow(idx));
        actionsTd.appendChild(revertBtn);

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.textContent = "Remove";
        removeBtn.className = "danger";
        removeBtn.addEventListener("click", () => this.removePointRow(idx));
        actionsTd.appendChild(removeBtn);
      }

      tr.appendChild(actionsTd);

      const delta = deltaByIndex[idx] || { dx: "", dy: "", dz: "" };
      [delta.dx, delta.dy, delta.dz].forEach((val) => {
        const td = document.createElement("td");
        td.textContent = val;
        td.className = "delta-cell";
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  updatePointField(index, field, value, inputEl = null) {
    const pointFile = this.getActivePointFile();
    if (!pointFile || !pointFile.points[index]) return;
    pointFile.points[index][field] = value;
    this.saveProjects();
    this.updateAdjustmentDeltas(pointFile);
    this.updatePointRowState(index, inputEl);
  }

  updatePointRowState(index, inputEl = null) {
    const pointFile = this.getActivePointFile();
    if (!pointFile) return;
    const row = inputEl?.closest("tr");
    if (!row) return;

    const modified = this.isPointModified(pointFile, index);
    row.classList.toggle("row-modified", modified);
    const revertBtn = row.querySelector("button.secondary");
    if (revertBtn) {
      revertBtn.disabled = !modified;
    }
  }

  removePointRow(index) {
    const pointFile = this.getActivePointFile();
    if (!pointFile) return;
    pointFile.points.splice(index, 1);
    pointFile.originalPoints.splice(index, 1);
    this.saveProjects();
    this.updateAdjustmentDeltas(pointFile);
    this.renderPointsTable();
  }

  addPointRow(point = null) {
    const project = this.getCurrentProject();
    if (!project) return alert("Select a project first");
    let pointFile = this.getActivePointFile();
    if (!pointFile) {
      pointFile = this.createPointFile("New Point File");
      if (!pointFile) return;
    }
    const newPoint =
      point ||
      new Point({
        pointNumber: "",
        x: "",
        y: "",
        elevation: "",
        code: "",
        description: "",
      });
    pointFile.points.push(newPoint);
    this.saveProjects();
    this.updateAdjustmentDeltas(pointFile);
    this.renderPointsTable();
  }

  isPointModified(pointFile, index) {
    const current = pointFile.points[index];
    const original = pointFile.originalPoints[index];
    if (!current) return false;
    if (!original) return this.hasPointContent(current);
    return (
      (current.pointNumber || "") !== (original.pointNumber || "") ||
      (current.x || "") !== (original.x || "") ||
      (current.y || "") !== (original.y || "") ||
      (current.elevation || "") !== (original.elevation || "") ||
      (current.code || "") !== (original.code || "") ||
      (current.description || "") !== (original.description || "")
    );
  }

  hasPointContent(point) {
    return [
      point.pointNumber,
      point.x,
      point.y,
      point.elevation,
      point.code,
      point.description,
    ].some((v) => (v || "").toString().trim() !== "");
  }

  revertPointRow(index) {
    const pointFile = this.getActivePointFile();
    if (!pointFile) return;
    const original = pointFile.originalPoints[index];
    if (!original) {
      this.removePointRow(index);
      return;
    }
    pointFile.points[index] = Point.fromObject(original);
    this.saveProjects();
    this.updateAdjustmentDeltas(pointFile);
    this.renderPointsTable();
  }

  createPointFile(nameInput = null) {
    const project = this.getCurrentProject();
    if (!project) {
      alert("Create or select a project first");
      return null;
    }
    const name =
      nameInput || prompt("Name this point file", "New Points") || "New Points";
    const pointFiles = this.ensureProjectPointFiles(project);
    const pointFile = new PointFile({
      name: this.getUniquePointFileName(name, pointFiles),
    });
    pointFile.resetOriginals();
    pointFiles.push(pointFile);
    project.activePointFileId = pointFile.id;
    this.saveProjects();
    this.renderPointsTable();
    return pointFile;
  }

  renameActivePointFile() {
    const project = this.getCurrentProject();
    const pointFile = this.getActivePointFile();
    if (!project || !pointFile) {
      alert("No point file selected to rename.");
      return;
    }

    const currentName = pointFile.name || "Points";
    const newName = prompt("Rename this point file", currentName);
    if (!newName) return;

    const pointFiles = this.ensureProjectPointFiles(project);
    pointFile.name = this.getUniquePointFileName(newName, pointFiles, pointFile.id);
    this.saveProjects();
    this.renderPointsTable();
  }

  createPointFileFromPoints(name, points = []) {
    const project = this.getCurrentProject();
    if (!project) {
      alert("Create or select a project first");
      return null;
    }

    const pointFiles = this.ensureProjectPointFiles(project);
    const finalName = this.getUniquePointFileName(name || "Generated Points", pointFiles);
    const pointFile = new PointFile({
      name: finalName,
      points,
    });
    pointFile.resetOriginals();
    pointFiles.push(pointFile);
    project.activePointFileId = pointFile.id;
    this.saveProjects();
    this.renderPointsTable();
    return pointFile;
  }

  getUniquePointFileName(desiredName, pointFiles = [], currentId = null) {
    const base = desiredName.trim() || "Points";
    const existingNames = pointFiles
      .filter((pf) => !currentId || pf.id !== currentId)
      .map((pf) => pf.name.toLowerCase());
    if (!existingNames.includes(base.toLowerCase())) return base;
    let counter = 2;
    let candidate = `${base} (${counter})`;
    while (existingNames.includes(candidate.toLowerCase())) {
      counter += 1;
      candidate = `${base} (${counter})`;
    }
    return candidate;
  }

  downloadActivePointFile() {
    const pointFile = this.getActivePointFile();
    if (!pointFile) {
      alert("No point file to download");
      return;
    }
    const useRaw = confirm(
      "Download raw coordinates (unadjusted)? Click Cancel for adjusted output."
    );
    const sourcePoints = useRaw ? pointFile.originalPoints : pointFile.points;
    const header = `point number,x (or lat),y (or lon),elevation,code,description (${useRaw ? "RAW" : "ADJUSTED"})`;
    const rows = sourcePoints.map((pt) => {
      const cells = [
        pt.pointNumber,
        pt.x,
        pt.y,
        pt.elevation,
        pt.code,
        pt.description,
      ];
      return cells
        .map((c) => {
          const value = (c ?? "").toString();
          return value.includes(",") ? `"${value}"` : value;
        })
        .join(",");
    });
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (pointFile.name || "points").replace(/[^\w\-]+/g, "_");
    a.href = url;
    a.download = `${safeName || "points"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  renderAdjustmentMeta(pointFile) {
    if (!this.elements.adjustmentSummary) return;
    const meta = pointFile.adjustmentMeta || {};
    const statusParts = [];
    if (meta.algorithm) statusParts.push(`Algorithm: ${meta.algorithm}`);
    if (meta.lastAdjustedAt)
      statusParts.push(
        `Captured ${new Date(meta.lastAdjustedAt).toLocaleString()}`
      );
    if (meta.notes) statusParts.push(`Notes: ${meta.notes}`);

    this.elements.adjustmentSummary.textContent =
      statusParts.join(" • ") || "No adjustment record captured.";
  }

  updateAdjustmentDeltas(pointFile) {
    if (!pointFile) return;
    const deltas = pointFile.points.map((pt, idx) => {
      const raw = pointFile.originalPoints[idx] || {};
      const dx = this.formatDelta(pt.x, raw.x);
      const dy = this.formatDelta(pt.y, raw.y);
      const dz = this.formatDelta(pt.elevation, raw.elevation);
      return { pointNumber: pt.pointNumber || "", dx, dy, dz };
    });
    pointFile.adjustmentMeta.deltas = deltas;
  }

  getDeltaLookup(pointFile) {
    const deltas = pointFile?.adjustmentMeta?.deltas || [];
    const lookup = {};
    deltas.forEach((delta, idx) => {
      lookup[idx] = delta;
    });
    return lookup;
  }

  formatDelta(adjusted, raw) {
    const a = Number.parseFloat(adjusted ?? "");
    const r = Number.parseFloat(raw ?? "");
    if (!Number.isFinite(a) || !Number.isFinite(r)) return "";
    const diff = a - r;
    return Math.abs(diff) < 1e-9 ? "0.0000" : diff.toFixed(4);
  }
}
