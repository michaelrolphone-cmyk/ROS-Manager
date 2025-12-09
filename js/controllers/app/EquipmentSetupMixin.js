const EquipmentSetupMixin = (Base) =>
  class extends Base {
    /* ===================== Equipment Setup ===================== */
    refreshEquipmentUI() {
      this.appControllers?.equipmentSection?.refreshEquipmentUI?.();
    }

    resetEquipmentForm() {
      this.appControllers?.equipmentSection?.resetEquipmentForm?.();
    }

    updateEquipmentSaveState() {
      this.appControllers?.equipmentSection?.updateEquipmentSaveState?.();
    }

    renderReferencePointOptions() {
      this.appControllers?.equipmentSection?.renderReferencePointOptions?.();
    }

    renderEquipmentSetupByOptions() {
      this.appControllers?.equipmentSection?.renderEquipmentSetupByOptions?.();
    }

    renderEquipmentPickerOptions() {
      this.appControllers?.equipmentSection?.renderEquipmentPickerOptions?.();
    }

    handleReferencePointSelection(event) {
      this.appControllers?.equipmentSection?.handleReferencePointSelection?.(
        event
      );
    }

    rememberReferencePoint(name) {
      this.appControllers?.equipmentSection?.rememberReferencePoint?.(name);
    }

    captureEquipmentLocation() {
      this.appControllers?.equipmentSection?.captureEquipmentLocation?.();
    }

    saveEquipmentEntry() {
      this.appControllers?.equipmentSection?.saveEquipmentEntry?.();
    }

    renderEquipmentList() {
      this.appControllers?.equipmentSection?.renderEquipmentList?.();
    }

    logEquipmentTeardown(id) {
      this.appControllers?.equipmentSection?.logEquipmentTeardown?.(id);
    }

    openEquipmentInNavigation(id) {
      this.appControllers?.equipmentSection?.openEquipmentInNavigation?.(id);
    }

    startEditingEquipmentEntry(id) {
      this.appControllers?.equipmentSection?.startEditingEquipmentEntry?.(id);
    }

    deleteEquipmentEntry(id) {
      this.appControllers?.equipmentSection?.deleteEquipmentEntry?.(id);
    }

    persistNavigationTarget(state = {}) {
      const project = this.currentProjectId
        ? this.projects[this.currentProjectId]
        : null;
      if (!project) return;

      const previous = project.navigationTarget || {};
      const timestamp = new Date().toISOString();
      const coords = state.coords;
      const sanitizedCoords =
        coords &&
        typeof coords.lat === "number" &&
        typeof coords.lon === "number"
          ? { lat: coords.lat, lon: coords.lon }
          : null;

      project.navigationTarget = {
        type: state.type || null,
        id: state.id || null,
        label: state.label || "",
        value: state.value || "",
        coords: sanitizedCoords,
        updatedAt: timestamp,
        version: (previous.version ?? 0) + 1,
      };
      this.saveProjects();
    }
    exportCornerFiling(entry) {
      if (!entry) return;
      this.clearCpfValidationState();
      const projectName = this.projects[entry.projectId]?.name || "Project";
      const statusLabel = entry.status || "Draft";
      const normalizedStatus = statusLabel.toLowerCase();
      const completeness = this.getCpfCompleteness(entry);
      if (completeness.missing.length) {
        this.switchTab("evidenceSection");
        this.renderCpfValidationCallout(completeness.missing);
        this.highlightMissingCpfFields(completeness.missing);
        return;
      }
      const exportLabel = completeness.complete
        ? this.getExportStatusLabel(statusLabel)
        : this.getExportStatusLabel("in progress");
      const record = this.projects[entry.projectId]?.records?.[entry.recordId];
      const researchRefs = this.researchDocumentService
        .getProjectDocuments(entry.projectId)
        .filter((doc) =>
          doc.linkedEvidence?.some((ev) => (ev.id || ev) === entry.id)
        );
      const profile = this.getProfessionalProfile?.() || {};
      const html = this.buildCpfLayout(entry, {
        projectName,
        record,
        exportLabel,
        researchRefs,
        normalizedStatus,
        completeness,
        profile,
      });
      const fileBase = (entry.pointLabel || "corner")
        .replace(/[^\w\-]+/g, "_")
        .toLowerCase();
      this.downloadHtml(html, `${fileBase}-cpf.html`);
    }

    buildCpfLayout(entry, options = {}) {
      const {
        projectName,
        record,
        exportLabel,
        researchRefs = [],
        normalizedStatus,
        completeness,
        profile = {},
      } = options;
      const headerStatus = exportLabel?.title || "Preliminary — In Progress";
      const showWatermark =
        normalizedStatus !== "final" || !completeness?.complete;
      const statusNote =
        exportLabel?.note || (showWatermark ? "Incomplete — subject to revision." : "");
      const contactInfo = [profile.contactPhone, profile.contactEmail]
        .filter(Boolean)
        .join(" | ");
      const monumentParts = [
        entry.monumentType,
        entry.monumentMaterial,
        entry.monumentSize,
      ]
        .filter(Boolean)
        .map((part) => this.escapeHtml(part))
        .join(" · ");

      const tieRows = (entry.ties || [])
        .map((tie, idx) => {
          const pieces = [
            tie.distance || "",
            tie.bearing || "",
            tie.description || "",
          ]
            .filter(Boolean)
            .map((piece) => this.escapeHtml(piece))
            .join(" · ");
          const photoLabel = tie.photos?.length
            ? `<span class="muted">Photos: ${tie.photos.length}</span>`
            : "";
          return `<tr><td>${idx + 1}</td><td>${pieces || "&nbsp;"}</td><td>${
            this.escapeHtml(tie.occupation || "") || "&nbsp;"
          }</td><td>${photoLabel}</td></tr>`;
        })
        .join("");

      const researchList =
        researchRefs.length > 0
          ? researchRefs
              .map((doc) => {
                const trs = [
                  doc.township,
                  doc.range,
                  doc.sections,
                  doc.aliquots,
                ]
                  .filter(Boolean)
                  .join(" ");
                const docLine = [
                  doc.type || "Document",
                  doc.classification || "",
                ]
                  .filter(Boolean)
                  .join(" — ");
                const refLine = [
                  doc.jurisdiction,
                  doc.instrumentNumber,
                  doc.bookPage,
                  doc.documentNumber,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return `<li><strong>${this.escapeHtml(docLine)}</strong><div class="muted">${
                  this.escapeHtml(trs || "")
                }</div><div class="muted">${this.escapeHtml(refLine || "")}</div></li>`;
              })
              .join("")
          : '<li class="muted">No linked research documents recorded for this evidence.</li>';

      const recordLine = record
        ? `${record.name || "Record"} (basis: ${
            record.basis || "Not set"
          })`
        : entry.recordName || "Record";

      const watermark = showWatermark
        ? `<div class="watermark">PRELIMINARY — NOT FOR RECORDATION</div>`
        : "";

      return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Corner Perpetuation and Filing</title>
      <style>
        body { font-family: "Segoe UI", Tahoma, sans-serif; color: #1c1c1c; margin: 32px; line-height: 1.45; }
        h1 { margin: 0 0 6px; font-size: 24px; }
        h2 { margin-top: 22px; font-size: 16px; letter-spacing: 0.2px; }
        .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px 18px; margin-top: 10px; }
        .meta div { padding: 6px 8px; background: #f5f7fb; border-radius: 6px; }
        .section { border: 1px solid #d7dce5; border-radius: 8px; padding: 14px 16px; margin-top: 14px; }
        .chip { display: inline-block; padding: 4px 10px; border-radius: 12px; background: #eef2ff; color: #2a3a8f; font-weight: 600; font-size: 12px; }
        .watermark { margin: 10px 0; color: #8c1d18; font-weight: 700; text-transform: uppercase; }
        .table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .table th, .table td { border: 1px solid #d7dce5; padding: 6px 8px; text-align: left; }
        .signature-row { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 10px; align-items: stretch; }
        .sig-box { border: 1px dashed #a3a9b8; padding: 12px; min-height: 90px; }
        .seal-box { border: 2px solid #1c1c1c; min-height: 120px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .muted { color: #5b6475; font-size: 12px; }
        ul { margin: 6px 0 0 20px; padding: 0; }
        li { margin-bottom: 6px; }
      </style>
    </head>
    <body>
      <h1>Idaho Corner Perpetuation and Filing (CP&F)</h1>
      <div class="chip">${this.escapeHtml(headerStatus)}</div>
      ${watermark}
      ${statusNote ? `<div class="muted">${this.escapeHtml(statusNote)}</div>` : ""}
      <div class="meta">
        <div><strong>Project</strong><br />${this.escapeHtml(projectName || "Project")}</div>
        <div><strong>Traverse / Record</strong><br />${this.escapeHtml(
          recordLine || "Traverse point"
        )}</div>
        <div><strong>Traverse Point</strong><br />${this.escapeHtml(
          entry.pointLabel || "Traverse point"
        )}</div>
        <div><strong>TRS</strong><br />${this.escapeHtml(
          this.buildEvidenceTrs(entry) || "Not set"
        )}</div>
        ${
          (entry.associatedTrs || []).length > 0
            ? `<div><strong>Additional TRS ties</strong><br />${(entry.associatedTrs || [])
                .map((trs) => this.escapeHtml(this.formatTrsString(trs)))
                .filter(Boolean)
                .join("<br />")}</div>`
            : ""
        }
        <div><strong>Status</strong><br />${this.escapeHtml(entry.status || "Draft")}</div>
        <div><strong>Generated</strong><br />${this.escapeHtml(
          new Date(entry.createdAt).toLocaleString()
        )}</div>
      </div>

      <div class="section">
        <h2>Corner Identification</h2>
        <div><strong>Corner Type:</strong> ${this.escapeHtml(entry.cornerType || "")}</div>
        <div><strong>Corner Status:</strong> ${this.escapeHtml(
          entry.cornerStatus || ""
        )}</div>
        <div><strong>Basis of Bearing:</strong> ${this.escapeHtml(
          entry.basisOfBearing || ""
        )}</div>
        <div><strong>Evidence Type:</strong> ${this.escapeHtml(entry.type || "")}</div>
        <div><strong>Condition / Occupation Evidence:</strong> ${this.escapeHtml(
          entry.condition || ""
        )}</div>
        ${entry.coords ? `<div><strong>Coordinates:</strong> Easting ${this.escapeHtml(
          entry.coords.x.toFixed(2)
        )}, Northing ${this.escapeHtml(entry.coords.y.toFixed(2))}</div>` : ""}
        ${entry.location ? `<div><strong>GPS:</strong> Lat ${this.escapeHtml(
          entry.location.lat.toFixed(6)
        )}, Lon ${this.escapeHtml(entry.location.lon.toFixed(6))} (±${this.escapeHtml(
          entry.location.accuracy.toFixed(1)
        )} m)</div>` : ""}
      </div>

      <div class="section">
        <h2>Monument Description</h2>
        <div><strong>Monument:</strong> ${monumentParts || "Not provided"}</div>
        ${entry.notes ? `<div style="margin-top:6px;">${this.escapeHtml(
          entry.notes
        )}</div>` : ""}
      </div>

      <div class="section">
        <h2>Reference Ties</h2>
        <table class="table">
          <thead><tr><th>#</th><th>Reference</th><th>Occupation Evidence</th><th>Photos</th></tr></thead>
          <tbody>${tieRows || '<tr><td colspan="4">No ties recorded.</td></tr>'}</tbody>
        </table>
      </div>

      <div class="section">
        <h2>Cross References</h2>
        <ul>
          <li><strong>Evidence Entry ID:</strong> ${this.escapeHtml(entry.id || "")}</li>
          <li><strong>Traverse / Record set:</strong> ${this.escapeHtml(recordLine || "")}</li>
          <li><strong>Linked research documents:</strong><ul>${researchList}</ul></li>
        </ul>
      </div>

      <div class="section">
        <h2>Surveyor of Record</h2>
        <div class="meta" style="margin-top:0;">
          <div><strong>Name</strong><br />${this.escapeHtml(entry.surveyorName || "")}</div>
          <div><strong>Idaho PLS License</strong><br />${this.escapeHtml(
            entry.surveyorLicense || ""
          )}</div>
          <div><strong>Firm</strong><br />${this.escapeHtml(entry.surveyorFirm || "")}</div>
        <div><strong>Contact</strong><br />${this.escapeHtml(
          contactInfo || "Not provided"
        )}</div>
          <div><strong>Survey Date(s)</strong><br />${this.escapeHtml(
            entry.surveyDates || ""
          )}</div>
          <div><strong>County</strong><br />${this.escapeHtml(
            entry.surveyCounty || profile.county || ""
          )}</div>
          <div><strong>Recording Info</strong><br />${this.escapeHtml(
            entry.recordingInfo || ""
          )}</div>
        </div>
        <div class="signature-row">
          <div class="sig-box">
            <strong>Professional Declaration</strong>
            <div class="muted" style="margin-top:6px;">I affirm this work is prepared under my direction, complies with applicable surveying standards and Idaho law, and is suitable for filing or reliance.</div>
            <div style="margin-top:16px;">
              <div>Signature: __________________________</div>
              <div style="margin-top:6px;">Signed date/time: __________________</div>
            </div>
          </div>
          <div class="seal-box">Place Surveyor Seal</div>
        </div>
      </div>
    </body>
  </html>`;
    }

    resetEvidenceForm() {
      this.clearCpfValidationState();
      if (this.elements.evidenceType) this.elements.evidenceType.value = "";
      if (this.elements.evidenceTownship) this.elements.evidenceTownship.value = "";
      if (this.elements.evidenceRange) this.elements.evidenceRange.value = "";
      if (this.elements.evidenceSection) this.elements.evidenceSection.value = "";
      if (this.elements.evidenceSectionBreakdown)
        this.elements.evidenceSectionBreakdown.value = "";
      if (this.elements.evidenceCornerType)
        this.elements.evidenceCornerType.value = "";
      if (this.elements.evidenceCornerStatus)
        this.elements.evidenceCornerStatus.value = "";
      if (this.elements.evidenceStatus) this.elements.evidenceStatus.value = "Draft";
      if (this.elements.evidenceCondition)
        this.elements.evidenceCondition.value = "";
      if (this.elements.evidenceBasisOfBearing)
        this.elements.evidenceBasisOfBearing.value = "";
      if (this.elements.evidenceMonumentType)
        this.elements.evidenceMonumentType.value = "";
      if (this.elements.evidenceMonumentMaterial)
        this.elements.evidenceMonumentMaterial.value = "";
      if (this.elements.evidenceMonumentSize)
        this.elements.evidenceMonumentSize.value = "";
      if (this.elements.evidenceSurveyorName)
        this.elements.evidenceSurveyorName.value = "";
      if (this.elements.evidenceSurveyorLicense)
        this.elements.evidenceSurveyorLicense.value = "";
      if (this.elements.evidenceSurveyorFirm)
        this.elements.evidenceSurveyorFirm.value = "";
      if (this.elements.evidenceSurveyDates)
        this.elements.evidenceSurveyDates.value = "";
      if (this.elements.evidenceSurveyCounty)
        this.elements.evidenceSurveyCounty.value = "";
      if (this.elements.evidenceRecordingInfo)
        this.elements.evidenceRecordingInfo.value = "";
      if (this.elements.evidenceNotes) this.elements.evidenceNotes.value = "";
      if (this.elements.additionalTrsTownship)
        this.elements.additionalTrsTownship.value = "";
      if (this.elements.additionalTrsRange)
        this.elements.additionalTrsRange.value = "";
      if (this.elements.additionalTrsSection)
        this.elements.additionalTrsSection.value = "";
      if (this.elements.additionalTrsBreakdown)
        this.elements.additionalTrsBreakdown.value = "";
      if (this.elements.evidencePhoto) this.elements.evidencePhoto.value = "";
      if (this.elements.evidenceTiePhotos)
        this.elements.evidenceTiePhotos.value = "";
      if (this.elements.evidenceLocationStatus)
        this.elements.evidenceLocationStatus.textContent = "";
      if (this.elements.saveEvidenceButton)
        this.elements.saveEvidenceButton.textContent = "Save evidence";
      if (this.elements.evidencePhotoPreview)
        this.elements.evidencePhotoPreview.innerHTML = "";
      if (this.elements.evidencePhotoMetadataNote)
        this.elements.evidencePhotoMetadataNote.textContent = "";
      if (this.elements.evidenceAnnotationCanvas) {
        this.elements.evidenceAnnotationCanvas.width = 0;
        this.elements.evidenceAnnotationCanvas.height = 0;
      }
      this.currentEvidencePhoto = null;
      this.currentEvidencePhotoAnnotations = [];
      this.currentEvidencePhotoMetadata = null;
      this.currentEvidenceLocation = null;
      this.currentEvidenceAssociatedTrs = [];
      this.currentEvidenceTies = [];
      this.editingEvidenceId = null;
      this.currentAnnotationMode = null;
      this.annotationDraftPoint = null;
      this.setAnnotationMode?.("arrow");
      this.renderAssociatedTrsList();
      this.renderEvidenceTies();
      this.updateEvidenceSaveState();
    }

    escapeHtml(str) {
      const safeStr =
        str === null || str === undefined ? "" : typeof str === "string" ? str : String(str);

      return safeStr
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    getStatusClass(statusLabel = "") {
      const normalized = statusLabel.toLowerCase();
      if (normalized.includes("draft")) return "draft";
      if (normalized.includes("in progress") || normalized === "in-progress")
        return "in-progress";
      if (normalized.includes("ready")) return "ready";
      if (normalized.includes("final")) return "final";
      return "";
    }

    getCpfFieldDefinitions() {
      return [
        { key: "recordId", label: "Record", prop: "recordId", element: "evidenceRecordSelect" },
        { key: "pointLabel", label: "Corner label", prop: "pointLabel", element: "evidencePointSelect" },
        { key: "township", label: "Township", prop: "township", element: "evidenceTownship" },
        { key: "range", label: "Range", prop: "range", element: "evidenceRange" },
        { key: "section", label: "Section", prop: "section", element: "evidenceSection" },
        {
          key: "sectionBreakdown",
          label: "Section breakdown",
          prop: "sectionBreakdown",
          element: "evidenceSectionBreakdown",
        },
        { key: "cornerType", label: "Corner type", prop: "cornerType", element: "evidenceCornerType" },
        {
          key: "cornerStatus",
          label: "Corner status",
          prop: "cornerStatus",
          element: "evidenceCornerStatus",
        },
        { key: "monumentType", label: "Monument type", prop: "monumentType", element: "evidenceMonumentType" },
        {
          key: "monumentMaterial",
          label: "Monument material",
          prop: "monumentMaterial",
          element: "evidenceMonumentMaterial",
        },
        { key: "monumentSize", label: "Monument size", prop: "monumentSize", element: "evidenceMonumentSize" },
        { key: "basisOfBearing", label: "Basis of bearing", prop: "basisOfBearing", element: "evidenceBasisOfBearing" },
        { key: "condition", label: "Corner condition", prop: "condition", element: "evidenceCondition" },
        { key: "surveyorName", label: "Surveyor name", prop: "surveyorName", element: "evidenceSurveyorName" },
        {
          key: "surveyorLicense",
          label: "Surveyor license",
          prop: "surveyorLicense",
          element: "evidenceSurveyorLicense",
        },
        { key: "surveyorFirm", label: "Surveyor firm", prop: "surveyorFirm", element: "evidenceSurveyorFirm" },
        { key: "surveyorDates", label: "Survey dates", prop: "surveyorDates", element: "evidenceSurveyDates" },
        { key: "surveyorCounty", label: "County", prop: "surveyCounty", element: "evidenceSurveyCounty" },
        { key: "recordingInfo", label: "Recording info", prop: "recordingInfo", element: "evidenceRecordingInfo" },
      ];
    }

    getCpfCompleteness(entry) {
      if (!entry) return { complete: false, missing: [] };
      const missing = this.getCpfFieldDefinitions()
        .filter((field) => {
          const value = entry[field.prop];
          if (value === 0) return false;
          if (value === null || value === undefined) return true;
          return `${value}`.trim() === "";
        })
        .map((field) => field.key);

      return { complete: missing.length === 0, missing };
    }

    renderCpfValidationCallout(missingKeys = []) {
      const callout = this.elements?.cpfValidationStatus;
      if (!callout) return;

      const chipRow = callout.querySelector(".cpf-chip-row");
      if (chipRow) {
        chipRow.innerHTML = "";
        const defs = this.getCpfFieldDefinitions();
        missingKeys.forEach((key) => {
          const def = defs.find((field) => field.key === key);
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "cpf-chip";
          chip.dataset.cpfField = key;
          chip.textContent = def?.label || key;
          chipRow.appendChild(chip);
        });
      }

      callout.classList.toggle("hidden", missingKeys.length === 0);
    }

    clearCpfValidationState() {
      const defs = this.getCpfFieldDefinitions();
      defs.forEach((field) => {
        const el = this.elements?.[field.element];
        el?.classList.remove("field-missing");
      });

      if (this.elements?.cpfValidationStatus) {
        this.elements.cpfValidationStatus.classList.add("hidden");
        const chipRow = this.elements.cpfValidationStatus.querySelector(
          ".cpf-chip-row"
        );
        if (chipRow) chipRow.innerHTML = "";
      }
    }

    highlightMissingCpfFields(missingKeys = []) {
      const defs = this.getCpfFieldDefinitions();
      defs.forEach((field) => {
        const el = this.elements?.[field.element];
        el?.classList.remove("field-missing");
      });

      missingKeys.forEach((key) => {
        const def = defs.find((field) => field.key === key);
        const el = def ? this.elements?.[def.element] : null;
        el?.classList.add("field-missing");
      });

      const firstMissing = missingKeys[0];
      if (firstMissing) this.focusCpfField(firstMissing);
    }

    focusCpfField(key) {
      const def = this.getCpfFieldDefinitions().find((field) => field.key === key);
      if (!def) return;
      const el = this.elements?.[def.element];
      if (el?.focus) el.focus();
      el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }

    buildStatusChip(statusLabel = "Draft") {
      const chip = document.createElement("span");
      chip.className = `status-chip ${this.getStatusClass(statusLabel)}`;
      chip.setAttribute("aria-label", statusLabel || "Draft");
      chip.textContent = statusLabel || "Draft";
      return chip;
    }

    saveCurrentRecord() {
      if (!this.currentRecordId) return;
      const record =
        this.projects[this.currentProjectId].records[this.currentRecordId];
      record.startPtNum = this.elements.startPtNum.value.trim();
      record.northing = this.elements.northing.value.trim();
      record.easting = this.elements.easting.value.trim();
      record.elevation = this.elements.elevation.value.trim();
      record.bsAzimuth = this.elements.bsAzimuth.value.trim();
      record.basis = this.elements.basis.value.trim();
      record.firstDist = this.elements.firstDist.value.trim();
      record.closurePointNumber =
        this.elements.closurePointNumber?.value?.trim() || "";
      record.expectedToClose = this.elements.expectedToClose?.checked !== false;
      record.status = this.elements.recordStatus?.value || "Draft";

      record.calls = this.serializeCallsFromContainer(this.elements.callsTableBody);

      this.saveProjects();
    }

    deleteCurrentRecord() {
      if (!this.currentRecordId || !confirm("Delete this record?")) return;
      delete this.projects[this.currentProjectId].records[this.currentRecordId];
      this.saveProjects();
      this.currentRecordId = null;
      this.elements.editor.style.display = "none";
      this.appControllers?.traverseSection?.renderRecords();
      this.updateProjectList();
    }
  };

export default EquipmentSetupMixin;
