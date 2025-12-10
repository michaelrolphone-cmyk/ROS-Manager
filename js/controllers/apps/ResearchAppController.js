import ResearchDocument from "../../models/ResearchDocument.js";
import MiniAppController from "./MiniAppController.js";

export default class ResearchAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.elements = options.elements || {};
    this.getCurrentProjectId = options.getCurrentProjectId || (() => null);
    this.getProjectEvidence = options.getProjectEvidence || (() => []);
    this.getResearchDocuments = options.getResearchDocuments || (() => []);
    this.addResearchDocument = options.addResearchDocument || (() => {});
    this.buildExportMetadata = options.buildExportMetadata || (() => ({}));
    this.getExportStatusLabel = options.getExportStatusLabel || (() => ({}));
    this.downloadText = options.downloadText || (() => {});
    this.getProjectName = options.getProjectName || (() => "Project");
    this.onResearchListUpdated = options.onResearchListUpdated || (() => {});

    this.bindEvents();
  }

  handleActivate() {
    super.handleActivate();
    this.refreshResearchUI();
  }

  bindEvents() {
    this.elements.saveResearchButton?.addEventListener("click", () =>
      this.saveResearchDocument()
    );
    this.elements.resetResearchButton?.addEventListener("click", () =>
      this.resetResearchForm()
    );
    this.elements.exportResearchButton?.addEventListener("click", () =>
      this.exportResearchPacket()
    );

    [
      this.elements.researchDocumentType,
      this.elements.researchJurisdiction,
      this.elements.researchInstrument,
      this.elements.researchBookPage,
      this.elements.researchDocumentNumber,
      this.elements.researchTownship,
      this.elements.researchRange,
      this.elements.researchSections,
      this.elements.researchClassification,
      this.elements.researchDateReviewed,
      this.elements.researchReviewer,
    ].forEach((el) => {
      el?.addEventListener("input", () => this.updateResearchSaveState());
      if (el?.tagName === "SELECT") {
        el.addEventListener("change", () => this.updateResearchSaveState());
      }
    });
  }

  refreshResearchUI() {
    this.populateResearchEvidenceOptions();
    this.renderResearchList();
    this.updateResearchSaveState();
  }

  populateResearchEvidenceOptions() {
    const select = this.elements.researchEvidenceSelect;
    if (!select) return;
    select.innerHTML = "";
    const evidence = this.getProjectEvidence();
    if (!evidence.length) {
      const opt = document.createElement("option");
      opt.disabled = true;
      opt.value = "";
      opt.textContent = "No evidence logged";
      select.appendChild(opt);
      return;
    }
    evidence
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach((ev) => {
        const opt = document.createElement("option");
        opt.value = ev.id;
        opt.dataset.label = `${ev.pointLabel || "Traverse point"} · ${
          ev.recordName || "Record"
        }`;
        opt.textContent = `${ev.pointLabel || "Traverse point"} (${ev.recordName ||
          "Record"})`;
        select.appendChild(opt);
      });
  }

  updateResearchSaveState() {
    if (!this.elements.saveResearchButton) return;
    const required = [
      this.elements.researchDocumentType,
      this.elements.researchJurisdiction,
      this.elements.researchInstrument,
      this.elements.researchBookPage,
      this.elements.researchTownship,
      this.elements.researchRange,
      this.elements.researchSections,
      this.elements.researchClassification,
      this.elements.researchDateReviewed,
      this.elements.researchReviewer,
    ];
    const canSave =
      !!this.getCurrentProjectId() &&
      required.every((el) => el && el.value.trim().length > 0);
    this.elements.saveResearchButton.disabled = !canSave;

    if (this.elements.researchFormStatus) {
      if (!this.getCurrentProjectId()) {
        this.elements.researchFormStatus.textContent =
          "Select or create a project to save research entries.";
      } else if (!canSave) {
        this.elements.researchFormStatus.textContent =
          "Fill in the required research details (type, jurisdiction, instrument, book/page, township, range, sections, classification, date, reviewer).";
      } else {
        this.elements.researchFormStatus.textContent = "";
      }
    }
  }

  saveResearchDocument() {
    if (!this.getCurrentProjectId()) return;
    const selectedEvidence = Array.from(
      this.elements.researchEvidenceSelect?.selectedOptions || []
    ).map((opt) => ({ id: opt.value, label: opt.dataset.label || opt.textContent }));

    const doc = new ResearchDocument({
      projectId: this.getCurrentProjectId(),
      type: this.elements.researchDocumentType?.value.trim() || "",
      jurisdiction: this.elements.researchJurisdiction?.value.trim() || "",
      instrumentNumber: this.elements.researchInstrument?.value.trim() || "",
      bookPage: this.elements.researchBookPage?.value.trim() || "",
      documentNumber: this.elements.researchDocumentNumber?.value.trim() || "",
      township: this.elements.researchTownship?.value.trim() || "",
      range: this.elements.researchRange?.value.trim() || "",
      sections: this.elements.researchSections?.value.trim() || "",
      aliquots: this.elements.researchAliquots?.value.trim() || "",
      source: this.elements.researchSource?.value.trim() || "",
      dateReviewed: this.elements.researchDateReviewed?.value.trim() || "",
      reviewer: this.elements.researchReviewer?.value.trim() || "",
      status: this.elements.researchStatus?.value.trim() || "Draft",
      classification: this.elements.researchClassification?.value.trim() || "",
      notes: this.elements.researchNotes?.value.trim() || "",
      cornerNotes: this.elements.researchCornerNotes?.value.trim() || "",
      linkedEvidence: selectedEvidence,
      traverseLinks: this.elements.researchTraverseLinks?.value.trim() || "",
      stakeoutLinks: this.elements.researchStakeoutLinks?.value.trim() || "",
      cornerIds: this.elements.researchCornerIds?.value.trim() || "",
    });

    this.addResearchDocument(doc);
    this.resetResearchForm();
    this.renderResearchList();

    if (this.elements.researchFormStatus) {
      this.elements.researchFormStatus.textContent =
        "Research entry saved.";
    }
  }

  resetResearchForm() {
    [
      this.elements.researchDocumentType,
      this.elements.researchJurisdiction,
      this.elements.researchInstrument,
      this.elements.researchBookPage,
      this.elements.researchDocumentNumber,
      this.elements.researchTownship,
      this.elements.researchRange,
      this.elements.researchSections,
      this.elements.researchAliquots,
      this.elements.researchSource,
      this.elements.researchDateReviewed,
      this.elements.researchReviewer,
      this.elements.researchStatus,
      this.elements.researchClassification,
      this.elements.researchNotes,
      this.elements.researchCornerNotes,
      this.elements.researchTraverseLinks,
      this.elements.researchStakeoutLinks,
      this.elements.researchCornerIds,
    ].forEach((el) => {
      if (el) el.value = "";
    });
    if (this.elements.researchEvidenceSelect) {
      Array.from(this.elements.researchEvidenceSelect.options).forEach((opt) => {
        opt.selected = false;
      });
    }
    if (this.elements.researchFormStatus)
      this.elements.researchFormStatus.textContent = "";
    if (this.elements.saveResearchButton)
      this.elements.saveResearchButton.textContent = "Save Research";
    this.updateResearchSaveState();
  }

  renderResearchList() {
    if (!this.elements.researchList || !this.elements.researchSummary) return;
    const docs = this.getResearchDocuments(this.getCurrentProjectId());
    const container = this.elements.researchList;
    container.innerHTML = "";

    if (!this.getCurrentProjectId()) {
      this.elements.researchSummary.textContent =
        "Select a project to log research documents.";
      return;
    }

    if (!docs.length) {
      this.elements.researchSummary.textContent =
        "No research documents logged yet.";
      return;
    }

    const total = docs.length;
    const statusCounts = docs.reduce((acc, doc) => {
      const status = (doc.status || "Draft").toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const summaryParts = Object.entries(statusCounts).map(
      ([status, count]) => `${count} ${status}`
    );
    this.elements.researchSummary.textContent =
      `${total} document${total === 1 ? "" : "s"} — ${summaryParts.join(", ")}`;

    docs
      .slice()
      .sort((a, b) => new Date(b.dateReviewed) - new Date(a.dateReviewed))
      .forEach((doc) => {
        const card = document.createElement("div");
        card.className = "card";
        const statusChip = document.createElement("span");
        statusChip.className = "status-chip";
        statusChip.textContent = doc.status || "Draft";
        statusChip.style.marginBottom = "6px";
        const title = document.createElement("strong");
        title.textContent = doc.type || "Document";
        const meta = document.createElement("div");
        meta.className = "subtitle";
        meta.style.marginTop = "4px";
        meta.textContent = [
          doc.jurisdiction,
          doc.instrumentNumber,
          doc.bookPage,
          doc.documentNumber,
        ]
          .filter(Boolean)
          .join(" · ");
        card.append(statusChip, title, meta);
        const trs = [doc.township, doc.range, doc.sections, doc.aliquots]
          .filter(Boolean)
          .join(" ");
        if (trs) {
          const trsText = document.createElement("div");
          trsText.textContent = `TRS: ${trs}`;
          card.appendChild(trsText);
        }
        const review = document.createElement("div");
        review.textContent =
          `Reviewed ${doc.dateReviewed || ""} by ${doc.reviewer || ""} (${doc.classification || ""})`;
        card.appendChild(review);
        if (doc.source) {
          const source = document.createElement("div");
          source.textContent = `Source: ${doc.source}`;
          card.appendChild(source);
        }
        if (doc.cornerNotes) {
          const cn = document.createElement("div");
          cn.textContent = `Corner notes: ${doc.cornerNotes}`;
          card.appendChild(cn);
        }
        if (doc.traverseLinks) {
          const links = document.createElement("div");
          links.textContent = `Traverse links: ${doc.traverseLinks}`;
          card.appendChild(links);
        }
        if (doc.stakeoutLinks) {
          const links = document.createElement("div");
          links.textContent = `Stakeout links: ${doc.stakeoutLinks}`;
          card.appendChild(links);
        }
        if (doc.cornerIds) {
          const cid = document.createElement("div");
          cid.textContent = `TRS corner IDs: ${doc.cornerIds}`;
          card.appendChild(cid);
        }
        if (doc.notes) {
          const notes = document.createElement("div");
          notes.textContent = doc.notes;
          notes.style.marginTop = "6px";
          card.appendChild(notes);
        }
        if (doc.linkedEvidence?.length) {
          const list = document.createElement("ul");
          list.className = "ties-list";
          doc.linkedEvidence.forEach((ev) => {
            const li = document.createElement("li");
            li.textContent = ev.label || ev.id;
            list.appendChild(li);
          });
          const heading = document.createElement("strong");
          heading.textContent = "Linked evidence";
          card.append(heading, list);
        }
        container.appendChild(card);
      });

    this.onResearchListUpdated();
  }

  exportResearchPacket() {
    if (!this.getCurrentProjectId()) return;
    const docs = this.getResearchDocuments(this.getCurrentProjectId());
    if (!docs.length) {
      alert("No research documents to export.");
      return;
    }
    const projectName = this.getProjectName();
    const normalizedStatuses = docs.map((doc) =>
      (doc.status || "Draft").toLowerCase()
    );
    const exportStatus = normalizedStatuses.every((status) => status === "final")
      ? "Final"
      : normalizedStatuses.some((status) => status === "ready for review")
      ? "Ready for Review"
      : normalizedStatuses.some((status) => status === "in progress")
      ? "In Progress"
      : "Draft";
    const meta = this.buildExportMetadata(exportStatus);
    const label = this.getExportStatusLabel(exportStatus);
    const exportNote = meta.note || label.note;
    const lines = [
      "Research and Source Documentation Packet",
      meta.status || label.title,
    ];
    if (exportStatus.toLowerCase() !== "final") {
      lines.push("PRELIMINARY — NOT FOR RECORDATION");
    }
    if (exportNote) {
      lines.push(exportNote);
    } else if (exportStatus.toLowerCase() !== "final") {
      lines.push("Incomplete — subject to revision.");
    }
    lines.push(
      `Project: ${projectName}`,
      `Generated: ${meta.generatedAt || new Date().toISOString()}`,
      ""
    );
    docs
      .slice()
      .sort((a, b) => (a.township || "").localeCompare(b.township || ""))
      .forEach((doc, idx) => {
        lines.push(`${idx + 1}. ${doc.type || "Document"}`);
        const trs = [doc.township, doc.range, doc.sections, doc.aliquots]
          .filter(Boolean)
          .join(" ");
        if (trs) lines.push(`   TRS: ${trs}`);
        const recParts = [
          doc.jurisdiction,
          doc.instrumentNumber,
          doc.bookPage,
          doc.documentNumber,
        ]
          .filter(Boolean)
          .join(" · ");
        if (recParts) lines.push(`   Recording: ${recParts}`);
        lines.push(`   Status: ${doc.status || "Draft"}`);
        lines.push(
          `   Reviewed ${doc.dateReviewed || ""} by ${doc.reviewer || ""} (${doc.classification || ""})`
        );
        if (doc.source) lines.push(`   Source: ${doc.source}`);
        if (doc.cornerNotes) lines.push(`   Notes: ${doc.cornerNotes}`);
        if (doc.traverseLinks) lines.push(`   Traverse links: ${doc.traverseLinks}`);
        if (doc.stakeoutLinks)
          lines.push(`   Stakeout links: ${doc.stakeoutLinks}`);
        if (doc.cornerIds) lines.push(`   TRS corner IDs: ${doc.cornerIds}`);
        if (doc.notes) lines.push(`   Annotation: ${doc.notes}`);
        if (doc.linkedEvidence?.length) {
          lines.push(
            `   Linked evidence: ${doc.linkedEvidence
              .map((ev) => ev.label || ev.id)
              .join("; ")}`
          );
        }
        lines.push("");
      });
    const safeName = projectName.replace(/[^\w\-]+/g, "_").toLowerCase();
    this.downloadText(lines.join("\n"), `${safeName}-research-packet.txt`);
  }
}
