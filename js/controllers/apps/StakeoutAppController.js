import StakeoutEntry from "../../models/StakeoutEntry.js";
import MiniAppController from "./MiniAppController.js";
import { buildAnnotatedPhotoHtml } from "../../services/PhotoAnnotationRenderer.js";

export default class StakeoutAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.elements = options.elements || {};
    this.getProjects = options.getProjects || (() => ({}));
    this.getCurrentProjectId = options.getCurrentProjectId || (() => null);
    this.getActiveTeamMembers = options.getActiveTeamMembers || (() => []);
    this.getEquipmentSettings = options.getEquipmentSettings || (() => []);
    this.getProjectEvidence = options.getProjectEvidence || (() => []);
    this.getQualityResults = options.getQualityResults || (() => ({}));
    this.buildEvidenceTitle = options.buildEvidenceTitle || ((entry) => entry?.title || "Evidence");
    this.escapeHtml = options.escapeHtml || ((text) => text ?? "");
    this.saveProjects = options.saveProjects || (() => {});
    this.buildStatusChip = options.buildStatusChip || (() => "");

    this.editingStakeoutId = null;
    this.bindEvents();
  }

  get currentProject() {
    const id = this.getCurrentProjectId();
    return this.getProjects?.()[id] || null;
  }

  bindEvents() {
    const fields = [
      this.elements.stakeoutDatetime,
      this.elements.stakeoutMonumentType,
      this.elements.stakeoutMonumentMaterial,
      this.elements.stakeoutWitnessMarks,
      this.elements.stakeoutDigNotes,
      this.elements.stakeoutCrewMembers,
      this.elements.stakeoutEquipmentUsed,
      this.elements.stakeoutTraverseSelect,
      this.elements.stakeoutEvidenceSelect,
      this.elements.stakeoutControlPoints,
    ];

    fields.forEach((el) => {
      if (!el) return;
      const handler = () => this.updateSaveState();
      el.addEventListener("input", handler);
      if (el.tagName === "SELECT") {
        el.addEventListener("change", handler);
      }
    });

    this.elements.saveStakeoutButton?.addEventListener("click", () =>
      this.saveStakeoutEntry()
    );

    this.elements.resetStakeoutButton?.addEventListener("click", () =>
      this.resetForm()
    );
  }

  handleActivate() {
    super.handleActivate();
    this.refreshOptions();
    this.renderStakeoutList();
    this.updateSaveState();
  }

  refreshOptions() {
    this.renderCrewOptions();
    this.renderEquipmentOptions();
    this.renderTraverseOptions();
    this.renderEvidenceOptions();
  }

  renderCrewOptions() {
    const select = this.elements.stakeoutCrewMembers;
    if (!select) return;
    const members = this.getActiveTeamMembers?.() || [];
    select.innerHTML = "";
    members.forEach((member) => {
      const opt = document.createElement("option");
      opt.value = member.name || member.id || member;
      opt.textContent = member.name || member;
      select.appendChild(opt);
    });
  }

  renderEquipmentOptions() {
    const select = this.elements.stakeoutEquipmentUsed;
    if (!select) return;
    const equipment = this.getEquipmentSettings?.() || [];
    select.innerHTML = "";
    equipment
      .filter((item) => !item.archived)
      .forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.name || item.id;
        opt.textContent = item.name || item.id;
        select.appendChild(opt);
      });
  }

  renderTraverseOptions() {
    const select = this.elements.stakeoutTraverseSelect;
    if (!select) return;
    select.innerHTML = "";
    const project = this.currentProject;
    const records = project?.records || {};
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select controlling traverse (optional)";
    select.appendChild(placeholder);

    Object.entries(records).forEach(([id, record]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = record.name || `Record ${id}`;
      select.appendChild(opt);
    });
  }

  renderEvidenceOptions() {
    const select = this.elements.stakeoutEvidenceSelect;
    if (!select) return;
    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Link to evidence (optional)";
    select.appendChild(placeholder);

    const evidence = this.getProjectEvidence?.() || [];
    evidence.forEach((entry) => {
      const opt = document.createElement("option");
      opt.value = entry.id;
      opt.textContent =
        entry.title || this.buildEvidenceTitle?.(entry) || `Evidence ${entry.id}`;
      select.appendChild(opt);
    });
  }

  updateSaveState() {
    if (!this.elements.saveStakeoutButton) return;
    const requiredFields = [
      this.elements.stakeoutDatetime,
      this.elements.stakeoutMonumentType,
      this.elements.stakeoutMonumentMaterial,
    ];
    const canSave =
      !!this.currentProject &&
      requiredFields.every((el) => el && el.value.trim().length > 0);
    this.elements.saveStakeoutButton.disabled = !canSave;
  }

  resetForm() {
    [
      this.elements.stakeoutDatetime,
      this.elements.stakeoutMonumentType,
      this.elements.stakeoutMonumentMaterial,
      this.elements.stakeoutWitnessMarks,
      this.elements.stakeoutDigNotes,
      this.elements.stakeoutTraverseSelect,
      this.elements.stakeoutEvidenceSelect,
      this.elements.stakeoutControlPoints,
    ].forEach((el) => {
      if (el) el.value = "";
    });

    [this.elements.stakeoutCrewMembers, this.elements.stakeoutEquipmentUsed].forEach(
      (select) => {
        if (!select) return;
        Array.from(select.options).forEach((opt) => (opt.selected = false));
      }
    );

    if (this.elements.stakeoutFormStatus) {
      this.elements.stakeoutFormStatus.textContent = "";
    }

    if (this.elements.saveStakeoutButton) {
      this.elements.saveStakeoutButton.textContent = "Save stakeout entry";
    }

    this.editingStakeoutId = null;
    this.updateSaveState();
  }

  saveStakeoutEntry() {
    if (!this.currentProject) return;
    const crewMembers = this.getSelectValues(this.elements.stakeoutCrewMembers);
    const equipmentUsed = this.getSelectValues(
      this.elements.stakeoutEquipmentUsed
    );
    const now = new Date().toISOString();

    const payload = new StakeoutEntry({
      id: this.editingStakeoutId || undefined,
      occurredAt: this.elements.stakeoutDatetime?.value || "",
      monumentType: this.elements.stakeoutMonumentType?.value || "",
      monumentMaterial: this.elements.stakeoutMonumentMaterial?.value || "",
      witnessMarks: this.elements.stakeoutWitnessMarks?.value || "",
      digNotes: this.elements.stakeoutDigNotes?.value || "",
      crewMembers,
      equipmentUsed,
      traverseId: this.elements.stakeoutTraverseSelect?.value || "",
      evidenceId: this.elements.stakeoutEvidenceSelect?.value || "",
      controlPoints: this.elements.stakeoutControlPoints?.value || "",
      createdAt: this.editingStakeoutId
        ? this.getEditingEntry()?.createdAt
        : now,
      updatedAt: now,
    });

    const list = this.currentProject.stakeoutEntries || [];
    const existingIdx = list.findIndex((entry) => entry.id === payload.id);
    if (existingIdx >= 0) list[existingIdx] = payload;
    else list.push(payload);

    list.sort((a, b) => (b.occurredAt || "").localeCompare(a.occurredAt || ""));
    this.currentProject.stakeoutEntries = list;
    this.saveProjects();
    this.renderStakeoutList();
    this.resetForm();

    if (this.elements.stakeoutFormStatus) {
      this.elements.stakeoutFormStatus.textContent = "Stakeout saved.";
      setTimeout(() => {
        if (this.elements.stakeoutFormStatus) {
          this.elements.stakeoutFormStatus.textContent = "";
        }
      }, 2500);
    }
  }

  getSelectValues(select) {
    if (!select) return [];
    return Array.from(select.selectedOptions || []).map((opt) => opt.value);
  }

  getEditingEntry() {
    if (!this.currentProject || !this.editingStakeoutId) return null;
    return (
      this.currentProject.stakeoutEntries?.find(
        (entry) => entry.id === this.editingStakeoutId
      ) || null
    );
  }

  startEditing(entryId) {
    const entry =
      this.currentProject?.stakeoutEntries?.find((e) => e.id === entryId) || null;
    if (!entry) return;
    this.editingStakeoutId = entry.id;

    if (this.elements.stakeoutDatetime)
      this.elements.stakeoutDatetime.value = entry.occurredAt || "";
    if (this.elements.stakeoutMonumentType)
      this.elements.stakeoutMonumentType.value = entry.monumentType || "";
    if (this.elements.stakeoutMonumentMaterial)
      this.elements.stakeoutMonumentMaterial.value = entry.monumentMaterial || "";
    if (this.elements.stakeoutWitnessMarks)
      this.elements.stakeoutWitnessMarks.value = entry.witnessMarks || "";
    if (this.elements.stakeoutDigNotes)
      this.elements.stakeoutDigNotes.value = entry.digNotes || "";
    if (this.elements.stakeoutControlPoints)
      this.elements.stakeoutControlPoints.value = entry.controlPoints || "";
    if (this.elements.stakeoutTraverseSelect)
      this.elements.stakeoutTraverseSelect.value = entry.traverseId || "";
    if (this.elements.stakeoutEvidenceSelect)
      this.elements.stakeoutEvidenceSelect.value = entry.evidenceId || "";

    [
      [this.elements.stakeoutCrewMembers, entry.crewMembers],
      [this.elements.stakeoutEquipmentUsed, entry.equipmentUsed],
    ].forEach(([select, values]) => {
      if (!select) return;
      Array.from(select.options).forEach((opt) => {
        opt.selected = values?.includes(opt.value);
      });
    });

    if (this.elements.saveStakeoutButton) {
      this.elements.saveStakeoutButton.textContent = "Update stakeout entry";
    }
    this.updateSaveState();
  }

  deleteStakeoutEntry(entryId) {
    if (!this.currentProject) return;
    this.currentProject.stakeoutEntries = (
      this.currentProject.stakeoutEntries || []
    ).filter((entry) => entry.id !== entryId);
    this.saveProjects();
    this.renderStakeoutList();
    if (this.editingStakeoutId === entryId) {
      this.resetForm();
    }
  }

  renderStakeoutList() {
    const list = this.elements.stakeoutList;
    const summary = this.elements.stakeoutSummary;
    if (!list) return;
    list.innerHTML = "";

    const entries = this.currentProject?.stakeoutEntries || [];
    if (entries.length === 0) {
      list.innerHTML = '<div class="muted">Log stakeout or field notes to see them here.</div>';
      if (summary) summary.textContent = "No stakeout entries yet.";
      return;
    }

    const qcResults = this.getQualityResults?.() || {};
    const failedTraverses = new Set(qcResults.failedTraverseIds || []);

    entries.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "card stakeout-card";

      const header = document.createElement("div");
      header.className = "stakeout-card-header";
      const title = document.createElement("div");
      title.className = "stakeout-title";
      const when = entry.occurredAt
        ? new Date(entry.occurredAt).toLocaleString()
        : "Date/time not set";
      title.innerHTML = `${this.escapeHtml(entry.monumentType || "Monument set")}<div class="stakeout-when">${this.escapeHtml(
        when
      )}</div>`;
      header.appendChild(title);

      const actions = document.createElement("div");
      actions.className = "stakeout-actions";
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => this.startEditing(entry.id));
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => this.deleteStakeoutEntry(entry.id));
      actions.append(editBtn, deleteBtn);
      header.appendChild(actions);

      const details = document.createElement("div");
      details.className = "stakeout-details";
      details.innerHTML = this.buildStakeoutDetails(entry, failedTraverses);

      card.append(header, details);
      list.appendChild(card);
    });

    if (summary) {
      summary.textContent = `${entries.length} stakeout entr${
        entries.length === 1 ? "y" : "ies"
      } logged.`;
    }
  }

  buildStakeoutDetails(entry, failedTraverses) {
    const parts = [];
    const crew = entry.crewMembers?.length
      ? `<span class="label">Crew</span><span class="value">${entry.crewMembers
          .map((name) => this.escapeHtml(name))
          .join(", ")}</span>`
      : "";
    const equipment = entry.equipmentUsed?.length
      ? `<span class="label">Equipment</span><span class="value">${entry.equipmentUsed
          .map((name) => this.escapeHtml(name))
          .join(", ")}</span>`
      : "";
    const traverseLabel = this.getTraverseLabel(entry.traverseId, failedTraverses);
    const evidenceLabel = this.getEvidenceLabel(entry.evidenceId);

    [
      ["Material", entry.monumentMaterial],
      ["Witness marks / ties", entry.witnessMarks],
      ["Dig notes", entry.digNotes],
      ["Control points", entry.controlPoints],
    ].forEach(([label, value]) => {
      if (value) {
        parts.push(
          `<div class="stakeout-row"><span class="label">${label}</span><span class="value">${this.escapeHtml(
            value
          )}</span></div>`
        );
      }
    });

    if (crew)
      parts.push(`<div class="stakeout-row">${crew}</div>`);
    if (equipment)
      parts.push(`<div class="stakeout-row">${equipment}</div>`);
    if (traverseLabel)
      parts.push(
        `<div class="stakeout-row"><span class="label">Traverse</span><span class="value">${traverseLabel}</span></div>`
      );
    if (evidenceLabel)
      parts.push(
        `<div class="stakeout-row"><span class="label">Evidence</span><span class="value">${evidenceLabel}</span></div>`
      );

    const evidencePhoto = this.buildEvidencePhotoPreview(entry.evidenceId);
    if (evidencePhoto)
      parts.push(`<div class="stakeout-row photo-row">${evidencePhoto}</div>`);

    return parts.join("");
  }

  buildEvidencePhotoPreview(evidenceId) {
    if (!evidenceId) return "";
    const evidenceList = this.getProjectEvidence?.(this.getCurrentProjectId()) || [];
    const evidence = evidenceList.find((ev) => ev.id === evidenceId);
    if (!evidence?.photo) return "";

    return buildAnnotatedPhotoHtml({
      photo: evidence.photo,
      annotations: evidence.photoAnnotations,
      metadata: evidence.photoMetadata,
      maxWidth: "320px",
    });
  }

  getTraverseLabel(traverseId, failedTraverses = new Set()) {
    if (!traverseId || !this.currentProject?.records?.[traverseId]) return "";
    const record = this.currentProject.records[traverseId];
    const qcFailed = failedTraverses.has(traverseId);
    const statusChip = qcFailed
      ? this.buildStatusChip?.("Fail")
      : this.buildStatusChip?.("PASS") || "";
    const chipHtml = statusChip?.outerHTML
      ? statusChip.outerHTML
      : typeof statusChip === "string"
      ? statusChip
      : "";
    return `${this.escapeHtml(record.name || "Traverse")}${chipHtml ? ` ${chipHtml}` : ""}`;
  }

  getEvidenceLabel(evidenceId) {
    if (!evidenceId) return "";
    const evidence = (this.getProjectEvidence?.() || []).find(
      (entry) => entry.id === evidenceId
    );
    if (!evidence) return "";
    const title = evidence.title || this.buildEvidenceTitle?.(evidence);
    return this.escapeHtml(title || "Evidence link");
  }
}
