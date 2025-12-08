import MiniAppController from "./MiniAppController.js";

export default class QcAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.elements = options.elements || {};
    this.getCurrentProjectId = options.getCurrentProjectId;
    this.computeQualityResults = options.computeQualityResults;
    this.formatLevelNumber = options.formatLevelNumber;
    this.formatRatio = options.formatRatio;
    this.formatDegrees = options.formatDegrees;
    this.switchTab = options.switchTab;
    this.loadRecord = options.loadRecord;
    this.getLevelingController = options.getLevelingController;
    this.onResultsComputed = options.onResultsComputed;

    this.bindEvents();
  }

  handleActivate() {
    super.handleActivate();
    this.renderQualityDashboard();
  }

  bindEvents() {
    this.elements.qcTraverseList?.addEventListener("click", (evt) =>
      this.handleQcListClick(evt)
    );
    this.elements.qcLevelList?.addEventListener("click", (evt) =>
      this.handleQcListClick(evt)
    );
  }

  renderQualityDashboard() {
    const statusEl = this.elements.qcOverallStatus;
    if (!statusEl || typeof this.computeQualityResults !== "function") return;

    const results = this.computeQualityResults();
    if (typeof this.onResultsComputed === "function") {
      this.onResultsComputed(results);
    }

    statusEl.classList.remove("qc-pass", "qc-fail", "qc-warning");
    if (results.overallClass) statusEl.classList.add(results.overallClass);
    statusEl.textContent = results.overallLabel;

    const summaryEl = this.elements.qcSummary;
    if (summaryEl) {
      const currentProjectId =
        typeof this.getCurrentProjectId === "function"
          ? this.getCurrentProjectId()
          : null;
      if (!currentProjectId) {
        summaryEl.textContent = "Select a project to view QC results.";
      } else {
        const traversePass = results.traverses.filter(
          (t) => t.status === "pass"
        ).length;
        const levelPass = results.levels.filter((l) => l.status === "pass").length;
        summaryEl.innerHTML = `
          <div class="summary-chip">Traverses passing: ${traversePass} / ${
          results.traverses.length
        }</div>
          <div class="summary-chip">Level loops passing: ${levelPass} / ${
          results.levels.length
        }</div>
          <div class="summary-chip">Failed items: ${
          results.failedTraverseIds.length +
          results.levels.filter((l) => l.status === "fail").length
        }</div>`;
      }
    }

    this.renderTraverseQcList(results);
    this.renderLevelQcList(results);
  }

  renderTraverseQcList(results) {
    const list = this.elements.qcTraverseList;
    if (!list) return;
    list.innerHTML = "";

    const currentProjectId =
      typeof this.getCurrentProjectId === "function"
        ? this.getCurrentProjectId()
        : null;

    if (!currentProjectId) {
      list.textContent = "Select a project to review traverses.";
      return;
    }
    if (!results.traverses.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Create a record to evaluate traverse closure.";
      list.appendChild(empty);
      return;
    }

    results.traverses.forEach((item) => {
      const row = document.createElement("div");
      row.className = "qc-item";
      if (item.status === "pass") row.classList.add("qc-pass");
      if (item.status === "fail") row.classList.add("qc-fail");
      if (item.status === "warn") row.classList.add("qc-warning");

      const header = document.createElement("div");
      header.className = "qc-item-header";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const chip = document.createElement("span");
      chip.className = "status-chip";
      chip.textContent = item.message;
      header.append(name, chip);

      const meta = document.createElement("div");
      meta.className = "qc-meta";
      meta.innerHTML = `Linear misclosure: ${this.formatLevelNumber(
        item.linearMisclosure
      )} (ratio ${this.formatRatio(
        item.linearMisclosure,
        item.totalLength
      )}) · Angular: ${this.formatDegrees(item.angularMisclosure)}`;

      const actions = document.createElement("div");
      actions.className = "qc-item-actions";
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "Open traverse";
      open.dataset.action = "open-traverse";
      open.dataset.recordId = item.id;
      actions.appendChild(open);

      row.append(header, meta, actions);
      list.appendChild(row);
    });
  }

  renderLevelQcList(results) {
    const list = this.elements.qcLevelList;
    if (!list) return;
    list.innerHTML = "";

    const currentProjectId =
      typeof this.getCurrentProjectId === "function"
        ? this.getCurrentProjectId()
        : null;

    if (!currentProjectId) {
      list.textContent = "Select a project to review level loops.";
      return;
    }
    if (!results.levels.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Add level runs to evaluate misclosure.";
      list.appendChild(empty);
      return;
    }

    results.levels.forEach((item) => {
      const row = document.createElement("div");
      row.className = "qc-item";
      if (item.status === "pass") row.classList.add("qc-pass");
      if (item.status === "fail") row.classList.add("qc-fail");
      if (item.status === "warn") row.classList.add("qc-warning");

      const header = document.createElement("div");
      header.className = "qc-item-header";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const chip = document.createElement("span");
      chip.className = "status-chip";
      chip.textContent = item.message;
      header.append(name, chip);

      const meta = document.createElement("div");
      meta.className = "qc-meta";
      meta.textContent = `Misclosure: ${this.formatLevelNumber(
        item.misclosure
      )} (allowed ${this.formatLevelNumber(item.allowed)})`;

      const actions = document.createElement("div");
      actions.className = "qc-item-actions";
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "Open level run";
      open.dataset.action = "open-level";
      open.dataset.levelId = item.id;
      actions.appendChild(open);

      row.append(header, meta, actions);
      list.appendChild(row);
    });
  }

  handleQcListClick(evt) {
    const traverseBtn = evt.target.closest("button[data-action='open-traverse']");
    if (traverseBtn && traverseBtn.dataset.recordId) {
      this.switchTab?.("traverseSection");
      this.loadRecord?.(traverseBtn.dataset.recordId);
      return;
    }

    const levelBtn = evt.target.closest("button[data-action='open-level']");
    if (levelBtn && levelBtn.dataset.levelId) {
      this.switchTab?.("levelingSection");
      const levelingController =
        typeof this.getLevelingController === "function"
          ? this.getLevelingController()
          : null;
      if (levelingController) {
        levelingController.currentLevelRunId = levelBtn.dataset.levelId;
        levelingController.renderLevelRuns();
      }
    }
  }
}
