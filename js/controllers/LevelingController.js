import LevelRun from "../models/LevelRun.js";

export default class LevelingController {
  constructor({
    elements = {},
    getCurrentProject,
    saveProjects,
    getProjectName,
    getProfessionalProfile,
  }) {
    this.elements = elements;
    this.getCurrentProject = getCurrentProject;
    this.saveProjects = saveProjects;
    this.getProjectName = getProjectName;
    this.getProfessionalProfile = getProfessionalProfile;
    this.currentLevelRunId = null;

    this.bindEvents();
  }

  bindEvents() {
    this.elements.levelRunSelect?.addEventListener("change", (e) => {
      this.currentLevelRunId = e.target.value || null;
      this.renderLevelRuns();
    });

    this.elements.newLevelRunButton?.addEventListener("click", () =>
      this.createLevelRun()
    );

    [
      this.elements.levelRunName,
      this.elements.levelStartPoint,
      this.elements.levelStartElevation,
      this.elements.levelClosingPoint,
      this.elements.levelClosingElevation,
    ].forEach((el) => {
      el?.addEventListener("input", () => this.updateLevelRunMeta());
    });

    this.elements.addLevelEntryButton?.addEventListener("click", () =>
      this.addLevelEntry()
    );

    this.elements.levelEntriesTableBody?.addEventListener("input", (evt) =>
      this.handleLevelEntryInput(evt)
    );

    this.elements.levelEntriesTableBody?.addEventListener("click", (evt) =>
      this.handleLevelEntryClick(evt)
    );

    this.elements.exportLevelRunButton?.addEventListener("click", () =>
      this.exportLevelRun()
    );
  }

  onProjectChanged() {
    this.currentLevelRunId = null;
    this.renderLevelRuns();
  }

  renderLevelRuns() {
    if (!this.elements.levelRunSelect) return;
    const select = this.elements.levelRunSelect;
    const project = this.getCurrentProject?.();

    if (!project) {
      select.innerHTML = "";
      select.disabled = true;
      this.currentLevelRunId = null;
      this.populateLevelRunForm(null);
      this.renderLevelEntries();
      return;
    }

    project.levelRuns = project.levelRuns || [];
    if (!project.levelRuns.length) {
      this.createLevelRun();
      return;
    }

    if (
      !this.currentLevelRunId ||
      !project.levelRuns.some((run) => run.id === this.currentLevelRunId)
    ) {
      this.currentLevelRunId = project.levelRuns[0]?.id || null;
    }

    select.disabled = false;
    select.innerHTML = "";
    project.levelRuns.forEach((run) => {
      const opt = document.createElement("option");
      opt.value = run.id;
      opt.textContent = run.name || "Untitled run";
      if (run.id === this.currentLevelRunId) opt.selected = true;
      select.appendChild(opt);
    });

    const currentRun = this.getCurrentLevelRun();
    this.populateLevelRunForm(currentRun);
    this.renderLevelEntries();
  }

  populateLevelRunForm(run) {
    const fields = [
      [this.elements.levelRunName, run?.name || ""],
      [this.elements.levelStartPoint, run?.startPoint || ""],
      [this.elements.levelStartElevation, run?.startElevation || ""],
      [this.elements.levelClosingPoint, run?.closingPoint || ""],
      [this.elements.levelClosingElevation, run?.closingElevation || ""],
    ];

    fields.forEach(([el, value]) => {
      if (el) el.value = value;
    });
  }

  getCurrentLevelRun() {
    const project = this.getCurrentProject?.();
    if (!project) return null;
    return project.levelRuns?.find((run) => run.id === this.currentLevelRunId);
  }

  createLevelRun() {
    const project = this.getCurrentProject?.();
    if (!project) return;
    project.levelRuns = project.levelRuns || [];
    const run = new LevelRun({
      name: `Level Run ${project.levelRuns.length + 1}`,
      entries: [],
    });
    project.levelRuns.push(run);
    this.currentLevelRunId = run.id;
    this.saveProjects?.();
    this.renderLevelRuns();
  }

  updateLevelRunMeta() {
    const run = this.getCurrentLevelRun();
    if (!run) return;
    run.name = this.elements.levelRunName?.value || "";
    run.startPoint = this.elements.levelStartPoint?.value || "";
    run.startElevation = this.elements.levelStartElevation?.value || "";
    run.closingPoint = this.elements.levelClosingPoint?.value || "";
    run.closingElevation = this.elements.levelClosingElevation?.value || "";
    this.saveProjects?.();
    this.renderLevelRuns();
  }

  addLevelEntry() {
    const run = this.getCurrentLevelRun();
    if (!run) {
      alert("Create a level run first.");
      return;
    }
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    run.entries.push({ id, point: "", backsight: "", foresight: "", notes: "" });
    this.saveProjects?.();
    this.renderLevelEntries();
  }

  handleLevelEntryInput(evt) {
    const row = evt.target.closest("tr[data-entry-id]");
    if (!row) return;
    const run = this.getCurrentLevelRun();
    if (!run) return;
    const entryId = row.getAttribute("data-entry-id");
    const entry = run.entries.find((item) => item.id === entryId);
    if (!entry) return;
    const field = evt.target.name;
    if (!field) return;
    entry[field] = evt.target.value;
    this.saveProjects?.();
    this.updateLevelEntryDisplays();
  }

  handleLevelEntryClick(evt) {
    const deleteBtn = evt.target.closest("button[data-action='delete-level-entry']");
    if (!deleteBtn) return;
    const row = deleteBtn.closest("tr[data-entry-id]");
    if (!row) return;
    const entryId = row.getAttribute("data-entry-id");
    const run = this.getCurrentLevelRun();
    if (!run) return;
    run.entries = run.entries.filter((entry) => entry.id !== entryId);
    this.saveProjects?.();
    this.renderLevelEntries();
  }

  computeLevelingRows(run) {
    if (!run) return {};
    const startElevation = parseFloat(run.startElevation);
    const closingElevation = parseFloat(run.closingElevation);
    const hasStart = Number.isFinite(startElevation);
    const hasClosing = Number.isFinite(closingElevation);
    let currentElevation = hasStart ? startElevation : null;
    let totalBs = 0;
    let totalFs = 0;
    const rows = (run?.entries || []).map((entry, idx, all) => {
      const bsVal = parseFloat(entry.backsight);
      const fsVal = parseFloat(entry.foresight);
      const bs = Number.isFinite(bsVal) ? bsVal : 0;
      const fs = Number.isFinite(fsVal) ? fsVal : 0;
      totalBs += bs;
      totalFs += fs;
      const riseFall =
        Number.isFinite(bsVal) || Number.isFinite(fsVal) ? bs - fs : null;
      if (currentElevation !== null && riseFall !== null) {
        currentElevation += riseFall;
      }
      const elevation = currentElevation;
      const closure = hasClosing && elevation !== null ? elevation - closingElevation : null;
      const displayPoint = this.getDisplayPointLabel({
        run,
        entry,
        index: idx,
        total: all.length,
      });
      return {
        ...entry,
        displayPoint,
        backsightNumber: Number.isFinite(bsVal) ? bsVal : null,
        foresightNumber: Number.isFinite(fsVal) ? fsVal : null,
        riseFall,
        elevation,
        sumBs: totalBs,
        sumFs: totalFs,
        closure,
      };
    });

    const misclosure =
      hasClosing && currentElevation !== null
        ? currentElevation - closingElevation
        : null;

    return {
      rows,
      totalBs,
      totalFs,
      misclosure,
      hasStart,
      hasClosing,
      closingElevation,
    };
  }

  renderLevelEntries() {
    if (!this.elements.levelEntriesTableBody) return;
    const run = this.getCurrentLevelRun();
    if (!run) {
      this.elements.levelEntriesTableBody.innerHTML = "";
      if (this.elements.levelTotalBs) this.elements.levelTotalBs.textContent = "0.000";
      if (this.elements.levelTotalFs) this.elements.levelTotalFs.textContent = "0.000";
      if (this.elements.levelMisclosure) this.elements.levelMisclosure.textContent = "—";
      if (this.elements.levelClosureNote) this.elements.levelClosureNote.textContent = "";
      return;
    }

    const stats = this.computeLevelingRows(run);
    const rowsHtml = (stats.rows || []).map((entry) => {
      const noteInput = `<input name="notes" class="note-input" type="text" value="${this.escapeHtml(
        entry.notes || ""
      )}" placeholder="Description / note" />`;

      return `<tr class="level-row" data-entry-id="${entry.id}">
        <td class="computed point-label">${this.escapeHtml(entry.displayPoint || "")}</td>
        <td><input name="backsight" type="number" step="0.0001" value="${entry.backsight || ""}" /></td>
        <td><input name="foresight" type="number" step="0.0001" value="${entry.foresight || ""}" /></td>
        <td class="notes-cell notes-desktop">${noteInput}</td>
        <td class="computed computed-desktop">${this.formatLevelNumber(entry.riseFall)}</td>
        <td class="computed computed-desktop">${this.formatLevelNumber(entry.elevation)}</td>
        <td class="computed computed-desktop">${this.formatLevelNumber(entry.sumBs)}</td>
        <td class="computed computed-desktop">${this.formatLevelNumber(entry.sumFs)}</td>
        <td class="computed computed-desktop">${this.formatLevelNumber(entry.closure)}</td>
        <td class="row-actions"><button type="button" data-action="delete-level-entry" class="danger">×</button></td>
      </tr>
      <tr class="level-row note-mobile-row" data-entry-id="${entry.id}">
        <td colspan="10">
          <label class="note-mobile-label">Description / note</label>
          ${noteInput}
        </td>
      </tr>
      <tr class="level-row computed-mobile-row" data-entry-id="${entry.id}">
        <td colspan="10">
          <div class="computed-mobile-grid">
            <div>
              <span class="computed-mobile-label">Rise / Fall</span>
              <span class="computed computed-mobile-value" data-field="riseFall">${this.formatLevelNumber(entry.riseFall)}</span>
            </div>
            <div>
              <span class="computed-mobile-label">Elevation</span>
              <span class="computed computed-mobile-value" data-field="elevation">${this.formatLevelNumber(entry.elevation)}</span>
            </div>
            <div>
              <span class="computed-mobile-label">ΣBS</span>
              <span class="computed computed-mobile-value" data-field="sumBs">${this.formatLevelNumber(entry.sumBs)}</span>
            </div>
            <div>
              <span class="computed-mobile-label">ΣFS</span>
              <span class="computed computed-mobile-value" data-field="sumFs">${this.formatLevelNumber(entry.sumFs)}</span>
            </div>
            <div>
              <span class="computed-mobile-label">Closure</span>
              <span class="computed computed-mobile-value" data-field="closure">${this.formatLevelNumber(entry.closure)}</span>
            </div>
          </div>
        </td>
      </tr>`;
    });

    this.elements.levelEntriesTableBody.innerHTML = rowsHtml.join("");
    if (this.elements.levelTotalBs)
      this.elements.levelTotalBs.textContent = this.formatLevelNumber(stats.totalBs);
    if (this.elements.levelTotalFs)
      this.elements.levelTotalFs.textContent = this.formatLevelNumber(stats.totalFs);
    if (this.elements.levelMisclosure)
      this.elements.levelMisclosure.textContent = this.formatLevelNumber(stats.misclosure);
    if (this.elements.levelClosureNote) {
      if (!stats.hasClosing) {
        this.elements.levelClosureNote.textContent = "Add a closing elevation to see error.";
      } else {
        this.elements.levelClosureNote.textContent = "Closing error (computed).";
      }
    }
  }

  updateLevelEntryDisplays() {
    if (!this.elements.levelEntriesTableBody) return;
    const run = this.getCurrentLevelRun();
    if (!run) return;
    const stats = this.computeLevelingRows(run);
    stats.rows?.forEach((entryStats) => {
      const rowEls = this.elements.levelEntriesTableBody.querySelectorAll(
        `tr[data-entry-id='${entryStats.id}']`
      );

      rowEls.forEach((rowEl) => {
        const pointLabel = rowEl.querySelector(".point-label");
        if (pointLabel) pointLabel.textContent = entryStats.displayPoint || "";

        const noteInputs = rowEl.querySelectorAll("input[name='notes']");
        noteInputs.forEach((input) => {
          if (document.activeElement !== input) input.value = entryStats.notes || "";
        });

        const bsInputs = rowEl.querySelectorAll("input[name='backsight']");
        bsInputs.forEach((input) => {
          if (document.activeElement !== input)
            input.value = entryStats.backsight || "";
        });

        const fsInputs = rowEl.querySelectorAll("input[name='foresight']");
        fsInputs.forEach((input) => {
          if (document.activeElement !== input)
            input.value = entryStats.foresight || "";
        });

        const computedCells = rowEl.querySelectorAll("td.computed");
        const [riseFallEl, elevationEl, sumBsEl, sumFsEl, closureEl] = computedCells;
        if (riseFallEl)
          riseFallEl.textContent = this.formatLevelNumber(entryStats.riseFall);
        if (elevationEl)
          elevationEl.textContent = this.formatLevelNumber(entryStats.elevation);
        if (sumBsEl) sumBsEl.textContent = this.formatLevelNumber(entryStats.sumBs);
        if (sumFsEl) sumFsEl.textContent = this.formatLevelNumber(entryStats.sumFs);
        if (closureEl)
          closureEl.textContent = this.formatLevelNumber(entryStats.closure);

        const mobileComputed = rowEl.querySelectorAll(
          ".computed-mobile-value"
        );
        mobileComputed.forEach((el) => {
          const field = el.dataset.field;
          const value =
            field === "riseFall"
              ? entryStats.riseFall
              : field === "elevation"
                ? entryStats.elevation
                : field === "sumBs"
                  ? entryStats.sumBs
                  : field === "sumFs"
                    ? entryStats.sumFs
                    : field === "closure"
                      ? entryStats.closure
                      : null;

          el.textContent = this.formatLevelNumber(value);
        });
      });
    });

    if (this.elements.levelTotalBs)
      this.elements.levelTotalBs.textContent = this.formatLevelNumber(stats.totalBs);
    if (this.elements.levelTotalFs)
      this.elements.levelTotalFs.textContent = this.formatLevelNumber(stats.totalFs);
    if (this.elements.levelMisclosure)
      this.elements.levelMisclosure.textContent = this.formatLevelNumber(stats.misclosure);
    if (this.elements.levelClosureNote) {
      if (!stats.hasClosing) {
        this.elements.levelClosureNote.textContent = "Add a closing elevation to see error.";
      } else {
        this.elements.levelClosureNote.textContent = "Closing error (computed).";
      }
    }
  }

  getDisplayPointLabel({ run, entry, index, total }) {
    const defaultLabel = `Point ${index + 1}`;
    if (index === 0 && run.startPoint) return run.startPoint;
    if (index === total - 1 && run.closingPoint) return run.closingPoint;
    return entry?.point || defaultLabel;
  }

  exportLevelRun() {
    const run = this.getCurrentLevelRun();
    if (!run) {
      alert("Create a level run first.");
      return;
    }
    const projectName = this.getProjectName?.() || "Project";
    const stats = this.computeLevelingRows(run);
    const rows = stats.rows
      .map(
        (row, idx) =>
          `<tr>
        <td>${idx + 1}</td>
        <td>${this.escapeHtml(row.displayPoint || "")}</td>
        <td>${this.formatLevelNumber(row.backsightNumber)}</td>
        <td>${this.formatLevelNumber(row.foresightNumber)}</td>
        <td>${this.escapeHtml(row.notes || "")}</td>
        <td>${this.formatLevelNumber(row.riseFall)}</td>
        <td>${this.formatLevelNumber(row.elevation)}</td>
        <td>${this.formatLevelNumber(row.sumBs)}</td>
        <td>${this.formatLevelNumber(row.sumFs)}</td>
        <td>${this.formatLevelNumber(row.closure)}</td>
      </tr>`
      )
      .join("");

    const printable = this.buildLevelRunHtml({ run, stats, rows, projectName });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up blocked. Please allow pop-ups to export.");
      return;
    }
    printWindow.document.write(printable);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  buildLevelRunHtml({ run, stats, rows, projectName }) {
    const profile = this.getProfessionalProfile?.() || {};
    const contact = [profile.contactPhone, profile.contactEmail]
      .filter(Boolean)
      .join(" | ");

    return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Level Run - ${this.escapeHtml(run.name || "Untitled")}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin-bottom: 6px; }
          h2 { margin: 16px 0 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; }
          .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 14px; margin-top: 10px; }
          .meta div { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; }
          .signature-row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 12px; align-items: stretch; }
          .sig-box { border: 1px dashed #cbd5e1; padding: 10px; min-height: 90px; }
          .seal-box { border: 2px solid #0f172a; min-height: 110px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
          .muted { color: #475569; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Level Run: ${this.escapeHtml(run.name || "Untitled")}</h1>
        <div class="meta">
          <div><strong>Project</strong><br />${this.escapeHtml(projectName)}</div>
          <div><strong>Start</strong><br />${this.escapeHtml(
            run.startPoint || ""
          )} @ ${this.formatLevelNumber(parseFloat(run.startElevation))}</div>
          <div><strong>Closing</strong><br />${this.escapeHtml(
            run.closingPoint || ""
          )} @ ${this.formatLevelNumber(
      parseFloat(run.closingElevation)
    )}</div>
          <div><strong>Misclosure</strong><br />${this.formatLevelNumber(
            stats.misclosure
          )}</div>
          <div><strong>Surveyor</strong><br />${this.escapeHtml(
            profile.surveyorName || "Not provided"
          )}</div>
          <div><strong>Idaho PLS #</strong><br />${this.escapeHtml(
            profile.licenseNumber || "Not provided"
          )}</div>
          <div><strong>Firm</strong><br />${this.escapeHtml(
            profile.firmName || "Not provided"
          )}</div>
          <div><strong>Contact</strong><br />${this.escapeHtml(
            contact || "Not provided"
          )}</div>
          <div><strong>County</strong><br />${this.escapeHtml(
            profile.county || "Not provided"
          )}</div>
        </div>

        <div class="signature-row">
          <div class="sig-box">
            <strong>Seal / Signature</strong>
            <div class="muted" style="margin-top:6px;">Idaho-ready acknowledgement for level notes.</div>
            <div style="margin-top:12px;">
              <div>Signature: __________________________</div>
              <div style="margin-top:6px;">Signed date/time: __________________</div>
            </div>
          </div>
          <div class="seal-box">Place Surveyor Seal</div>
        </div>

        <h2>Level book</h2>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Point</th><th>BS</th><th>FS</th><th>Notes</th><th>Rise/Fall</th><th>Elevation</th><th>ΣBS</th><th>ΣFS</th><th>Closure</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;
  }

  formatLevelNumber(value) {
    return Number.isFinite(value) ? value.toFixed(3) : "—";
  }

  escapeHtml(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
