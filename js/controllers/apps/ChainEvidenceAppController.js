import MiniAppController from "./MiniAppController.js";
import { buildAnnotatedPhotoHtml } from "../../services/PhotoAnnotationRenderer.js";

export default class ChainEvidenceAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.elements = options.elements || {};
    this.getCurrentProjectId = options.getCurrentProjectId;
    this.getProjectEvidence = options.getProjectEvidence;
    this.computeQualityResults = options.computeQualityResults;
    this.getLatestQcResults = options.getLatestQcResults;
    this.getResearchDocuments = options.getResearchDocuments;
    this.buildEvidenceTitle = options.buildEvidenceTitle;
    this.buildEvidenceTrs = options.buildEvidenceTrs;
    this.buildStatusChip = options.buildStatusChip;
    this.getCpfCompleteness = options.getCpfCompleteness;
    this.exportCornerFiling = options.exportCornerFiling;
    this.downloadHtml = options.downloadHtml;
    this.escapeHtml = options.escapeHtml;

    this.chainFilters = {
      trs: "",
      cornerType: "",
      cornerStatus: "",
      status: "",
      startDate: "",
      endDate: "",
    };

    this.bindEvents();
  }

  handleActivate() {
    super.handleActivate();
    this.refreshChainEvidence();
  }

  bindEvents() {
    const filterInputs = [
      this.elements.chainTrsFilter,
      this.elements.chainCornerTypeFilter,
      this.elements.chainCornerStatusFilter,
      this.elements.chainStatusFilter,
      this.elements.chainStartDate,
      this.elements.chainEndDate,
    ];

    filterInputs.forEach((el) => {
      const eventName = el?.tagName === "SELECT" ? "change" : "input";
      el?.addEventListener(eventName, () => this.applyChainFiltersFromInputs());
    });

    this.elements.chainApplyFilters?.addEventListener("click", () =>
      this.applyChainFiltersFromInputs()
    );

    this.elements.chainResetFilters?.addEventListener("click", () =>
      this.resetChainFilters()
    );

    this.elements.chainExportAll?.addEventListener("click", () =>
      this.exportChainEvidenceSelection()
    );
  }

  refreshChainEvidence() {
    this.populateChainFilters();
    this.applyChainFiltersFromInputs(false);
    this.renderChainEvidenceList();
  }

  populateChainFilters() {
    const evidence = this.getProjectEvidence?.() || [];
    const types = [
      ...new Set((evidence || []).map((ev) => ev.cornerType).filter(Boolean)),
    ];
    const statuses = [
      ...new Set((evidence || []).map((ev) => ev.cornerStatus).filter(Boolean)),
    ];

    const applyOptions = (select, values = [], label = "", current = "") => {
      if (!select) return;
      select.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = label;
      select.appendChild(placeholder);
      values.forEach((val) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        opt.selected = val === current;
        select.appendChild(opt);
      });
      if (select.value !== current && current) {
        select.value = current;
      }
    };

    applyOptions(
      this.elements.chainCornerTypeFilter,
      types,
      "All corner types",
      this.chainFilters.cornerType
    );
    applyOptions(
      this.elements.chainCornerStatusFilter,
      statuses,
      "All corner statuses",
      this.chainFilters.cornerStatus
    );
  }

  applyChainFiltersFromInputs(render = true) {
    this.chainFilters.trs = this.elements.chainTrsFilter?.value.trim() || "";
    this.chainFilters.cornerType =
      this.elements.chainCornerTypeFilter?.value || "";
    this.chainFilters.cornerStatus =
      this.elements.chainCornerStatusFilter?.value || "";
    this.chainFilters.status = this.elements.chainStatusFilter?.value || "";
    this.chainFilters.startDate = this.elements.chainStartDate?.value || "";
    this.chainFilters.endDate = this.elements.chainEndDate?.value || "";
    if (render) this.renderChainEvidenceList();
  }

  resetChainFilters() {
    this.chainFilters = {
      trs: "",
      cornerType: "",
      cornerStatus: "",
      status: "",
      startDate: "",
      endDate: "",
    };
    if (this.elements.chainTrsFilter) this.elements.chainTrsFilter.value = "";
    if (this.elements.chainCornerTypeFilter)
      this.elements.chainCornerTypeFilter.value = "";
    if (this.elements.chainCornerStatusFilter)
      this.elements.chainCornerStatusFilter.value = "";
    if (this.elements.chainStatusFilter) this.elements.chainStatusFilter.value = "";
    if (this.elements.chainStartDate) this.elements.chainStartDate.value = "";
    if (this.elements.chainEndDate) this.elements.chainEndDate.value = "";
    this.renderChainEvidenceList();
  }

  normalizeFilterDate(value, isEnd = false) {
    if (!value) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    if (isEnd) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  }

  getChainFilteredEvidence() {
    const evidence = this.getProjectEvidence?.() || [];
    const trsFilter = this.chainFilters.trs.toLowerCase();
    const startDate = this.normalizeFilterDate(this.chainFilters.startDate);
    const endDate = this.normalizeFilterDate(this.chainFilters.endDate, true);

    const filtered = evidence.filter((ev) => {
      const trs = (this.buildEvidenceTrs(ev) || "").toLowerCase();
      if (trsFilter && !trs.includes(trsFilter)) return false;
      if (this.chainFilters.cornerType && ev.cornerType !== this.chainFilters.cornerType)
        return false;
      if (
        this.chainFilters.cornerStatus &&
        ev.cornerStatus !== this.chainFilters.cornerStatus
      )
        return false;
      if (this.chainFilters.status && ev.status !== this.chainFilters.status)
        return false;
      const created = ev.createdAt ? new Date(ev.createdAt) : null;
      if (startDate && created && created < startDate) return false;
      if (endDate && created && created > endDate) return false;
      return true;
    });

    return filtered.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }

  renderChainEvidenceList() {
    const container = this.elements.chainEvidenceList;
    const summary = this.elements.chainEvidenceSummary;
    if (!container || !summary) return;

    this.populateChainFilters();
    container.innerHTML = "";

    const currentProjectId = this.getCurrentProjectId?.();
    if (!currentProjectId) {
      summary.textContent = "Select a project to view evidence.";
      return;
    }

    const allEvidence = this.getProjectEvidence?.() || [];
    if (!allEvidence.length) {
      summary.textContent = "No evidence logged yet.";
      return;
    }

    const filtered = this.getChainFilteredEvidence();
    const total = allEvidence.length;
    const matchedWord = filtered.length === 1 ? "entry" : "entries";
    const totalWord = total === 1 ? "entry" : "entries";
    summary.textContent =
      filtered.length === total
        ? `${total} evidence ${totalWord} documented.`
        : `${filtered.length} ${matchedWord} of ${total} evidence ${totalWord} match the filters.`;

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "subtitle";
      empty.textContent = "No evidence matched the selected filters.";
      container.appendChild(empty);
      return;
    }

    const qcResults =
      this.getLatestQcResults?.() || this.computeQualityResults?.() || {};
    const researchDocs = this.getResearchDocuments?.(currentProjectId) || [];

    const groups = new Map();
    filtered.forEach((ev) => {
      const trs = this.buildEvidenceTrs(ev) || "Unspecified TRS";
      if (!groups.has(trs)) groups.set(trs, []);
      groups.get(trs).push(ev);
    });

    Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([trs, entries]) => {
        const group = document.createElement("div");
        group.className = "chain-group";
        const header = document.createElement("div");
        header.className = "chain-group-header";
        const title = document.createElement("strong");
        title.textContent = trs;
        const count = document.createElement("span");
        count.className = "subtitle";
        count.textContent = `${entries.length} entr${
          entries.length === 1 ? "y" : "ies"
        }`;
        header.append(title, count);
        group.appendChild(header);

        entries
          .slice()
          .sort(
            (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
          )
          .forEach((entry) => {
            group.appendChild(
              this.buildChainEvidenceCard(entry, qcResults, researchDocs)
            );
          });

        container.appendChild(group);
      });
  }

  buildChainEvidenceCard(entry, qcResults, researchDocs) {
    const card = document.createElement("div");
    card.className = "chain-entry";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "10px";

    const title = document.createElement("strong");
    title.textContent = entry.title || this.buildEvidenceTitle(entry);
    header.appendChild(title);

    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";
    chipRow.appendChild(this.buildStatusChip(entry.status || "Draft"));
    if (entry.cornerType) {
      const typeChip = document.createElement("span");
      typeChip.className = "status-chip info";
      typeChip.textContent = entry.cornerType;
      chipRow.appendChild(typeChip);
    }
    if (entry.cornerStatus) {
      const statusChip = document.createElement("span");
      statusChip.className = "status-chip in-progress";
      statusChip.textContent = entry.cornerStatus;
      chipRow.appendChild(statusChip);
    }
    const qcState = this.describeEvidenceQc(entry, qcResults);
    const qcChip = this.buildQcChip(qcState);
    if (qcChip) chipRow.appendChild(qcChip);
    header.appendChild(chipRow);
    card.appendChild(header);

    const meta = document.createElement("div");
    meta.className = "meta";
    const recordLabel = entry.recordName || "Unlinked";
    const createdLabel = entry.createdAt
      ? new Date(entry.createdAt).toLocaleString()
      : "";
    meta.textContent = `${recordLabel} · Saved ${createdLabel}`;
    card.appendChild(meta);

    const trsLine = this.buildEvidenceTrs(entry);
    if (trsLine) {
      const trs = document.createElement("div");
      trs.textContent = `TRS: ${trsLine}`;
      card.appendChild(trs);
    }

    if (entry.notes) {
      const notes = document.createElement("div");
      notes.textContent = entry.notes;
      card.appendChild(notes);
    }

    if (entry.photo) {
      const photoBlock = document.createElement("div");
      photoBlock.className = "chain-photo-block";
      photoBlock.innerHTML = buildAnnotatedPhotoHtml({
        photo: entry.photo,
        annotations: entry.photoAnnotations || [],
        metadata: entry.photoMetadata,
        maxWidth: "360px",
      });
      card.appendChild(photoBlock);
    }

    if (entry.ties?.length) {
      const ties = document.createElement("div");
      ties.className = "subtitle";
      ties.textContent = `${entry.ties.length} tie${
        entry.ties.length === 1 ? "" : "s"
      } recorded.`;
      card.appendChild(ties);
    }

    const completeness = this.getCpfCompleteness?.(entry);
    const missingFields = completeness?.missing || [];
    const cpStatus = document.createElement("div");
    cpStatus.className = "mini-note";
    cpStatus.textContent = completeness?.complete
      ? "CP&F-ready"
      : `CP&F validation outstanding: ${missingFields.join(", ") || "Items not documented"}`;
    card.appendChild(cpStatus);

    const researchRefs = this.getResearchReferencesForEvidence(
      entry,
      researchDocs
    );
    if (researchRefs.length) {
      const refBlock = document.createElement("div");
      const refTitle = document.createElement("strong");
      refTitle.textContent = "Linked research";
      const list = document.createElement("ul");
      researchRefs.forEach((doc) => {
        const li = document.createElement("li");
        const line = [doc.type, doc.classification].filter(Boolean).join(" · ");
        li.textContent = line || doc.type || "Research document";
        list.appendChild(li);
      });
      refBlock.append(refTitle, list);
      card.appendChild(refBlock);
    }

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.marginTop = "8px";
    const cpfBtn = document.createElement("button");
    cpfBtn.type = "button";
    cpfBtn.textContent = "Export CP&F";
    cpfBtn.addEventListener("click", () => this.exportCornerFiling?.(entry));
    const packetBtn = document.createElement("button");
    packetBtn.type = "button";
    packetBtn.className = "secondary";
    packetBtn.textContent = "Evidence Packet";
    packetBtn.addEventListener("click", () =>
      this.exportChainEvidencePacket(entry, qcState, researchRefs)
    );
    actions.append(cpfBtn, packetBtn);
    card.appendChild(actions);

    return card;
  }

  describeEvidenceQc(entry, qcResults = {}) {
    const defaultState = { label: "No traverse link", level: "info" };
    if (!entry?.recordId) return defaultState;
    const traverse = qcResults.traverses?.find((t) => t.id === entry.recordId);
    if (!traverse) return { label: "Traverse not evaluated", level: "warn" };
    if (traverse.status === "fail")
      return { label: "Fails tolerance", level: "fail" };
    if (traverse.status === "pass")
      return { label: "Passes tolerance", level: "pass" };
    return { label: traverse.message || "QC pending", level: "warn" };
  }

  buildQcChip(state = { label: "", level: "info" }) {
    const chip = document.createElement("span");
    chip.className = "status-chip";
    chip.textContent = `QC: ${state.label || "Not evaluated"}`;
    if (state.level === "fail") chip.classList.add("draft");
    else if (state.level === "pass") chip.classList.add("ready");
    else if (state.level === "warn") chip.classList.add("in-progress");
    else chip.classList.add("info");
    return chip;
  }

  getResearchReferencesForEvidence(entry, docs = []) {
    return (docs || []).filter((doc) =>
      doc.linkedEvidence?.some((ev) => (ev.id || ev) === entry.id)
    );
  }

  exportChainEvidencePacket(entry, qcState, researchRefs = []) {
    if (!entry) return;
    const qcResults =
      this.getLatestQcResults?.() || this.computeQualityResults?.() || {};
    const packetQcState = qcState || this.describeEvidenceQc(entry, qcResults);
    const completeness = this.getCpfCompleteness?.(entry);
    const refs =
      researchRefs.length > 0
        ? researchRefs
        : this.getResearchReferencesForEvidence(
            entry,
            this.getResearchDocuments?.(entry.projectId) || []
          );
    const html = this.buildEvidencePacketLayout(entry, {
      qcState: packetQcState,
      researchRefs: refs,
      completeness,
    });
    const fileBase = (entry.title || this.buildEvidenceTitle(entry) || "corner")
      .replace(/[^\w\-]+/g, "_")
      .toLowerCase();
    this.downloadHtml?.(html, `${fileBase}-evidence-packet.html`);
  }

  exportChainEvidenceSelection() {
    if (!this.getCurrentProjectId?.()) return;
    const filtered = this.getChainFilteredEvidence();
    if (!filtered.length) return;
    const qcResults =
      this.getLatestQcResults?.() || this.computeQualityResults?.() || {};
    const researchDocs = this.getResearchDocuments?.(this.getCurrentProjectId()) || [];
    const sections = filtered
      .map((entry) =>
        this.buildEvidencePacketLayout(entry, {
          qcState: this.describeEvidenceQc(entry, qcResults),
          researchRefs: this.getResearchReferencesForEvidence(
            entry,
            researchDocs
          ),
          completeness: this.getCpfCompleteness?.(entry),
          includeHeader: false,
        })
      )
      .join("<hr />");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Corner Evidence Packet</title></head><body><h1>Corner Evidence Packet</h1>${sections}</body></html>`;
    this.downloadHtml?.(html, "corner-evidence-packet.html");
  }

  buildEvidencePacketLayout(entry, options = {}) {
    const {
      qcState = { label: "Not evaluated", level: "info" },
      researchRefs = [],
      completeness = { complete: false, missing: [] },
      includeHeader = true,
    } = options;
    const trs = this.buildEvidenceTrs(entry) || "Unspecified";
    const photoBlock = buildAnnotatedPhotoHtml({
      photo: entry.photo,
      annotations: entry.photoAnnotations,
      metadata: entry.photoMetadata,
      maxWidth: "420px",
    });
    const ties = (entry.ties || [])
      .map((tie, idx) => {
        const parts = [tie.distance, tie.bearing, tie.description]
          .filter(Boolean)
          .map((p) => this.escapeHtml?.(p))
          .join(" · ");
        return `<li><strong>Tie ${idx + 1}:</strong> ${parts || "No details"}</li>`;
      })
      .join("");
    const researchList = researchRefs
      .map(
        (doc) =>
          `<li><strong>${this.escapeHtml?.(doc.type || "Research")}</strong> — ${
            this.escapeHtml?.(doc.classification || "Unclassified")
          }</li>`
      )
      .join("");
    const qcLabel = qcState.label || "Not evaluated";
    const cpStatus = completeness?.complete
      ? "Complete"
      : `Missing: ${completeness?.missing?.join(", ")}`;
    const header = includeHeader
      ? `<h1>${this.escapeHtml?.(
          entry.title || this.buildEvidenceTitle(entry)
        )}</h1>`
      : "";
    const body = `${header}<div><strong>TRS:</strong> ${this.escapeHtml?.(
      trs
    )}</div><div><strong>Corner type:</strong> ${this.escapeHtml?.(
      entry.cornerType || ""
    )}</div><div><strong>Corner status:</strong> ${this.escapeHtml?.(
      entry.cornerStatus || ""
    )}</div><div><strong>Evidence status:</strong> ${this.escapeHtml?.(
      entry.status || "Draft"
    )}</div><div><strong>QC:</strong> ${this.escapeHtml?.(
      qcLabel
    )}</div><div><strong>CP&F readiness:</strong> ${this.escapeHtml?.(
      cpStatus
    )}</div><div><strong>Record:</strong> ${this.escapeHtml?.(
      entry.recordName || "Unlinked"
    )}</div><div><strong>Notes:</strong> ${this.escapeHtml?.(
      entry.notes || "Not provided"
    )}</div><div><strong>Monument:</strong> ${this.escapeHtml?.(
      [entry.monumentType, entry.monumentMaterial, entry.monumentSize]
        .filter(Boolean)
        .join(" · ") || "Not recorded"
    )}</div><div><strong>Surveyor:</strong> ${this.escapeHtml?.(
      [entry.surveyorName, entry.surveyorLicense, entry.surveyorFirm]
        .filter(Boolean)
        .join(" · ") || "Not provided"
    )}</div><div><strong>Survey dates:</strong> ${this.escapeHtml?.(
      entry.surveyDates || "Not recorded"
    )}</div><div><strong>County:</strong> ${this.escapeHtml?.(
      entry.surveyCounty || "Not provided"
    )}</div><div><strong>Recording info:</strong> ${this.escapeHtml?.(
      entry.recordingInfo || "Not recorded"
    )}</div><div><strong>Basis of bearing:</strong> ${this.escapeHtml?.(
      entry.basisOfBearing || "Not stated"
    )}</div><div><strong>CPF readiness:</strong> ${this.escapeHtml?.(
      completeness?.complete ? "Ready" : cpStatus
    )}</div>`;

    return `${body}${photoBlock}${
      ties ? `<div style="margin-top:8px;"><strong>Ties</strong><ul>${ties}</ul></div>` : ""
    }${
      researchList
        ? `<div style="margin-top:8px;"><strong>Research references</strong><ul>${researchList}</ul></div>`
        : ""
    }`;
  }
}
